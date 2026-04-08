/**
 * PaperApe Advanced Trading Engine
 * Handles TP/SL, Sell Init, DCA, simulated congestion, and mock execution.
 */

// ─── Types ──────────────────────────────────────────────
export interface MockPosition {
  id: string;
  symbol: string;
  name: string;
  entryPrice: number;    // price per token in SOL
  amount: number;        // SOL invested
  tokens: number;        // tokens received
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
  isMoonBag: boolean;
  timestamp: number;
  tp?: TakeProfitRule[];
  sl?: StopLossRule;
  dca?: DcaConfig;
}

export interface TakeProfitRule {
  id: string;
  triggerPercent: number;  // e.g. 200 = +200%
  sellPercent: number;     // e.g. 50 = sell 50% of position
  triggered: boolean;
}

export interface StopLossRule {
  triggerPercent: number;  // e.g. -20 = sell at -20%
  sellPercent: number;     // usually 100
  triggered: boolean;
}

export interface DcaConfig {
  id: string;
  amountSol: number;
  intervalMs: number;     // milliseconds between buys
  totalBuys: number;
  completedBuys: number;
  active: boolean;
  nextBuyAt: number;
}

export interface TradeResult {
  success: boolean;
  tokensReceived?: number;
  solReceived?: number;
  executionPrice?: number;
  slippage?: number;
  fee?: number;
  error?: string;
  isCongested?: boolean;
}

export interface RumorEvent {
  id: string;
  author: string;
  handle: string;
  avatar: string;
  content: string;
  timestamp: number;
  token?: string;
  priceImpact?: number;
  type: 'tweet' | 'whale' | 'news' | 'dev';
}

// ─── Token Price Database ───────────────────────────────
export const TOKEN_DB: Record<string, {
  name: string;
  price: number;
  mcap: number;
  liq: number;
  supply: string;
  volatility: number;   // 0-1 scale
}> = {
  SOL:    { name: 'Solana',           price: 145.00,    mcap: 65000, liq: 12000,  supply: '420M',  volatility: 0.3 },
  BONK:   { name: 'Bonk',            price: 0.0000057, mcap: 503,   liq: 0.82,   supply: '56T',   volatility: 0.7 },
  WIF:    { name: 'dogwifhat',        price: 0.1756,    mcap: 175,   liq: 4.6,    supply: '998M',  volatility: 0.65 },
  JUP:    { name: 'Jupiter',          price: 0.1441,    mcap: 504,   liq: 0.163,  supply: '1.35B', volatility: 0.4 },
  RAY:    { name: 'Raydium',          price: 0.5639,    mcap: 151,   liq: 1.1,    supply: '550M',  volatility: 0.5 },
  POPCAT: { name: 'Popcat',           price: 0.0482,    mcap: 47,    liq: 3.1,    supply: '980M',  volatility: 0.75 },
  MEW:    { name: 'cat in a dogs world', price: 0.000565, mcap: 50,  liq: 9.1,    supply: '88B',   volatility: 0.8 },
  PENGU:  { name: 'Pudgy Penguins',   price: 0.0066,    mcap: 413,   liq: 3.3,    supply: '88B',   volatility: 0.6 },
  SLERF:  { name: 'Slerf',            price: 0.021,     mcap: 8.4,   liq: 0.2,    supply: '500M',  volatility: 0.9 },
  BOME:   { name: 'Book of Meme',     price: 0.0018,    mcap: 12.8,  liq: 0.5,    supply: '68B',   volatility: 0.85 },
  MYRO:   { name: 'Myro',             price: 0.0034,    mcap: 3.2,   liq: 0.18,   supply: '1B',    volatility: 0.9 },
  TRENCH: { name: 'TrenchCoin',       price: 0.00042,   mcap: 0.42,  liq: 0.05,   supply: '1B',    volatility: 0.95 },
};

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
  TRENCH: 'trench1111111111111111111111111111111111111',
};

export function symbolToAddress(sym: string): string {
  return SYMBOL_TO_ADDRESS[sym] || sym;
}


// ─── Live price mutations (simulate price movement) ─────
const livePrices: Record<string, number> = {};

export function getLivePrice(sym: string): number {
  if (!livePrices[sym]) {
    const tk = TOKEN_DB[sym];
    if (!tk) return 0;
    livePrices[sym] = tk.price;
  }
  return livePrices[sym];
}

