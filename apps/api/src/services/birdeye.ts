/**
 * Premium Price Engine — Multi-Source Token Data
 * 
 * Priority chain:
 *   1. Helius DAS API (fastest, paid — $49/mo)
 *   2. Jupiter Price API v2 (free, fast, reliable)
 *   3. Birdeye Pro (paid — token analytics + metadata)
 *   4. DexScreener (free fallback)
 *
 * All responses are cached in Redis for sub-millisecond repeat lookups.
 */
import type { TokenMeta } from '@paperape/shared';
import { cacheGet, cacheSet } from '../lib/cache.js';

const DEXSCREENER_API = 'https://api.dexscreener.com/latest/dex';
const JUPITER_PRICE_API = 'https://api.jup.ag/price/v2';
const HELIUS_API = process.env.HELIUS_API_KEY ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}` : '';
const BIRDEYE_API = 'https://public-api.birdeye.so';
const BIRDEYE_KEY = process.env.BIRDEYE_API_KEY ?? '';

// SOL mint for price lookups
const SOL_MINT = 'So11111111111111111111111111111111111111112';

// ─── Get Token Price (Multi-Source) ─────────────────────
export async function getTokenPrice(tokenAddress: string): Promise<{
  priceUsd: number;
  priceSol: number;
  liquidityUsd: number;
}> {
  // 1. Check Redis cache (5s TTL for price data — fast enough for paper trading)
  const cacheKey = `price:${tokenAddress}`;
  const cached = await cacheGet<{ priceUsd: number; priceSol: number; liquidityUsd: number }>(cacheKey);
  if (cached) return cached;

  // 2. Try Jupiter Price API first (fastest free source)
  try {
    const jupRes = await fetch(`${JUPITER_PRICE_API}?ids=${tokenAddress},${SOL_MINT}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (jupRes.ok) {
      const jupData = await jupRes.json();
      const tokenPrice = jupData.data?.[tokenAddress]?.price;
      const solPrice = jupData.data?.[SOL_MINT]?.price;

      if (tokenPrice && solPrice) {
        const priceUsd = parseFloat(tokenPrice);
        const priceSol = priceUsd / parseFloat(solPrice);
        // Jupiter doesn't provide liquidity. Fetch it before returning so the
        // trading engine does not treat a fresh Jupiter hit as max-slippage.
        const liquidityUsd = await fetchDexScreenerLiquidity(tokenAddress);
        const result = { priceUsd, priceSol, liquidityUsd };

        await cacheSet(cacheKey, result, 5);
        return result;
      }
    }
  } catch (err) {
    // Jupiter failed, try next source
  }

  // 3. Try Birdeye Pro (if API key is set)
  if (BIRDEYE_KEY) {
    try {
      const beRes = await fetch(`${BIRDEYE_API}/defi/price?address=${tokenAddress}`, {
        headers: {
          'Accept': 'application/json',
          'x-chain': 'solana',
          'X-API-KEY': BIRDEYE_KEY,
        },
        signal: AbortSignal.timeout(3000),
      });
      if (beRes.ok) {
        const beData = await beRes.json();
        if (beData.data?.value) {
          const priceUsd = beData.data.value;
          const solPrice = await getSolPrice();
          const priceSol = solPrice > 0 ? priceUsd / solPrice : 0;
          const result = { priceUsd, priceSol, liquidityUsd: beData.data.liquidity ?? 0 };
          await cacheSet(cacheKey, result, 5);
          return result;
        }
      }
    } catch {}
  }

  // 4. Fallback: DexScreener
  try {
    const res = await fetch(`${DEXSCREENER_API}/tokens/${tokenAddress}`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) throw new Error(`DexScreener returned ${res.status}`);

    const data = await res.json();
    const pairs = (data.pairs ?? [])
      .filter((p: any) => p.chainId === 'solana')
      .sort((a: any, b: any) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0));

    if (pairs.length > 0) {
      const p = pairs[0];
      const priceUsd = parseFloat(p.priceUsd ?? '0');
      const priceSol = parseFloat(p.priceNative ?? '0');
      const liquidityUsd = p.liquidity?.usd ?? 0;
      const result = { priceUsd, priceSol, liquidityUsd };
      await cacheSet(cacheKey, result, 5);
      return result;
    }
  } catch (err) {
    console.warn(`[price] All sources failed for ${tokenAddress}:`, err);
  }

  // No data available — return zeros (never fake prices)
  return { priceUsd: 0, priceSol: 0, liquidityUsd: 0 };
}

