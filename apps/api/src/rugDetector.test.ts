import { describe, expect, it, vi } from 'vitest';

vi.mock('./lib/firebase.js', () => ({
  isMockMode: true,
  db: {},
}));

vi.mock('./services/birdeye.js', () => ({
  getTokenPrice: vi.fn(),
}));

vi.mock('./services/tradeEngine.js', () => ({
  updatePositionPrice: vi.fn(),
  mockPositions: new Map(),
}));

const { shouldFlagRuggedPosition } = await import('./services/rugDetector.js');

describe('rug detector', () => {
  it('flags positions whose healthy liquidity dropped below the rug threshold', () => {
    expect(shouldFlagRuggedPosition({ entry_liquidity_usd: 1_000 }, 50, 0.01)).toBe(true);
  });

  it('does not hide positions that started with tiny liquidity', () => {
    expect(shouldFlagRuggedPosition({ entry_liquidity_usd: 50 }, 50, 0.01)).toBe(false);
  });

  it('does not flag when liquidity is missing or price data is invalid', () => {
    expect(shouldFlagRuggedPosition({ entry_liquidity_usd: 1_000 }, 0, 0.01)).toBe(false);
    expect(shouldFlagRuggedPosition({ entry_liquidity_usd: 1_000 }, 50, 0)).toBe(false);
  });
});