export function tickPrices(): Record<string, number> {
  for (const [sym, tk] of Object.entries(TOKEN_DB)) {
    const prev = livePrices[sym] ?? tk.price;
    const vol = tk.volatility;
    const delta = (Math.random() - 0.48) * vol * 0.02;
    livePrices[sym] = Math.max(prev * 0.001, prev * (1 + delta));
  }
  return { ...livePrices };
}

// ─── Congestion Simulation ──────────────────────────────
let congestionActive = false;
let congestionEndTime = 0;

export function checkCongestion(): boolean {
  const now = Date.now();
  if (congestionActive && now < congestionEndTime) return true;
  if (congestionActive && now >= congestionEndTime) {
    congestionActive = false;
    return false;
  }
  // 3% chance of congestion event every check
  if (Math.random() < 0.03) {
    congestionActive = true;
    congestionEndTime = now + 8000 + Math.random() * 12000; // 8-20s
    return true;
  }
  return false;
}

export function isCongested(): boolean {
  return congestionActive && Date.now() < congestionEndTime;
}

// ─── Slippage Calculation ───────────────────────────────
export function calcSlippage(amountSol: number, liqM: number, userSlippage: number): number {
  const liqSol = liqM * 1_000_000 / 145; // rough SOL equivalent
  const impact = (amountSol / liqSol) * 200;
  const realSlippage = Math.min(49, Math.max(0.1, impact));
  // During congestion, slippage is amplified
  const multiplier = isCongested() ? 2.5 : 1;
  return Math.min(userSlippage, realSlippage * multiplier);
}

// ─── Fee Calculation ────────────────────────────────────
export function calcFee(congested: boolean): number {
  const base = 0.000005;
  const priority = congested ? 0.005 + Math.random() * 0.01 : 0.001 + Math.random() * 0.002;
  return base + priority;
}

// ─── Mock Trade Execution ───────────────────────────────
export function executeMockBuy(
  sym: string,
  amountSol: number,
  userSlippage: number,
  balance: number
): TradeResult {
  const tk = TOKEN_DB[sym];
  if (!tk) return { success: false, error: 'Token not found' };
  if (amountSol <= 0) return { success: false, error: 'Invalid amount' };

  const congested = checkCongestion();
  const fee = calcFee(congested);

  if (amountSol + fee > balance) {
    return { success: false, error: 'Insufficient balance' };
  }

  // During congestion, if user slippage is below 10%, transaction fails
  if (congested && userSlippage < 10) {
    return {
      success: false,
      error: 'Transaction Reverted: Slippage tolerance too low during network congestion. Increase slippage or wait for congestion to clear.',
      isCongested: true,
    };
  }

  const slippage = calcSlippage(amountSol, tk.liq, userSlippage);
  const priceInSol = tk.price / TOKEN_DB.SOL.price;
  const effectivePrice = priceInSol * (1 + slippage / 100);
  const netSol = amountSol - fee;
  const tokensReceived = netSol / effectivePrice;

  return {
    success: true,
    tokensReceived,
    executionPrice: effectivePrice,
    slippage,
    fee,
    isCongested: congested,
  };
}

export function executeMockSell(
  sym: string,
  tokensToSell: number,
  userSlippage: number,
): TradeResult {
  const tk = TOKEN_DB[sym];
  if (!tk) return { success: false, error: 'Token not found' };

  const congested = checkCongestion();
  const fee = calcFee(congested);

  if (congested && userSlippage < 10) {
    return {
      success: false,
      error: 'Transaction Reverted: Slippage tolerance too low during network congestion.',
      isCongested: true,
    };
  }

  const slippage = calcSlippage(tokensToSell * (tk.price / TOKEN_DB.SOL.price), tk.liq, userSlippage);
  const priceInSol = tk.price / TOKEN_DB.SOL.price;
  const effectivePrice = priceInSol * (1 - slippage / 100);
  const solReceived = Math.max(0, tokensToSell * effectivePrice - fee);

  return {
    success: true,
    solReceived,
    executionPrice: effectivePrice,
    slippage,
    fee,
    isCongested: congested,
  };
}

