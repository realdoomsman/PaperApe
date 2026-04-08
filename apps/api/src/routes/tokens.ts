import { Router } from 'express';

export const tokensRouter = Router();

const DEXSCREENER_API = 'https://api.dexscreener.com';
const BIRDEYE_API = 'https://public-api.birdeye.so';
const BIRDEYE_KEY = process.env.BIRDEYE_API_KEY ?? '';

interface TokenData {
  address: string;
  symbol: string;
  name: string;
  priceUsd: number;
  priceSol: number;
  priceChange24h: number;
  volume24h: number;
  liquidity: number;
  liquidityUsd: number;
  marketCap: number;
  market_cap_usd: number;
  pairAddress: string;
  dex: string;
  image: string | null;
  createdAt: string | null;
  ageMinutes?: number;
  txns?: { buys: number; sells: number };
  holders?: number;
  socials?: { twitter?: string; telegram?: string; website?: string; discord?: string };
}

// ─── Caches ─────────────────────────────────────────────
let trendingCache: TokenData[] = [];
let trendingCacheTime = 0;
const TRENDING_CACHE_TTL = 60_000;

let trenchesCache: { newPairs: TokenData[]; finalStretch: TokenData[]; migrated: TokenData[] } = { newPairs: [], finalStretch: [], migrated: [] };
let trenchesCacheTime = 0;
const TRENCHES_CACHE_TTL = 30_000;

let solPriceCache = { price: 0, time: 0 };
const SOL_PRICE_TTL = 30_000;

// Per-token detail cache to reduce DexScreener API calls
const tokenDetailCache = new Map<string, { data: any; time: number }>();
const TOKEN_DETAIL_TTL = 15_000; // 15s cache per token
const pendingTokenFetches = new Map<string, Promise<any>>(); // Dedup concurrent requests

// ─── Helpers ────────────────────────────────────────────

function parsePair(p: any): TokenData | null {
  if (!p?.baseToken?.address) return null;
  const priceUsd = parseFloat(p.priceUsd ?? '0');
  const priceNative = parseFloat(p.priceNative ?? '0');
  const createdAtMs = p.pairCreatedAt ? Number(p.pairCreatedAt) : null;
  return {
    address: p.baseToken.address,
    symbol: p.baseToken.symbol ?? '???',
    name: p.baseToken.name ?? 'Unknown',
    priceUsd,
    priceSol: priceNative,
    priceChange24h: p.priceChange?.h24 ?? 0,
    volume24h: p.volume?.h24 ?? 0,
    liquidity: p.liquidity?.usd ?? 0,
    liquidityUsd: p.liquidity?.usd ?? 0,
    marketCap: p.marketCap ?? p.fdv ?? 0,
    market_cap_usd: p.marketCap ?? p.fdv ?? 0,
    pairAddress: p.pairAddress ?? '',
    dex: p.dexId ?? 'unknown',
    image: p.info?.imageUrl ?? null,
    createdAt: createdAtMs ? new Date(createdAtMs).toISOString() : null,
    ageMinutes: createdAtMs ? Math.floor((Date.now() - createdAtMs) / 60000) : undefined,
    txns: p.txns?.h24 ? { buys: p.txns.h24.buys ?? 0, sells: p.txns.h24.sells ?? 0 } : undefined,
    socials: extractSocials(p),
  };
}

function extractSocials(p: any): TokenData['socials'] {
  const socials: TokenData['socials'] = {};
  // DexScreener puts socials in info.socials array and info.websites array
  if (p.info?.socials) {
    for (const s of p.info.socials) {
      if (s.type === 'twitter') socials.twitter = s.url;
      else if (s.type === 'telegram') socials.telegram = s.url;
      else if (s.type === 'discord') socials.discord = s.url;
    }
  }
  if (p.info?.websites?.length > 0) {
    socials.website = p.info.websites[0].url;
  }
  return Object.keys(socials).length > 0 ? socials : undefined;
}

