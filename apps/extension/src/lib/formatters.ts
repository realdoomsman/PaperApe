/** Format a SOL amount for display */
export function fmtSol(n: number, decimals = 4): string {
  return n.toFixed(decimals);
}

/** Format market cap for display */
export function fmtMcap(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  if (n > 0) return `$${n.toFixed(0)}`;
  return 'MCap N/A';
}

/** Format a percentage with sign */
export function fmtPct(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

/** Format USD price — use scientific notation for sub-cent values */
export function fmtUsd(n: number): string {
  if (n <= 0) return '$0.00';
  if (n < 0.01) return `$${n.toExponential(2)}`;
  return `$${n.toFixed(4)}`;
}

/** Truncate a Solana address for display */
export function truncateAddr(addr: string, chars = 4): string {
  if (addr.length <= chars * 2 + 3) return addr;
  return `${addr.slice(0, chars)}...${addr.slice(-chars)}`;
}