// ─── Sell Init Calculator ───────────────────────────────
export function calculateSellInit(position: MockPosition): {
  tokensToSell: number;
  solRecovered: number;
  moonBagTokens: number;
} | null {
  if (!position.tokens || position.tokens <= 0) return null;
  const tk = TOKEN_DB[position.symbol];
  if (!tk) return null;

  const currentPriceInSol = tk.price / TOKEN_DB.SOL.price;
  const fee = calcFee(false);

  // tokens needed to recover initial SOL: (initialSOL + fee) / currentPrice
  const tokensNeeded = (position.amount + fee) / currentPriceInSol;

  if (tokensNeeded >= position.tokens) {
    // Can't recover init — position underwater
    return null;
  }

  return {
    tokensToSell: tokensNeeded,
    solRecovered: position.amount,
    moonBagTokens: position.tokens - tokensNeeded,
  };
}

// ─── TP/SL Check ────────────────────────────────────────
export function checkTpSl(position: MockPosition): {
  triggered: 'tp' | 'sl' | null;
  rule?: TakeProfitRule | StopLossRule;
  sellPercent: number;
} {
  const tk = TOKEN_DB[position.symbol];
  if (!tk) return { triggered: null, sellPercent: 0 };

  const currentPriceInSol = tk.price / TOKEN_DB.SOL.price;
  const pnlPercent = ((currentPriceInSol - position.entryPrice) / position.entryPrice) * 100;

  // Check TP rules (highest first)
  if (position.tp) {
    const sortedTp = [...position.tp].sort((a, b) => b.triggerPercent - a.triggerPercent);
    for (const rule of sortedTp) {
      if (!rule.triggered && pnlPercent >= rule.triggerPercent) {
        return { triggered: 'tp', rule, sellPercent: rule.sellPercent };
      }
    }
  }

  // Check SL
  if (position.sl && !position.sl.triggered && pnlPercent <= position.sl.triggerPercent) {
    return { triggered: 'sl', rule: position.sl, sellPercent: position.sl.sellPercent };
  }

  return { triggered: null, sellPercent: 0 };
}

// ─── DCA Tick ───────────────────────────────────────────
export function checkDca(positions: MockPosition[]): { positionId: string; amountSol: number }[] {
  const now = Date.now();
  const buys: { positionId: string; amountSol: number }[] = [];

  for (const pos of positions) {
    if (!pos.dca || !pos.dca.active) continue;
    if (pos.dca.completedBuys >= pos.dca.totalBuys) {
      pos.dca.active = false;
      continue;
    }
    if (now >= pos.dca.nextBuyAt) {
      buys.push({ positionId: pos.id, amountSol: pos.dca.amountSol });
      pos.dca.completedBuys++;
      pos.dca.nextBuyAt = now + pos.dca.intervalMs;
    }
  }

  return buys;
}

// ─── Rumor Mill / Social Feed ───────────────────────────
const FAKE_ACCOUNTS = [
  { author: 'CryptoKaleo', handle: '@CryptoKaleo', avatar: 'CK' },
  { author: 'DegenSpartan', handle: '@DegenSpartan', avatar: 'DS' },
  { author: 'Ansem', handle: '@blknoiz06', avatar: 'AN' },
  { author: 'Murad', handle: '@MustStopMurad', avatar: 'MU' },
  { author: 'PaperApe Bot', handle: '@PaperApeBot', avatar: 'PA' },
  { author: 'Whale Alert', handle: '@whale_alert', avatar: 'WA' },
  { author: 'SolanaFloor', handle: '@SolanaFloor', avatar: 'SF' },
  { author: 'Cobie', handle: '@coaborexts', avatar: 'CO' },
  { author: 'GCR', handle: '@GCRClassic', avatar: 'GC' },
  { author: 'TrenchLord', handle: '@trench_lord', avatar: 'TL' },
];