// ─── SOL Price (real) ────────────────────────────────────
async function fetchSolPrice(): Promise<number> {
  if (Date.now() - solPriceCache.time < SOL_PRICE_TTL && solPriceCache.price > 0) {
    return solPriceCache.price;
  }

  try {
    const res = await fetch(`${DEXSCREENER_API}/latest/dex/tokens/So11111111111111111111111111111111111111112`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      const usdcPair = (data.pairs ?? []).find((p: any) =>
        p.chainId === 'solana' &&
        (p.quoteToken?.symbol === 'USDC' || p.quoteToken?.symbol === 'USDT') &&
        (p.liquidity?.usd ?? 0) > 100000
      );
      if (usdcPair) {
        const price = parseFloat(usdcPair.priceUsd ?? '0');
        if (price > 0) {
          solPriceCache = { price, time: Date.now() };
          console.log(`[tokens] SOL price: $${price.toFixed(2)}`);
          return price;
        }
      }
    }
  } catch (err: any) {
    console.warn('[tokens] SOL price fetch failed:', err.message);
  }

  // Fallback: try CoinGecko
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd', {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      const price = data?.solana?.usd ?? 0;
      if (price > 0) {
        solPriceCache = { price, time: Date.now() };
        return price;
      }
    }
  } catch {}

  return solPriceCache.price || 145;
}

// ─── DexScreener Trending (pump.fun + bonk focused) ─────
async function fetchDexScreenerTrending(): Promise<TokenData[]> {
  if (Date.now() - trendingCacheTime < TRENDING_CACHE_TTL && trendingCache.length > 0) {
    return trendingCache;
  }

  try {
    const boostRes = await fetch(`${DEXSCREENER_API}/token-boosts/top/v1`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000),
    });

    if (boostRes.ok) {
      const boostData = await boostRes.json();
      const solBoosts = (boostData ?? [])
        .filter((b: any) => b.chainId === 'solana')
        .slice(0, 30);

      if (solBoosts.length > 0) {
        const addresses = solBoosts.map((b: any) => b.tokenAddress).filter(Boolean);
        const uniqueAddrs = [...new Set(addresses)].slice(0, 20);

        const allTokens: TokenData[] = [];
        for (let i = 0; i < uniqueAddrs.length; i += 5) {
          const batch = uniqueAddrs.slice(i, i + 5);
          try {
            const batchRes = await fetch(`${DEXSCREENER_API}/latest/dex/tokens/${batch.join(',')}`, {
              headers: { 'Accept': 'application/json' },
              signal: AbortSignal.timeout(8000),
            });
            if (batchRes.ok) {
              const batchData = await batchRes.json();
              const pairs = (batchData.pairs ?? [])
                .filter((p: any) => p.chainId === 'solana' && (p.liquidity?.usd ?? 0) > 500)
                .sort((a: any, b: any) => (b.volume?.h24 ?? 0) - (a.volume?.h24 ?? 0));

              const seen = new Set(allTokens.map(t => t.address));
              for (const p of pairs) {
                const addr = p.baseToken?.address;
                if (!addr || seen.has(addr)) continue;
                seen.add(addr);
                const parsed = parsePair(p);
                if (parsed) allTokens.push(parsed);
              }
            }
          } catch {}
        }

        if (allTokens.length > 0) {
          allTokens.sort((a, b) => b.volume24h - a.volume24h);
          trendingCache = allTokens;
          trendingCacheTime = Date.now();
          console.log(`[tokens] Fetched ${allTokens.length} trending tokens from DexScreener boosts`);
          return trendingCache;
        }
      }
    }

    // Fallback: search
    const searchRes = await fetch(`${DEXSCREENER_API}/latest/dex/search?q=pump`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000),
    });

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      const pairs = (searchData.pairs ?? [])
        .filter((p: any) => p.chainId === 'solana' && (p.liquidity?.usd ?? 0) > 500)
        .sort((a: any, b: any) => (b.volume?.h24 ?? 0) - (a.volume?.h24 ?? 0))
        .slice(0, 30);

      const seen = new Set<string>();
      const tokens: TokenData[] = [];
      for (const p of pairs) {
        const addr = p.baseToken?.address;
        if (!addr || seen.has(addr)) continue;
        seen.add(addr);
        const parsed = parsePair(p);
        if (parsed) tokens.push(parsed);
      }

      if (tokens.length > 0) {
        trendingCache = tokens;
        trendingCacheTime = Date.now();
      }
    }

    return trendingCache;
  } catch (err) {
    console.error('[tokens] DexScreener trending error:', err);
    return trendingCache;
  }
}

