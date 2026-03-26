import type { TokenMeta } from '@paperape/shared';

const BIRDEYE_API = 'https://public-api.birdeye.so';
const apiKey = process.env.BIRDEYE_API_KEY ?? '';

// ─── Mock Price Data (used when no API key) ─────────────
const mockPrices: Map<string, number> = new Map();

function getMockPrice(address: string): number {
  if (!mockPrices.has(address)) {
    // Generate a random initial price between 0.000001 and 0.01 SOL
    mockPrices.set(address, Math.random() * 0.01);
  }
  const current = mockPrices.get(address)!;
  // Simulate ±5% random walk
  const change = 1 + (Math.random() - 0.48) * 0.1; // slight upward bias
  const newPrice = current * change;
  mockPrices.set(address, newPrice);
  return newPrice;
}

// ─── Live Birdeye API ───────────────────────────────────
export async function getTokenPrice(tokenAddress: string): Promise<{
  priceUsd: number;
  priceSol: number;
  liquidityUsd: number;
}> {
  if (!apiKey) {
    const priceSol = getMockPrice(tokenAddress);
    return {
      priceUsd: priceSol * 170, // mock SOL/USD
      priceSol,
      liquidityUsd: 50_000 + Math.random() * 200_000,
    };
  }

  try {
    const res = await fetch(
      `${BIRDEYE_API}/defi/price?address=${tokenAddress}`,
      {
        headers: {
          'X-API-KEY': apiKey,
          'x-chain': 'solana',
        },
      }
    );
    const json = await res.json();
    const priceUsd = json.data?.value ?? 0;

    // Get SOL price for conversion
    const solRes = await fetch(
      `${BIRDEYE_API}/defi/price?address=So11111111111111111111111111111111111111112`,
      { headers: { 'X-API-KEY': apiKey, 'x-chain': 'solana' } }
    );
    const solJson = await solRes.json();
    const solPriceUsd = solJson.data?.value ?? 170;

    return {
      priceUsd,
      priceSol: priceUsd / solPriceUsd,
      liquidityUsd: json.data?.liquidity ?? 50_000,
    };
  } catch (err) {
    console.error('Birdeye API error:', err);
    const priceSol = getMockPrice(tokenAddress);
    return { priceUsd: priceSol * 170, priceSol, liquidityUsd: 50_000 };
  }
}

export async function getTokenOverview(tokenAddress: string): Promise<Partial<TokenMeta>> {
  if (!apiKey) {
    return {
      address: tokenAddress,
      name: 'Mock Token',
      symbol: 'MOCK',
      decimals: 9,
      image: null,
      liquidity_usd: 100_000,
      market_cap_usd: 500_000,
      price_usd: getMockPrice(tokenAddress) * 170,
    };
  }

  try {
    const res = await fetch(
      `${BIRDEYE_API}/defi/token_overview?address=${tokenAddress}`,
      {
        headers: {
          'X-API-KEY': apiKey,
          'x-chain': 'solana',
        },
      }
    );
    const json = await res.json();
    const d = json.data;
    return {
      address: tokenAddress,
      name: d?.name ?? 'Unknown',
      symbol: d?.symbol ?? '???',
      decimals: d?.decimals ?? 9,
      image: d?.logoURI ?? null,
      liquidity_usd: d?.liquidity ?? 0,
      market_cap_usd: d?.mc ?? 0,
      price_usd: d?.price ?? 0,
    };
  } catch (err) {
    console.error('Birdeye overview error:', err);
    return { address: tokenAddress, name: 'Unknown', symbol: '???' };
  }
}

// ─── Price Streaming ────────────────────────────────────
type PriceCallback = (price: { priceUsd: number; priceSol: number; timestamp: number }) => void;
const priceSubscriptions: Map<string, Set<PriceCallback>> = new Map();
let pollingInterval: ReturnType<typeof setInterval> | null = null;

export function subscribeToPriceUpdates(tokenAddress: string, callback: PriceCallback): () => void {
  if (!priceSubscriptions.has(tokenAddress)) {
    priceSubscriptions.set(tokenAddress, new Set());
  }
  priceSubscriptions.get(tokenAddress)!.add(callback);

  // Start polling if not already
  if (!pollingInterval) {
    pollingInterval = setInterval(pollPrices, 2000);
  }

  // Return unsubscribe function
  return () => {
    const subs = priceSubscriptions.get(tokenAddress);
    if (subs) {
      subs.delete(callback);
      if (subs.size === 0) {
        priceSubscriptions.delete(tokenAddress);
      }
    }
    if (priceSubscriptions.size === 0 && pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  };
}

async function pollPrices() {
  for (const [address, callbacks] of priceSubscriptions) {
    try {
      const { priceUsd, priceSol } = await getTokenPrice(address);
      const update = { priceUsd, priceSol, timestamp: Date.now() };
      for (const cb of callbacks) {
        cb(update);
      }
    } catch (err) {
      console.error(`Price poll error for ${address}:`, err);
    }
  }
}
