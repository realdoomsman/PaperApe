import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { calculateFees } from '../../../packages/shared/src/utils.ts';

vi.mock('./lib/firebase.js', () => ({
  isMockMode: true,
  db: {},
}));

vi.mock('./routes/wallets.js', () => ({
  applyPrimaryWalletBalanceDelta: vi.fn(),
}));

vi.mock('./services/birdeye.js', () => ({
  getTokenPrice: vi.fn(),
  getTokenOverview: vi.fn(),
}));

const { executeBuy, executeSell, getUserTrades, mockPositions, mockTrades, resetUserOpenPositions } = await import('./services/tradeEngine.js');
const { mockUsers } = await import('./services/auth.js');
const { getTokenPrice, getTokenOverview } = await import('./services/birdeye.js');

const USER_ID = 'test-user';
const TOKEN_ADDRESS = 'Token1111111111111111111111111111111111';

function setMockUser(balance = 100) {
  mockUsers.set(USER_ID, {
    id: USER_ID,
    firebase_uid: USER_ID,
    username: 'Test Ape',
    paper_balance: balance,
    avatar_url: null,
    total_pnl: 0,
    created_at: new Date().toISOString(),
  });
}

async function settleTrade<T>(promise: Promise<T>): Promise<T> {
  const settled = promise.then(
    (value) => ({ status: 'fulfilled' as const, value }),
    (reason) => ({ status: 'rejected' as const, reason }),
  );
  await vi.advanceTimersByTimeAsync(2_500);
  const result = await settled;
  if (result.status === 'rejected') throw result.reason;
  return result.value;
}

describe('trade engine accounting', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-02T00:00:00.000Z'));
    vi.mocked(getTokenPrice).mockResolvedValue({
      priceUsd: 1,
      priceSol: 0.01,
      liquidityUsd: 1_000_000,
    });
    vi.mocked(getTokenOverview).mockResolvedValue({
      symbol: 'TEST',
      name: 'Test Token',
      image: null,
      market_cap_usd: 1_000_000,
    });
    mockUsers.clear();
    mockPositions.clear();
    mockTrades.length = 0;
    setMockUser();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('opens a buy using gross order size as cost basis and deducts balance', async () => {
    const result = await settleTrade(executeBuy(USER_ID, {
      token_address: TOKEN_ADDRESS,
      amount_sol: 1,
      slippage_tolerance: 1,
    }));

    expect(mockUsers.get(USER_ID).paper_balance).toBeCloseTo(99);
    expect(result.position.amount_sol).toBeCloseTo(1);
    expect(result.position.tokens_remaining).toBeGreaterThan(0);
    expect(result.position.tokens_remaining).toBeCloseTo((1 - calculateFees()) / 0.01);
    expect(result.position.current_value).toBeCloseTo(1 - calculateFees());
    expect(result.position.pnl_sol).toBeCloseTo(result.position.current_value - 1);
    expect(result.trade.fee_applied).toBeCloseTo(calculateFees());
  });

  it('tracks realized and unrealized PnL after a partial sell', async () => {
    const buy = await settleTrade(executeBuy(USER_ID, {
      token_address: TOKEN_ADDRESS,
      amount_sol: 1,
      slippage_tolerance: 1,
    }));
    const originalTokens = buy.position.tokens_remaining;

    vi.mocked(getTokenPrice).mockResolvedValue({
      priceUsd: 2,
      priceSol: 0.02,
      liquidityUsd: 1_000_000,
    });

    const sell = await executeSell(USER_ID, {
      position_id: buy.position.id,
      percentage: 50,
    });

    expect(sell.position.status).toBe('open');
    expect(sell.position.amount_sol).toBeCloseTo(0.5);
    expect(sell.position.tokens_remaining).toBeCloseTo(originalTokens / 2);
    expect(sell.trade.realized_pnl_sol).toBeGreaterThan(0);
    expect(sell.position.pnl_sol).toBeCloseTo(
      sell.position.realized_pnl_sol + sell.position.current_value - sell.position.amount_sol,
    );
    expect(mockUsers.get(USER_ID).paper_balance).toBeCloseTo(99 + sell.solReceived);
  });

  it('adds repeat buys on the same token to the existing open position', async () => {
    const first = await settleTrade(executeBuy(USER_ID, {
      token_address: TOKEN_ADDRESS,
      amount_sol: 1,
      slippage_tolerance: 1,
    }));

    const second = await settleTrade(executeBuy(USER_ID, {
      token_address: TOKEN_ADDRESS,
      amount_sol: 2,
      slippage_tolerance: 1,
    }));

    const positions = mockPositions.get(USER_ID) ?? [];
    const trades = await getUserTrades(USER_ID);

    expect(positions).toHaveLength(1);
    expect(second.position.id).toBe(first.position.id);
    expect(second.position.amount_sol).toBeCloseTo(3);
    expect(second.trade.is_add_on).toBe(true);
    expect(first.trade.is_add_on).toBe(false);
    expect(new Set(trades.map(t => t.position_id))).toHaveLength(1);
    expect(trades).toHaveLength(2);
    expect(mockUsers.get(USER_ID).paper_balance).toBeCloseTo(97);
  });

  it('closes a position on a full sell and credits proceeds', async () => {
    const buy = await settleTrade(executeBuy(USER_ID, {
      token_address: TOKEN_ADDRESS,
      amount_sol: 1,
      slippage_tolerance: 1,
    }));

    const sell = await executeSell(USER_ID, {
      position_id: buy.position.id,
      percentage: 100,
    });

    expect(sell.position.status).toBe('closed');
    expect(sell.position.amount_sol).toBe(0);
    expect(sell.position.tokens_remaining).toBe(0);
    expect(sell.solReceived).toBeGreaterThan(0);
    expect(mockUsers.get(USER_ID).paper_balance).toBeCloseTo(99 + sell.solReceived);
  });

  it('executes paper buys without modeled slippage even on thin liquidity', async () => {
    vi.mocked(getTokenPrice).mockResolvedValue({
      priceUsd: 1,
      priceSol: 0.01,
      liquidityUsd: 100,
    });

    const trade = await settleTrade(executeBuy(USER_ID, {
      token_address: TOKEN_ADDRESS,
      amount_sol: 1,
      slippage_tolerance: 1,
    }));

    expect(trade.trade.slippage_applied).toBe(0);
    expect(trade.position.tokens_remaining).toBeCloseTo((1 - calculateFees()) / 0.01);
    expect(trade.position.pnl_sol).toBeCloseTo(-calculateFees());
    expect(mockUsers.get(USER_ID).paper_balance).toBeCloseTo(99);
    expect(mockPositions.get(USER_ID) ?? []).toHaveLength(1);
  });

  it('closes and neutralizes open positions during account reset', async () => {
    const buy = await settleTrade(executeBuy(USER_ID, {
      token_address: TOKEN_ADDRESS,
      amount_sol: 1,
      slippage_tolerance: 1,
    }));

    const closed = await resetUserOpenPositions(USER_ID);
    const positions = mockPositions.get(USER_ID) ?? [];

    expect(closed).toBe(1);
    expect(positions).toHaveLength(1);
    expect(buy.position.status).toBe('closed');
    expect(buy.position.amount_sol).toBe(0);
    expect(buy.position.tokens_remaining).toBe(0);
    expect(buy.position.current_value).toBe(0);
    expect(buy.position.pnl_sol).toBe(0);
    expect(buy.position.pnl_percent).toBe(0);
    expect(positions.filter(p => p.status === 'open')).toHaveLength(0);
  });
});
