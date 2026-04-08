import type { TokenMeta } from '@paperape/shared';

const DEXSCREENER_API = 'https://api.dexscreener.com/latest/dex';

// ─── Price cache with 10s TTL ───────────────────────────
const priceCache = new Map<string, { price: number; priceSol: number; liq: number; ts: number }>();
const PRICE_TTL = 10_000;

// ─── Get Token Price via DexScreener ────────────────────
export async function getTokenPrice(tokenAddress: string): Promise<{
  priceUsd: number;
  priceSol: number;
  liquidityUsd: number;
}> {
  // Check cache
  const cached = priceCache.get(tokenAddress);
  if (cached && Date.now() - cached.ts < PRICE_TTL) {
    return { priceUsd: cached.price, priceSol: cached.priceSol, liquidityUsd: cached.liq };
  }

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

      priceCache.set(tokenAddress, { price: priceUsd, priceSol, liq: liquidityUsd, ts: Date.now() });

      return { priceUsd, priceSol, liquidityUsd };
    }
  } catch (err) {
    console.warn(`[price] DexScreener lookup failed for ${tokenAddress}:`, err);
  }

  // Fallback: generate mock price
  const mockSol = 0.000001 + Math.random() * 0.01;
  return { priceUsd: mockSol * 177, priceSol: mockSol, liquidityUsd: 50000 + Math.random() * 200000 };
}

// ─── Get Token Overview ─────────────────────────────────
export async function getTokenOverview(tokenAddress: string): Promise<Partial<TokenMeta>> {
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
      return {
        symbol: p.baseToken?.symbol ?? 'UNK',
        name: p.baseToken?.name ?? 'Unknown',
        price_usd: parseFloat(p.priceUsd ?? '0'),
        market_cap_usd: p.marketCap ?? p.fdv ?? 0,
        liquidity_usd: p.liquidity?.usd ?? 0,
        price_change_24h: p.priceChange?.h24 ?? 0,
        volume_24h: p.volume?.h24 ?? 0,
      };
    }
  } catch (err) {
    console.warn(`[overview] DexScreener lookup failed for ${tokenAddress}:`, err);
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
