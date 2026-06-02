import { describe, expect, it, vi } from 'vitest';

vi.mock('./lib/firebase.js', () => ({
  isMockMode: true,
  db: {},
}));

vi.mock('./services/tradeEngine.js', () => ({
  executeSell: vi.fn(),
}));

const { createAutoOrder } = await import('./services/autoOrders.js');

describe('auto orders', () => {
  it('does not store undefined highest_price on non-trailing orders', async () => {
    const order = await createAutoOrder({
      user_id: 'user-1',
      position_id: 'position-1',
      token_address: 'token-1',
      type: 'tp',
      trigger_percent: 50,
      sell_percent: 100,
      entry_price: 0.01,
    });

    expect(Object.prototype.hasOwnProperty.call(order, 'highest_price')).toBe(false);
  });

  it('sets highest_price for trailing stop orders', async () => {
    const order = await createAutoOrder({
      user_id: 'user-1',
      position_id: 'position-1',
      token_address: 'token-1',
      type: 'trailing_sl',
      trigger_percent: 25,
      sell_percent: 100,
      entry_price: 0.01,
    });

    expect(order.highest_price).toBe(0.01);
  });
});