// ─── Get Token Overview (metadata) ──────────────────────
export async function getTokenOverview(tokenAddress: string): Promise<Partial<TokenMeta>> {
  const cacheKey = `meta:${tokenAddress}`;
  const cached = await cacheGet<Partial<TokenMeta>>(cacheKey);
  if (cached) return cached;

  // 1. Try Helius DAS API (fastest + most complete metadata)
  if (HELIUS_API) {
    try {
      const res = await fetch(HELIUS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'get-asset',
          method: 'getAsset',
          params: { id: tokenAddress },
        }),
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const data = await res.json();
        const asset = data.result;
        if (asset) {
          const meta: Partial<TokenMeta> = {
            symbol: asset.content?.metadata?.symbol ?? asset.token_info?.symbol ?? '???',
            name: asset.content?.metadata?.name ?? 'Unknown',
            image: asset.content?.links?.image ?? asset.content?.files?.[0]?.uri ?? null,
          };
          await cacheSet(cacheKey, meta, 300); // 5 min cache for metadata
          return meta;
        }
      }
    } catch {}
  }

  // 2. Try Birdeye token overview
  if (BIRDEYE_KEY) {
    try {
      const res = await fetch(`${BIRDEYE_API}/defi/token_overview?address=${tokenAddress}`, {
        headers: {
          'Accept': 'application/json',
          'x-chain': 'solana',
          'X-API-KEY': BIRDEYE_KEY,
        },
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.data) {
          const d = data.data;
          const meta: Partial<TokenMeta> = {
            symbol: d.symbol ?? '???',
            name: d.name ?? 'Unknown',
            price_usd: d.price ?? 0,
            market_cap_usd: d.mc ?? d.realMc ?? 0,
            liquidity_usd: d.liquidity ?? 0,
            price_change_24h: d.priceChange24hPercent ?? 0,
            volume_24h: d.v24hUSD ?? 0,
            image: d.logoURI ?? null,
          };
          await cacheSet(cacheKey, meta, 300);
          return meta;
        }
      }
    } catch {}
  }

  // 3. Fallback: DexScreener
  try {
    const res = await fetch(`${DEXSCREENER_API}/tokens/${tokenAddress}`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) throw new Error(`DexScreener returned ${res.status}`);

    const data = await res.json();
    const pairs = (data.pairs ?? [])
      .filter((p: any) => p.chainId === 'solana')
      .sort((a: any, b: any) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0));

    if (pairs.length > 0) {
      const p = pairs[0];
      const meta: Partial<TokenMeta> = {
        symbol: p.baseToken?.symbol ?? '???',
        name: p.baseToken?.name ?? 'Unknown',
        price_usd: parseFloat(p.priceUsd ?? '0'),
        market_cap_usd: p.marketCap ?? p.fdv ?? 0,
        liquidity_usd: p.liquidity?.usd ?? 0,
        price_change_24h: p.priceChange?.h24 ?? 0,
        volume_24h: p.volume?.h24 ?? 0,
        image: p.info?.imageUrl ?? null,
      };
      await cacheSet(cacheKey, meta, 300);
      return meta;
    }
  } catch (err) {
    console.warn(`[overview] All sources failed for ${tokenAddress}:`, err);
  }

  return {
    symbol: tokenAddress.slice(0, 4).toUpperCase(),
    name: 'Unknown Token',
    price_usd: 0,
    market_cap_usd: 0,
    liquidity_usd: 0,
    price_change_24h: 0,
    volume_24h: 0,
  };
}

// ─── SOL Price (cached) ─────────────────────────────────
let solPriceLocal = 0;
let solPriceTime = 0;

export async function getSolPrice(): Promise<number> {
  if (Date.now() - solPriceTime < 15_000 && solPriceLocal > 0) return solPriceLocal;

  // Try Jupiter first
  try {
    const res = await fetch(`${JUPITER_PRICE_API}?ids=${SOL_MINT}`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = await res.json();
      const price = parseFloat(data.data?.[SOL_MINT]?.price ?? '0');
      if (price > 0) {
        solPriceLocal = price;
        solPriceTime = Date.now();
        return price;
      }
    }
  } catch {}

  // Fallback DexScreener
  try {
    const res = await fetch(`${DEXSCREENER_API}/tokens/${SOL_MINT}`, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      const pair = (data.pairs ?? []).find((p: any) =>
        p.chainId === 'solana' && (p.quoteToken?.symbol === 'USDC' || p.quoteToken?.symbol === 'USDT')
      );
      if (pair) {
        const price = parseFloat(pair.priceUsd ?? '0');
        if (price > 0) { solPriceLocal = price; solPriceTime = Date.now(); return price; }
      }
    }
  } catch {}

  return solPriceLocal || 170; // Last known fallback
}

// ─── Helper: Fetch liquidity from DexScreener ───────────
async function fetchDexScreenerLiquidity(tokenAddress: string): Promise<number> {
  try {
    const res = await fetch(`${DEXSCREENER_API}/tokens/${tokenAddress}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      const pair = (data.pairs ?? [])
        .filter((p: any) => p.chainId === 'solana')
        .sort((a: any, b: any) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0];
      return pair?.liquidity?.usd ?? 0;
    }
  } catch {}
  return 0;
}
