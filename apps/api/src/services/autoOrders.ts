/**
 * Auto Orders — Take Profit / Stop Loss engine
 * Monitors positions against configured triggers and auto-sells when hit.
 */
import { getTokenPrice } from './birdeye.js';
import { executeSell } from './tradeEngine.js';

// ─── Types ──────────────────────────────────────────────
export interface AutoOrder {
  id: string;
  user_id: string;
  position_id: string;
  token_address: string;
  type: 'tp' | 'sl' | 'trailing_sl';
  trigger_percent: number;   // +100 for TP, -25 for SL
  sell_percent: number;      // what % of position to sell when triggered (default 100)
  entry_price: number;       // price at time of order creation (SOL)
  highest_price?: number;    // for trailing SL — tracks the high
  status: 'active' | 'triggered' | 'cancelled';
  created_at: string;
  triggered_at?: string;
}

// ─── In-Memory Store (mock mode) ────────────────────────
const autoOrders = new Map<string, AutoOrder>(); // orderId -> order
let orderIdCounter = 0;
let tickerInterval: ReturnType<typeof setInterval> | null = null;

// Callbacks for when orders trigger (broadcasts via WebSocket)
type TriggerCallback = (order: AutoOrder, result: any) => void;
let onTriggerCallback: TriggerCallback | null = null;

export function setOnTriggerCallback(cb: TriggerCallback) {
  onTriggerCallback = cb;
}

// ─── Create Order ───────────────────────────────────────
export function createAutoOrder(params: {
  user_id: string;
  position_id: string;
  token_address: string;
  type: 'tp' | 'sl' | 'trailing_sl';
  trigger_percent: number;
  sell_percent?: number;
  entry_price: number;
}): AutoOrder {
  const id = `ao-${++orderIdCounter}`;
  const order: AutoOrder = {
    id,
    user_id: params.user_id,
    position_id: params.position_id,
    token_address: params.token_address,
    type: params.type,
    trigger_percent: params.trigger_percent,
    sell_percent: params.sell_percent ?? 100,
    entry_price: params.entry_price,
    highest_price: params.type === 'trailing_sl' ? params.entry_price : undefined,
    status: 'active',
    created_at: new Date().toISOString(),
  };
  autoOrders.set(id, order);
  console.log(`📌 Auto order created: ${order.type} @ ${order.trigger_percent}% for position ${order.position_id}`);
  return order;
}

// ─── Get Orders ─────────────────────────────────────────
export function getOrdersForPosition(positionId: string): AutoOrder[] {
  return [...autoOrders.values()].filter(o => o.position_id === positionId && o.status === 'active');
}

export function getUserActiveOrders(userId: string): AutoOrder[] {
  return [...autoOrders.values()].filter(o => o.user_id === userId && o.status === 'active');
}

// ─── Cancel Order ───────────────────────────────────────
export function cancelAutoOrder(orderId: string, userId: string): boolean {
  const order = autoOrders.get(orderId);
  if (!order || order.user_id !== userId) return false;
  order.status = 'cancelled';
  console.log(`❌ Auto order cancelled: ${orderId}`);
  return true;
}

// ─── Ticker Loop ────────────────────────────────────────
// Runs every 5s, checks all active orders against live prices
export function startAutoOrderTicker() {
  if (tickerInterval) return;
  console.log('📌 Auto-order ticker started (5s interval)');

  tickerInterval = setInterval(async () => {
    const activeOrders = [...autoOrders.values()].filter(o => o.status === 'active');
    if (activeOrders.length === 0) return;

    // Group by token to reduce API calls
    const tokenGroups = new Map<string, AutoOrder[]>();
    for (const order of activeOrders) {
      const existing = tokenGroups.get(order.token_address) || [];
      existing.push(order);
      tokenGroups.set(order.token_address, existing);
    }

    for (const [tokenAddress, orders] of tokenGroups) {
      try {
        const priceData = await getTokenPrice(tokenAddress);
        const currentPrice = priceData.priceSol;

        for (const order of orders) {
          const priceChange = ((currentPrice - order.entry_price) / order.entry_price) * 100;

          // Update trailing SL highest price
          if (order.type === 'trailing_sl' && currentPrice > (order.highest_price || 0)) {
            order.highest_price = currentPrice;
          }

          let shouldTrigger = false;

          if (order.type === 'tp' && priceChange >= order.trigger_percent) {
            shouldTrigger = true;
          } else if (order.type === 'sl' && priceChange <= order.trigger_percent) {
            shouldTrigger = true;
          } else if (order.type === 'trailing_sl') {
            const dropFromHigh = ((currentPrice - (order.highest_price || order.entry_price)) / (order.highest_price || order.entry_price)) * 100;
            if (dropFromHigh <= order.trigger_percent) {
              shouldTrigger = true;
            }
          }

          if (shouldTrigger) {
            console.log(`🔔 Auto order TRIGGERED: ${order.type} @ ${order.trigger_percent}% (current: ${priceChange.toFixed(1)}%)`);
            order.status = 'triggered';
            order.triggered_at = new Date().toISOString();

            try {
              const result = await executeSell(order.user_id, {
                position_id: order.position_id,
                percentage: order.sell_percent,
              });
              if (onTriggerCallback) {
                onTriggerCallback(order, result);
              }
            } catch (err) {
              console.error(`Auto-sell failed for order ${order.id}:`, err);
              order.status = 'active'; // Re-activate on failure
            }
          }
        }
      } catch (err) {
        // Price fetch failed — skip this cycle
      }
    }
  }, 5_000);
}

export function stopAutoOrderTicker() {
  if (tickerInterval) {
    clearInterval(tickerInterval);
    tickerInterval = null;
    console.log('📌 Auto-order ticker stopped');
  }
}
