/** Environment-aware configuration */
const DEFAULT_API_BASE = 'https://paperape-api.onrender.com';
const DEFAULT_WEBAPP_URL = 'https://paperape.fun';

export async function getConfig() {
  try {
    const stored = await chrome.storage.local.get(['api_base', 'webapp_url']);
    return {
      API_BASE: stored.api_base || DEFAULT_API_BASE,
      WEBAPP_URL: stored.webapp_url || DEFAULT_WEBAPP_URL,
    };
  } catch {
    return {
      API_BASE: DEFAULT_API_BASE,
      WEBAPP_URL: DEFAULT_WEBAPP_URL,
    };
  }
}

/** Quick buy amounts in SOL */
export const QUICK_BUY_AMOUNTS = [0.5, 1, 2, 5, 10] as const;

/** Quick sell percentages */
export const QUICK_SELL_PCTS = [25, 50, 100] as const;

/** Slippage presets */
export const SLIPPAGE_PRESETS = [1, 5, 10, 15, 25] as const;

/** Take-profit presets: { trigger%, sell% } */
export const TP_PRESETS = [
  { trigger: 100, sell: 50 },
  { trigger: 200, sell: 50 },
  { trigger: 500, sell: 75 },
  { trigger: 1000, sell: 100 },
] as const;

/** Stop-loss presets: trigger% (negative) */
export const SL_PRESETS = [-10, -20, -30, -50] as const;
