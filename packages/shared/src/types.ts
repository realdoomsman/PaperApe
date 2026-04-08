// ─── User ───────────────────────────────────────────────
export interface User {
  id: string;
  privy_id: string;
  username: string;
  avatar_url: string | null;
  paper_balance: number; // in SOL
  created_at: string;
}

// ─── Token ──────────────────────────────────────────────
export interface TokenMeta {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  image: string | null;
  liquidity_usd: number;
  market_cap_usd: number;
  price_usd: number;
  price_change_24h?: number;
  volume_24h?: number;
  // Extended metadata (from Birdeye)
  description?: string | null;
  website?: string | null;
  twitter?: string | null;
  telegram?: string | null;
  discord?: string | null;
  supply?: number | null;
  holder_count?: number | null;
}

// ─── Position ───────────────────────────────────────────
export type PositionStatus = 'open' | 'closed' | 'rugged';

export interface Position {
  id: string;
  user_id: string;
  token_address: string;
  token_symbol: string;
  token_name: string;
  token_image: string | null;
  entry_price: number;       // price per token in SOL at buy time
  amount_sol: number;         // SOL invested
  tokens_bought: number;      // total tokens received
  tokens_remaining: number;   // tokens still held
  current_price: number;      // live price per token in SOL
  current_value: number;      // tokens_remaining * current_price
  pnl_sol: number;            // realized + unrealized PnL in SOL
  pnl_percent: number;
  is_moon_bag: boolean;
  is_rugged: boolean;
  status: PositionStatus;
  created_at: string;
  closed_at: string | null;
}

// ─── Trade ──────────────────────────────────────────────
export type TradeType = 'buy' | 'sell' | 'sell_init';

export interface Trade {
  id: string;
  user_id: string;
  position_id: string;
  trade_type: TradeType;
  amount_sol: number;
  amount_tokens: number;
  execution_price: number;    // actual price after slippage
  market_price: number;       // price before slippage
  slippage_applied: number;   // percentage
  fee_applied: number;        // SOL
  created_at: string;
}

// ─── Leaderboard ────────────────────────────────────────
export interface LeaderboardEntry {
  user_id: string;
  username: string;
  avatar_url: string | null;
  rank: number;
  weekly_pnl: number;
  monthly_pnl: number;
  total_pnl: number;
  total_trades: number;
  win_rate: number;           // 0-100
  updated_at: string;
}

// ─── API Payloads ───────────────────────────────────────
export interface BuyRequest {
  token_address: string;
  amount_sol: number;
  slippage_tolerance?: number; // max slippage %, default 15
  priority?: 'normal' | 'turbo' | 'yolo'; // transaction priority tier
}

export interface SellRequest {
  position_id: string;
  percentage: number; // 25, 50, 100
}

export interface SellInitRequest {
  position_id: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ─── WebSocket Events ───────────────────────────────────
export type WsClientEvent =
  | { type: 'subscribe_price'; token_address: string }
  | { type: 'unsubscribe_price'; token_address: string }
  | { type: 'auth'; token: string };

export type WsServerEvent =
  | { type: 'price_update'; token_address: string; price_usd: number; price_sol: number; timestamp: number }
  | { type: 'position_update'; position: Position }
  | { type: 'rug_alert'; token_address: string; position_id: string }
  | { type: 'error'; message: string };

// ─── Platform Adapters ──────────────────────────────────
export type PlatformId = 'bullx' | 'padre' | 'photon' | 'axiom' | 'gmgn';

export interface PlatformConfig {
  id: PlatformId;
  name: string;
  urlPattern: RegExp;
  tokenAddressExtractor: string; // strategy name
}