// ─── Trenches: New Pairs / Final Stretch / Migrated ─────
async function fetchTrenches(): Promise<{ newPairs: TokenData[]; finalStretch: TokenData[]; migrated: TokenData[] }> {
  if (Date.now() - trenchesCacheTime < TRENCHES_CACHE_TTL && (trenchesCache.newPairs.length + trenchesCache.finalStretch.length + trenchesCache.migrated.length) > 0) {
    return trenchesCache;
  }

  try {
    // Fetch latest token profiles from DexScreener
    const res = await fetch(`${DEXSCREENER_API}/token-profiles/latest/v1`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) throw new Error(`DexScreener returned ${res.status}`);

    const data = await res.json();
    const solTokens = (data ?? [])
      .filter((t: any) => t.chainId === 'solana')
      .slice(0, 40);

    if (solTokens.length === 0) return trenchesCache;

    const addresses = solTokens.map((t: any) => t.tokenAddress).filter(Boolean);
    const uniqueAddrs = [...new Set(addresses)].slice(0, 30) as string[];

    const allPairs: TokenData[] = [];
    for (let i = 0; i < uniqueAddrs.length; i += 5) {
      const batch = uniqueAddrs.slice(i, i + 5);
      try {
        const batchRes = await fetch(`${DEXSCREENER_API}/latest/dex/tokens/${batch.join(',')}`, {
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(8000),
        });
        if (batchRes.ok) {
          const batchData = await batchRes.json();
          const pairs = (batchData.pairs ?? [])
            .filter((p: any) => p.chainId === 'solana')
            .sort((a: any, b: any) => (b.volume?.h24 ?? 0) - (a.volume?.h24 ?? 0));

          const seen = new Set(allPairs.map(t => t.address));
          for (const p of pairs) {
            const addr = p.baseToken?.address;
            if (!addr || seen.has(addr)) continue;
            seen.add(addr);
            const parsed = parsePair(p);
            if (parsed) allPairs.push(parsed);
          }
        }
      } catch {}
    }

    // Categorize:
    // New Pairs: on pump.fun (pre-bonding curve), or just created (<30 min), mcap < $30K
    // Final Stretch: pump.fun tokens approaching graduation, mcap $30K-$80K
    // Migrated: recently on raydium, created < 2 hours ago, mcap > $30K
    const newPairs: TokenData[] = [];
    const finalStretch: TokenData[] = [];
    const migrated: TokenData[] = [];

    for (const t of allPairs) {
      const age = t.ageMinutes ?? 99999;
      const mcap = t.marketCap;
      const isPump = t.dex === 'pumpfun' || t.address.endsWith('pump');
      const isRaydiumNew = (t.dex === 'raydium' || t.dex === 'raydium-clmm' || t.dex === 'raydium-cp') && age < 180;

      if (isPump && mcap < 30000) {
        newPairs.push(t);
      } else if (isPump && mcap >= 30000 && mcap < 80000) {
        finalStretch.push(t);
      } else if ((isRaydiumNew && mcap > 20000) || (!isPump && age < 120 && mcap > 10000)) {
        migrated.push(t);
      } else if (age < 60 && mcap < 30000) {
        newPairs.push(t);
      } else if (age < 120) {
        migrated.push(t);
      }
    }

    // Sort each category
    newPairs.sort((a, b) => (a.ageMinutes ?? 9999) - (b.ageMinutes ?? 9999));
    finalStretch.sort((a, b) => b.marketCap - a.marketCap); // highest mcap first (closest to graduating)
    migrated.sort((a, b) => (a.ageMinutes ?? 9999) - (b.ageMinutes ?? 9999));

    trenchesCache = { newPairs, finalStretch, migrated };
    trenchesCacheTime = Date.now();
    console.log(`[tokens] Trenches: ${newPairs.length} new, ${finalStretch.length} final stretch, ${migrated.length} migrated`);

    return trenchesCache;
  } catch (err) {
    console.error('[tokens] Trenches error:', err);
    return trenchesCache;
  }
}

