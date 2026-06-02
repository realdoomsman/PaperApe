import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./lib/cache.js', () => ({
  cacheGet: vi.fn(),
  cacheSet: vi.fn(),
}));

const { getTokenPrice } = await import('./services/birdeye.js');
const { cacheGet, cacheSet } = await import('./lib/cache.js');

const TOKEN_ADDRESS = 'Token1111111111111111111111111111111111';
const SOL_MINT = 'So11111111111111111111111111111111111111112';

describe('price engine', () => {
  beforeEach(() => {
    vi.mocked(cacheGet).mockResolvedValue(null);
    vi.mocked(cacheSet).mockResolvedValue(undefined);
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('api.jup.ag')) {
        return {
          ok: true,
          json: async () => ({
            data: {
              [TOKEN_ADDRESS]: { price: '1' },
              [SOL_MINT]: { price: '100' },
            },
          }),
        };
      }

      if (url.includes('api.dexscreener.com')) {
        return {
          ok: true,
          json: async () => ({
            pairs: [
              { chainId: 'solana', liquidity: { usd: 123_456 } },
            ],
          }),
        };
      }

      throw new Error(`Unexpected URL: ${url}`);
    }) as any);
  });

  it('hydrates Jupiter prices with DexScreener liquidity before caching', async () => {
    const result = await getTokenPrice(TOKEN_ADDRESS);

    expect(result).toEqual({
      priceUsd: 1,
      priceSol: 0.01,
      liquidityUsd: 123_456,
    });
    expect(cacheSet).toHaveBeenCalledWith(`price:${TOKEN_ADDRESS}`, result, 5);
  });
});
