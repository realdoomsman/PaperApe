import type { DCAOrder, PriceAlert, TokenMarketData } from '@paperape/shared';

export interface UiPriceAlert {
  id: string;
  tokenSymbol: string;
  tokenAddress: string;
  targetPrice: number;
  direction: 'above' | 'below';
}

export interface UiDCAOrder {
  id: string;
  tokenSymbol: string;
  tokenAddress: string;
  amountPerBuy: number;
  interval: DCAOrder['interval'];
  totalBuys: number;
  completedBuys: number;
  totalSpent: number;
  status: DCAOrder['status'];
  nextBuyAt: number;
}

export function toUiAlert(alert: Partial<PriceAlert> & Record<string, any>): UiPriceAlert {
  return {
    id: String(alert.id ?? ''),
    tokenSymbol: String(alert.token_symbol ?? alert.tokenSymbol ?? '???'),
    tokenAddress: String(alert.token_address ?? alert.tokenAddress ?? ''),
    targetPrice: Number(alert.target_price ?? alert.targetPrice ?? 0),
    direction: (alert.condition ?? alert.direction ?? 'above') === 'below' ? 'below' : 'above',
  };
}

export function toUiDCAOrder(order: Partial<DCAOrder> & Record<string, any>): UiDCAOrder {
  const amountPerBuy = Number(order.amount_per_buy ?? order.amountPerBuy ?? 0);
  const completedBuys = Number(order.completed_buys ?? order.executedBuys ?? 0);
  return {
    id: String(order.id ?? ''),
    tokenSymbol: String(order.token_symbol ?? order.tokenSymbol ?? '???'),
    tokenAddress: String(order.token_address ?? order.tokenAddress ?? ''),
    amountPerBuy,
    interval: order.interval ?? '1h',
    totalBuys: Number(order.total_buys ?? order.totalBuys ?? 0),
    completedBuys,
    totalSpent: Number(order.total_spent ?? order.totalSpent ?? completedBuys * amountPerBuy),
    status: order.status ?? 'active',
    nextBuyAt: Number(order.next_buy_at ?? order.nextBuyAt ?? 0),
  };
}

export function normalizeToken(token: Partial<TokenMarketData> & Record<string, any>): TokenMarketData {
  return {
    address: String(token.address ?? ''),
    symbol: String(token.symbol ?? '???'),
    name: String(token.name ?? 'Unknown'),
    priceUsd: Number(token.priceUsd ?? token.price_usd ?? 0),
    priceSol: Number(token.priceSol ?? token.price_sol ?? 0),
    priceChange24h: Number(token.priceChange24h ?? token.price_change_24h ?? 0),
    volume24h: Number(token.volume24h ?? token.volume_24h ?? 0),
    liquidity: Number(token.liquidity ?? token.liquidityUsd ?? token.liquidity_usd ?? 0),
    liquidityUsd: Number(token.liquidityUsd ?? token.liquidity_usd ?? token.liquidity ?? 0),
    marketCap: Number(token.marketCap ?? token.market_cap_usd ?? token.mcap ?? 0),
    market_cap_usd: Number(token.market_cap_usd ?? token.marketCap ?? token.mcap ?? 0),
    pairAddress: token.pairAddress ?? token.pair_address ?? null,
    dex: token.dex,
    image: token.image ?? null,
    createdAt: token.createdAt ?? token.created_at ?? null,
    ageMinutes: token.ageMinutes ?? token.age_minutes,
    txns: token.txns,
    socials: token.socials,
  };
}
