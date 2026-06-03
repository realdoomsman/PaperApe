import {
  BASE_PRIORITY_FEE,
  PLATFORM_FEE,
} from './constants.js';

/**
 * Calculate total fees for a trade in SOL.
 */
export function calculateFees(priorityFee = BASE_PRIORITY_FEE): number {
  return priorityFee + PLATFORM_FEE;
}

/**
 * Calculate tokens received for a given SOL amount at a given price.
 * Simple: (amountSol - fees) / pricePerToken
 */
export function calculateTokensReceived(
  amountSol: number,
  pricePerTokenInSol: number,
  fees = calculateFees()
): number {
  if (pricePerTokenInSol <= 0) return 0;
  const netSol = amountSol - fees;
  if (netSol <= 0) return 0;
  return netSol / pricePerTokenInSol;
}

/**
 * Calculate SOL received when selling tokens.
 * Simple: (tokens * price) - fees
 */
export function calculateSolReceived(
  amountTokens: number,
  pricePerTokenInSol: number,
  fees = calculateFees()
): number {
  if (pricePerTokenInSol <= 0) return 0;
  const grossSol = amountTokens * pricePerTokenInSol;
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
 * Calculate "Sell Init" — how many tokens to sell to recover the initial SOL investment.
 * tokens = (initialAmountSol + fees) / pricePerToken
 */
export function calculateSellInitTokens(
  initialAmountSol: number,
  currentPricePerToken: number,
  fees = calculateFees()
): number {
  if (currentPricePerToken <= 0) return 0;
  return (initialAmountSol + fees) / currentPricePerToken;
}
