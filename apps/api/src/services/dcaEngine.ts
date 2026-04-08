/**
 * DCA (Dollar Cost Average) Engine
 * Creates recurring buy orders that execute at set intervals.
 * Works in mock mode with in-memory storage.
 */

import { executeBuy } from './tradeEngine.js';

interface DCAOrder {
  id: string;
  userId: string;
  tokenAddress: string;
  tokenSymbol: string;
  amountPerBuy: number;     // SOL per buy
  intervalMs: number;       // ms between buys
  totalBuys: number;        // total number of buys planned
  executedBuys: number;     // buys completed so far
  totalSpent: number;       // total SOL spent
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  nextBuyAt: number;        // timestamp of next buy
  createdAt: string;
  lastBuyAt: string | null;
  slippage: number;
}

// In-memory DCA store
const dcaOrders = new Map<string, DCAOrder[]>(); // userId -> orders

let dcaTickerRunning = false;

function genId(): string {
  return `dca_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function getDCAOrders(userId: string): DCAOrder[] {
  return dcaOrders.get(userId) ?? [];
}

const INTERVAL_MAP: Record<string, number> = {
  '1m': 60_000,
  '5m': 300_000,
  '15m': 900_000,
  '1h': 3_600_000,
  '4h': 14_400_000,
  '1d': 86_400_000,
};

export function createDCAOrder(
  userId: string,
  tokenAddress: string,
  tokenSymbol: string,
  amountPerBuy: number,
  interval: string,
  totalBuys: number,
  slippage: number = 15,
): DCAOrder {
  if (amountPerBuy < 0.01) throw new Error('Minimum 0.01 SOL per buy');
  if (totalBuys < 2 || totalBuys > 100) throw new Error('2-100 buys allowed');

  const intervalMs = INTERVAL_MAP[interval];
  if (!intervalMs) throw new Error(`Invalid interval. Use: ${Object.keys(INTERVAL_MAP).join(', ')}`);

  const userOrders = dcaOrders.get(userId) ?? [];
  if (userOrders.filter(o => o.status === 'active').length >= 5) {
    throw new Error('Maximum 5 active DCA orders');
  }

  const order: DCAOrder = {
    id: genId(),
    userId,
    tokenAddress,
    tokenSymbol,
    amountPerBuy,
    intervalMs,
    totalBuys,
    executedBuys: 0,
    totalSpent: 0,
    status: 'active',
    nextBuyAt: Date.now() + intervalMs, // First buy after one interval
    createdAt: new Date().toISOString(),
    lastBuyAt: null,
    slippage,
  };

  if (!dcaOrders.has(userId)) dcaOrders.set(userId, []);
  dcaOrders.get(userId)!.push(order);

  return order;
}

export function cancelDCAOrder(userId: string, orderId: string): boolean {
  const orders = dcaOrders.get(userId);
  if (!orders) return false;
  const order = orders.find(o => o.id === orderId);
  if (!order || order.status !== 'active') return false;
  order.status = 'cancelled';
  return true;
}

export function pauseDCAOrder(userId: string, orderId: string): boolean {
  const orders = dcaOrders.get(userId);
  if (!orders) return false;
  const order = orders.find(o => o.id === orderId);
  if (!order) return false;
  if (order.status === 'active') {
    order.status = 'paused';
    return true;
  }
  if (order.status === 'paused') {
    order.status = 'active';
    order.nextBuyAt = Date.now() + order.intervalMs;
    return true;
  }
  return false;
}

/**
 * DCA Ticker — runs every 10s, checks for orders due for execution
 */
async function dcaTick(): Promise<void> {
  const now = Date.now();

  for (const [userId, orders] of dcaOrders) {
    for (const order of orders) {
      if (order.status !== 'active') continue;
      if (now < order.nextBuyAt) continue;

      try {
        await executeBuy(userId, {
          token_address: order.tokenAddress,
          amount_sol: order.amountPerBuy,
          slippage_tolerance: order.slippage,
          priority: 'normal',
        });

        order.executedBuys++;
        order.totalSpent += order.amountPerBuy;
        order.lastBuyAt = new Date().toISOString();
        order.nextBuyAt = now + order.intervalMs;

        console.log(`[DCA] Executed buy #${order.executedBuys}/${order.totalBuys} for ${order.tokenSymbol} (${order.amountPerBuy} SOL)`);

        if (order.executedBuys >= order.totalBuys) {
          order.status = 'completed';
          console.log(`[DCA] Order ${order.id} completed after ${order.executedBuys} buys`);
        }
      } catch (err: any) {
        console.warn(`[DCA] Buy failed for ${order.tokenSymbol}: ${err.message}`);
        // Skip this tick, try again next interval
        order.nextBuyAt = now + order.intervalMs;
      }
    }
  }
}

export function startDCATicker(): void {
  if (dcaTickerRunning) return;
  dcaTickerRunning = true;
  console.log('[DCA] Ticker started (10s interval)');
  setInterval(() => dcaTick().catch(console.error), 10_000);
}