// ─── GET /tokens/sol-price ──────────────────────────────
tokensRouter.get('/sol-price', async (_req, res) => {
  try {
    const price = await fetchSolPrice();
    res.json({ success: true, data: { price } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /tokens/trending ───────────────────────────────
tokensRouter.get('/trending', async (_req, res) => {
  try {
    const tokens = await fetchDexScreenerTrending();
    res.json({ success: true, data: { tokens } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /tokens/trenches ───────────────────────────────
tokensRouter.get('/trenches', async (req, res) => {
  try {
    const data = await fetchTrenches();

    // Apply filters from query params
    const minMcap = parseFloat(req.query.minMcap as string) || 0;
    const maxMcap = parseFloat(req.query.maxMcap as string) || Infinity;
    const minLiq = parseFloat(req.query.minLiq as string) || 0;
    const maxLiq = parseFloat(req.query.maxLiq as string) || Infinity;
    const minVol = parseFloat(req.query.minVol as string) || 0;
    const maxVol = parseFloat(req.query.maxVol as string) || Infinity;
    const protocol = (req.query.protocol as string) || '';
    const keyword = (req.query.keyword as string) || '';

    function filterTokens(tokens: TokenData[]): TokenData[] {
      return tokens.filter(t => {
        if (t.marketCap < minMcap || t.marketCap > maxMcap) return false;
        if (t.liquidity < minLiq || t.liquidity > maxLiq) return false;
        if (t.volume24h < minVol || t.volume24h > maxVol) return false;
        if (protocol === 'pump' && !t.address.endsWith('pump') && t.dex !== 'pumpfun') return false;
        if (protocol === 'raydium' && !t.dex.startsWith('raydium')) return false;
        if (keyword && !t.symbol.toLowerCase().includes(keyword.toLowerCase()) && !t.name.toLowerCase().includes(keyword.toLowerCase())) return false;
        return true;
      });
    }

    res.json({
      success: true,
      data: {
        newPairs: filterTokens(data.newPairs),
        finalStretch: filterTokens(data.finalStretch),
        migrated: filterTokens(data.migrated),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /tokens/new-pairs (backwards compat) ───────────
tokensRouter.get('/new-pairs', async (_req, res) => {
  try {
    const data = await fetchTrenches();
    const allTokens = [...data.newPairs, ...data.finalStretch, ...data.migrated];
    res.json({ success: true, data: { tokens: allTokens } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /tokens/search?q=bonk ──────────────────────────
tokensRouter.get('/search', async (req, res) => {
  try {
    const query = (req.query.q as string ?? '').trim();
    if (!query) return res.json({ success: true, data: { tokens: [] } });

    const searchRes = await fetch(`${DEXSCREENER_API}/latest/dex/search?q=${encodeURIComponent(query)}`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000),
    });
    const data = await searchRes.json();
    const pairs = (data.pairs ?? []).filter((p: any) => p.chainId === 'solana').slice(0, 20);

    const seen = new Set<string>();
    const tokens: TokenData[] = [];
    for (const p of pairs) {
      const addr = p.baseToken?.address;
      if (!addr || seen.has(addr)) continue;
      seen.add(addr);
      const parsed = parsePair(p);
      if (parsed) tokens.push(parsed);
    }

    res.json({ success: true, data: { tokens } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /tokens/prices?addresses=addr1,addr2,addr3 ─────
tokensRouter.get('/prices', async (req, res) => {
  try {
    const addressesParam = (req.query.addresses as string ?? '').trim();
    if (!addressesParam) return res.status(400).json({ success: false, error: 'Missing addresses' });

    const addresses = addressesParam.split(',').map(a => a.trim()).filter(Boolean).slice(0, 50);
    const prices: Record<string, { priceUsd: number; priceSol: number }> = {};

    for (const addr of addresses) {
      try {
        const r = await fetch(`${DEXSCREENER_API}/latest/dex/tokens/${addr}`, { signal: AbortSignal.timeout(5000) });
        const d = await r.json();
        const pair = (d.pairs ?? []).filter((p: any) => p.chainId === 'solana').sort((a: any, b: any) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0];
        if (pair) {
          prices[addr] = { priceUsd: parseFloat(pair.priceUsd ?? '0'), priceSol: parseFloat(pair.priceNative ?? '0') };
        }
      } catch {}
    }

    res.json({ success: true, data: { prices } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /tokens/rugcheck/:address ──────────────────────
tokensRouter.get('/rugcheck/:address', async (req, res) => {
  try {
    const { getRugCheckReport } = await import('../services/rugcheck.js');
    const report = await getRugCheckReport(req.params.address);
    res.json({ success: true, data: report });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /tokens/:address ───────────────────────────────
tokensRouter.get('/:address', async (req, res) => {
  try {
    const address = req.params.address;

    // Check cache first
    const cached = tokenDetailCache.get(address);
    if (cached && (Date.now() - cached.time < TOKEN_DETAIL_TTL)) {
      return res.json(cached.data);
    }

    // Dedup concurrent requests for same token
    let fetchPromise = pendingTokenFetches.get(address);
    if (!fetchPromise) {
      fetchPromise = fetch(`${DEXSCREENER_API}/latest/dex/tokens/${address}`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(6000),
      }).then(r => r.json()).finally(() => pendingTokenFetches.delete(address));
      pendingTokenFetches.set(address, fetchPromise);
    }
    const data = await fetchPromise;

    const pairs = (data.pairs ?? [])
      .filter((p: any) => p.chainId === 'solana')
      .sort((a: any, b: any) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0));

    if (pairs.length === 0) {
      // ─── Fallback 1: Try DexScreener Search API ─────────
      try {
        const searchRes = await fetch(`${DEXSCREENER_API}/latest/dex/search?q=${address}`, {
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(6000),
        });
        const searchData = await searchRes.json();
        const searchPairs = (searchData.pairs ?? [])
          .filter((p: any) => p.chainId === 'solana')
          .sort((a: any, b: any) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0));

        if (searchPairs.length > 0) {
          const token = parsePair(searchPairs[0]);
          const recentTxns = searchPairs[0]?.txns ?? {};
          return res.json({
            success: true,
            data: {
              token,
              metadata: null,
              txns: {
                m5: recentTxns.m5 ?? { buys: 0, sells: 0 },
                h1: recentTxns.h1 ?? { buys: 0, sells: 0 },
                h24: recentTxns.h24 ?? { buys: 0, sells: 0 },
              },
            },
          });
        }
      } catch {}

      // ─── Fallback 2: Try Jupiter Price API ────────────────
      try {
        const jupRes = await fetch(`https://api.jup.ag/price/v2?ids=${address}`, {
          signal: AbortSignal.timeout(5000),
        });
        const jupData = await jupRes.json();
        const jupPrice = jupData?.data?.[address];

        if (jupPrice && jupPrice.price) {
          // Get SOL price for conversion
          const solRes = await fetch(`https://api.jup.ag/price/v2?ids=So11111111111111111111111111111111111111112`, {
            signal: AbortSignal.timeout(3000),
          });
          const solData = await solRes.json();
          const solPrice = parseFloat(solData?.data?.['So11111111111111111111111111111111111111112']?.price ?? '0');
          const priceUsd = parseFloat(jupPrice.price);
          const priceSol = solPrice > 0 ? priceUsd / solPrice : 0;

          return res.json({
            success: true,
            data: {
              token: {
                address,
                symbol: jupPrice.mintSymbol ?? address.slice(0, 6),
                name: jupPrice.mintSymbol ?? 'Unknown Token',
                priceUsd,
                priceSol,
                priceChange24h: 0,
                volume24h: 0,
                liquidity: 0,
                marketCap: 0,
                image: null,
                pairAddress: null,
              },
              metadata: null,
              txns: { m5: { buys: 0, sells: 0 }, h1: { buys: 0, sells: 0 }, h24: { buys: 0, sells: 0 } },
            },
          });
        }
      } catch {}

      // ─── Fallback: Return minimal token with zero price ──
      return res.json({
        success: true,
        data: {
          token: {
            address,
            symbol: address.slice(0, 6) + '...',
            name: 'Untracked Token',
            priceUsd: 0,
            priceSol: 0,
            priceChange24h: 0,
            volume24h: 0,
            liquidity: 0,
            marketCap: 0,
            image: null,
            pairAddress: null,
          },
          metadata: null,
          txns: { m5: { buys: 0, sells: 0 }, h1: { buys: 0, sells: 0 }, h24: { buys: 0, sells: 0 } },
        },
      });
    }

    const token = parsePair(pairs[0]);

    // Also return recent trades (buys/sells count)
    const recentTxns = pairs[0]?.txns ?? {};

    let metadata: any = null;
    if (BIRDEYE_KEY) {
      try {
        const metaRes = await fetch(`${BIRDEYE_API}/defi/v3/token/meta-data/single?address=${address}`, {
          headers: { 'X-API-KEY': BIRDEYE_KEY, 'accept': 'application/json', 'x-chain': 'solana' },
          signal: AbortSignal.timeout(5000),
        });
        if (metaRes.ok) {
          const metaJson = await metaRes.json();
          if (metaJson.success && metaJson.data) {
            metadata = {
              description: metaJson.data.description ?? null,
              website: metaJson.data.website ?? null,
              twitter: metaJson.data.twitter ?? null,
              telegram: metaJson.data.telegram ?? null,
              holder_count: metaJson.data.holder_count ?? null,
            };
          }
        }
      } catch {}
    }

    const responseData = {
      success: true,
      data: {
        token,
        metadata,
        txns: {
          m5: recentTxns.m5 ?? { buys: 0, sells: 0 },
          h1: recentTxns.h1 ?? { buys: 0, sells: 0 },
          h24: recentTxns.h24 ?? { buys: 0, sells: 0 },
        },
      },
    };

    // Cache for future requests
    tokenDetailCache.set(address, { data: responseData, time: Date.now() });

    res.json(responseData);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
