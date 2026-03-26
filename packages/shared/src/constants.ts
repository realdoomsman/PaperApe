import type { PlatformConfig } from './types.js';

// ─── Trading Constants ──────────────────────────────────
export const DEFAULT_PAPER_BALANCE = 100; // SOL
export const BASE_PRIORITY_FEE = 0.005;   // SOL (simulated Solana priority fee)
export const PLATFORM_FEE = 0.001;        // SOL (PaperApe platform fee sim)
export const DEFAULT_SLIPPAGE_TOLERANCE = 15; // percent
export const SOL_DECIMALS = 9;
export const LAMPORTS_PER_SOL = 1_000_000_000;

// ─── Slippage Curve ─────────────────────────────────────
// Slippage increases as trade size grows relative to pool liquidity.
// Formula: slippage% = (tradeAmountUsd / liquidityUsd) * SLIPPAGE_MULTIPLIER
// Capped at MAX_SLIPPAGE_PERCENT.
export const SLIPPAGE_MULTIPLIER = 200;
export const MAX_SLIPPAGE_PERCENT = 49;
export const MIN_SLIPPAGE_PERCENT = 0.1;

// ─── Quick Buy Amounts (SOL) ────────────────────────────
export const QUICK_BUY_AMOUNTS = [0.5, 1, 2, 5, 10] as const;

// ─── Quick Sell Percentages ─────────────────────────────
export const QUICK_SELL_PERCENTAGES = [25, 50, 100] as const;

// ─── Rug Detection ──────────────────────────────────────
export const RUG_LIQUIDITY_THRESHOLD_USD = 100;   // below this = rug
export const RUG_CHECK_INTERVAL_MS = 10_000;      // poll every 10s

// ─── Platform Configs ───────────────────────────────────
export const PLATFORM_CONFIGS: PlatformConfig[] = [
  {
    id: 'bullx',
    name: 'BullX',
    urlPattern: /bullx\.(io|com)/,
    tokenAddressExtractor: 'url_query_address',
  },
  {
    id: 'padre',
    name: 'Padre',
    urlPattern: /padre\.market/,
    tokenAddressExtractor: 'url_path_segment',
  },
  {
    id: 'photon',
    name: 'Photon',
    urlPattern: /photon-sol\.tinyastro\.io|photon\.tinyastro\.io/,
    tokenAddressExtractor: 'url_path_segment',
  },
  {
    id: 'axiom',
    name: 'Axiom',
    urlPattern: /axiom\.trade/,
    tokenAddressExtractor: 'url_path_segment',
  },
];

// ─── API ────────────────────────────────────────────────
export const API_BASE_URL = process.env.PAPERAPE_API_URL ?? 'http://localhost:3001';
export const WS_URL = process.env.PAPERAPE_WS_URL ?? 'ws://localhost:3001/ws';

// ─── Leaderboard ────────────────────────────────────────
export const LEADERBOARD_PAGE_SIZE = 100;
export const LEADERBOARD_REFRESH_INTERVAL_MS = 30_000;
