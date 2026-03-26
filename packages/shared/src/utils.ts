import {
  SLIPPAGE_MULTIPLIER,
  MAX_SLIPPAGE_PERCENT,
  MIN_SLIPPAGE_PERCENT,
  BASE_PRIORITY_FEE,
  PLATFORM_FEE,
} from './constants.js';

/**
 * Calculate simulated slippage percentage based on trade size vs pool liquidity.
 */
export function calculateSlippage(tradeAmountUsd: number, liquidityUsd: number): number {
  if (liquidityUsd <= 0) return MAX_SLIPPAGE_PERCENT;
  const raw = (tradeAmountUsd / liquidityUsd) * SLIPPAGE_MULTIPLIER;
  return Math.min(MAX_SLIPPAGE_PERCENT, Math.max(MIN_SLIPPAGE_PERCENT, raw));
}

/**
 * Apply slippage to a price (for buys: price goes up; for sells: price goes down).
 */
export function applySlippage(price: number, slippagePercent: number, isBuy: boolean): number {
  const factor = slippagePercent / 100;
  return isBuy ? price * (1 + factor) : price * (1 - factor);
}

/**
 * Calculate total fees for a trade in SOL.
 */
export function calculateFees(): number {
  return BASE_PRIORITY_FEE + PLATFORM_FEE;
}

/**
 * Calculate tokens received for a given SOL amount at a given price.
 */
export function calculateTokensReceived(
  amountSol: number,
  pricePerTokenInSol: number,
  slippagePercent: number
): number {
  const effectivePrice = applySlippage(pricePerTokenInSol, slippagePercent, true);
  const fees = calculateFees();
  const netSol = amountSol - fees;
  if (netSol <= 0) return 0;
  return netSol / effectivePrice;
}

/**
 * Calculate SOL received when selling tokens.
 */
export function calculateSolReceived(
  amountTokens: number,
  pricePerTokenInSol: number,
  slippagePercent: number
): number {
  const effectivePrice = applySlippage(pricePerTokenInSol, slippagePercent, false);
  const grossSol = amountTokens * effectivePrice;
  const fees = calculateFees();
  return Math.max(0, grossSol - fees);
}

/**
 * Calculate PnL percentage.
 */
export function calculatePnlPercent(entryPrice: number, currentPrice: number): number {
  if (entryPrice === 0) return 0;
  return ((currentPrice - entryPrice) / entryPrice) * 100;
}

/**
 * Format SOL amount for display.
 */
export function formatSol(amount: number, decimals = 4): string {
  return amount.toFixed(decimals);
}

/**
 * Format USD amount for display.
 */
export function formatUsd(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(2)}K`;
  return `$${amount.toFixed(2)}`;
}

/**
 * Format percentage for display.
 */
export function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

/**
 * Truncate a Solana address for display.
 */
export function truncateAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * Validate a Solana address (base58, 32-44 chars).
 */
export function isValidSolanaAddress(address: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

/**
 * Generate a unique ID (for client-side optimistic updates).
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Calculate "Sell Init" — how many tokens equal the initial SOL investment at current price.
 */
export function calculateSellInitTokens(
  initialAmountSol: number,
  currentPricePerToken: number,
  slippagePercent: number
): number {
  const effectivePrice = applySlippage(currentPricePerToken, slippagePercent, false);
  const fees = calculateFees();
  // We need: tokens * effectivePrice - fees = initialAmountSol
  // tokens = (initialAmountSol + fees) / effectivePrice
  if (effectivePrice <= 0) return 0;
  return (initialAmountSol + fees) / effectivePrice;
}
