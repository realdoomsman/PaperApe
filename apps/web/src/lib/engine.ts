/**
 * PaperApe Frontend Utilities
 * Minimal helpers used by the web app. All trading logic lives on the API server.
 */

// ─── Symbol → Solana Address Mapping ───────────────────
export const SYMBOL_TO_ADDRESS: Record<string, string> = {
  SOL:    'So11111111111111111111111111111111111111112',
  BONK:   'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  WIF:    'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
  JUP:    'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
  RAY:    '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
  POPCAT: '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr',
  MEW:    'MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5',
  PENGU:  '2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv',
  SLERF:  '7BgBvyjrZX1YKz4oh9mjb8ZScatkkwb8DzFx7LoiVkM3',
  BOME:   'ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82',
  MYRO:   'HhJpBhRRn4g56VsyLuT8DL5Bv31HkXqsrahTTUCZeZg4',
};

export function symbolToAddress(sym: string): string {
  return SYMBOL_TO_ADDRESS[sym] || sym;
}

// ─── ID Generator ───────────────────────────────────────
export function genId(): string {
  return `pos_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