const RUMOR_TEMPLATES = [
  { tpl: 'Just aped into ${token}. NFA.', impact: 80, type: 'tweet' as const },
  { tpl: '${token} looking extremely bullish on the 4h chart. This is the setup.', impact: 40, type: 'tweet' as const },
  { tpl: '${token} dev just burned 30% of supply. Insane.', impact: 120, type: 'dev' as const },
  { tpl: 'Whale just bought 500k of ${token}. Something brewing.', impact: 60, type: 'whale' as const },
  { tpl: '${token} is the play. If you know, you know.', impact: 50, type: 'tweet' as const },
  { tpl: 'BREAKING: ${token} partnership announcement incoming.', impact: 150, type: 'news' as const },
  { tpl: '${token} just got listed on a T1 CEX.', impact: 200, type: 'news' as const },
  { tpl: 'I sold all my ${token}. Looks like a rug.', impact: -40, type: 'tweet' as const },
  { tpl: '${token} dev wallet just moved 10M tokens to Binance.', impact: -60, type: 'whale' as const },
  { tpl: 'Just loaded up another bag of ${token} at these prices. Stealing.', impact: 70, type: 'tweet' as const },
  { tpl: '${token} liquidity just doubled in the last hour.', impact: 90, type: 'news' as const },
  { tpl: 'This ${token} chart is a textbook cup and handle. Loading.', impact: 35, type: 'tweet' as const },
  { tpl: '${token} community is built different. Diamond hands only.', impact: 25, type: 'tweet' as const },
  { tpl: 'Just heard from a dev friend that ${token} has something massive cooking.', impact: 100, type: 'tweet' as const },
];

let rumorHistory: RumorEvent[] = [];

export function generateRumor(): RumorEvent {
  const account = FAKE_ACCOUNTS[Math.floor(Math.random() * FAKE_ACCOUNTS.length)];
  const template = RUMOR_TEMPLATES[Math.floor(Math.random() * RUMOR_TEMPLATES.length)];
  const tokens = Object.keys(TOKEN_DB).filter(s => s !== 'SOL');
  const token = tokens[Math.floor(Math.random() * tokens.length)];

  const rumor: RumorEvent = {
    id: crypto.randomUUID(),
    author: account.author,
    handle: account.handle,
    avatar: account.avatar,
    content: template.tpl.replace(/\$\{token\}/g, `$${token}`),
    timestamp: Date.now(),
    token,
    priceImpact: template.impact * (0.5 + Math.random()),
    type: template.type,
  };

  rumorHistory = [rumor, ...rumorHistory].slice(0, 50);

  // Apply price impact to the token
  if (rumor.priceImpact) {
    const tk = TOKEN_DB[token];
    if (tk) {
      const currentPrice = livePrices[token] ?? tk.price;
      const impactPct = rumor.priceImpact / 100;
      livePrices[token] = currentPrice * (1 + impactPct);
    }
  }

  return rumor;
}

export function getRumorHistory(): RumorEvent[] {
  return rumorHistory;
}

// ─── OHLC History Generation ────────────────────────────
export interface OHLCBar {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const priceHistoryStore: Record<string, number[]> = {};

export function generateOHLCHistory(symbol: string, count: number = 100): OHLCBar[] {
  const tk = TOKEN_DB[symbol];
  if (!tk) return [];

  const bars: OHLCBar[] = [];
  const now = Math.floor(Date.now() / 1000);
  const interval = 300; // 5min candles
  let price = tk.price;
  const vol = tk.volatility;

  // Walk backward from current price to generate history
  const prices: number[] = [price];
  for (let i = 1; i < count; i++) {
    const delta = (Math.random() - 0.52) * vol * 0.04;
    price = price / (1 + delta);
    prices.unshift(price);
  }

  for (let i = 0; i < count; i++) {
    const open = prices[i];
    const close = i < count - 1 ? prices[i + 1] : tk.price;
    const spread = Math.abs(close - open) * (0.3 + Math.random() * 1.5);
    const high = Math.max(open, close) + spread * Math.random();
    const low = Math.min(open, close) - spread * Math.random();
    const baseVolume = tk.mcap * 0.001 * (0.3 + Math.random() * 1.4);

    bars.push({
      time: now - (count - i) * interval,
      open,
      high: Math.max(high, open, close),
      low: Math.max(0.0000001, Math.min(low, open, close)),
      close,
      volume: baseVolume,
    });
  }

  return bars;
}

export function pushPriceTick(symbol: string, price: number): void {
  if (!priceHistoryStore[symbol]) priceHistoryStore[symbol] = [];
  priceHistoryStore[symbol].push(price);
  // Keep max 500 ticks
  if (priceHistoryStore[symbol].length > 500) {
    priceHistoryStore[symbol] = priceHistoryStore[symbol].slice(-500);
  }
}

export function getPriceHistory(symbol: string): number[] {
  return priceHistoryStore[symbol] || [];
}

// ─── Position ID Generator ──────────────────────────────
export function genId(): string {
  return `pos_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
