/* ═══════════════════════════════════════════════════════
   CURRICULUM DATA — Scalable JSON-like lesson store
   Each lesson maps to an interactiveModuleId for the
   LessonRenderer to load the right React component.
   ═══════════════════════════════════════════════════════ */

export interface Lesson {
  id: string;
  title: string;
  desc: string;
  level: 'beg' | 'int' | 'adv';
  time: string;
  reward: number; // Fake SOL reward for completion
  content: string[];
  interactiveModuleId?: 'quiz' | 'honeypot-sim' | 'sandwich-sim' | 'bonding-curve-demo' | 'demo' | null;
  quizData?: {
    question: string;
    options: { value: string; text: string }[];
    correctAnswer: string;
  };
}

export interface Category {
  id: string;
  name: string;
  icon: string; // icon component key
  color: string;
  lessons: Lesson[];
}

export const CURRICULUM: Category[] = [
  /* ── Category 1: Trench Fundamentals ── */
  {
    id: 'trench-fundamentals',
    name: 'Trench Fundamentals',
    icon: 'zap',
    color: 'green',
    lessons: [
      { id: 'tf01', title: 'What Is Paper Trading?', desc: 'Simulated trading explained', level: 'beg', time: '3 min', reward: 2, content: ['Paper trading lets you practice buying and selling tokens using fake money. No real funds are at risk.','You start with 100 SOL of paper money. Execute trades, track PnL, and build your strategy.','PaperApe simulates the full Solana DEX experience with slippage, fees, and realistic price data.'] },
      { id: 'tf02', title: 'Setting Up Your Account', desc: 'First steps with PaperApe', level: 'beg', time: '2 min', reward: 2, content: ['Sign in with Google or email. A paper wallet is created automatically.','Your balance starts at 100 SOL. You can add more from the Wallet Manager.','Toggle between Beginner and Pro mode using the switch in the top navigation bar.'] },
      { id: 'tf03', title: 'Your First Trade', desc: 'Step-by-step buy walkthrough', level: 'beg', time: '4 min', reward: 3, content: ['Go to the Terminal page. Search for a token or pick from the quick-select buttons.','Set your SOL amount, choose a preset or type a custom amount, then click Buy.','The trade executes with simulated slippage and network fees.','Your position appears on the Dashboard. Watch the PnL update.'] },
      { id: 'tf04', title: 'Wallet Security Basics', desc: 'Protecting your private keys', level: 'beg', time: '5 min', reward: 5, content: ['Your private key is the master password to your wallet. Never share it.','Use a hardware wallet (Ledger) for large holdings. Software wallets for daily use.','Enable 2FA on all exchange accounts. Use unique passwords.','Common scam: fake support DMs asking for your seed phrase. No legitimate service will ever ask.'], interactiveModuleId: 'quiz', quizData: { question: 'When should you share your seed phrase?', options: [{ value: 'a', text: 'When customer support asks for it' }, { value: 'b', text: 'Never — no legitimate service will ask for it' }, { value: 'c', text: 'When verifying your wallet on a new device' }], correctAnswer: 'b' } },
      { id: 'tf05', title: 'Slippage Tolerance', desc: 'How slippage affects your trades', level: 'int', time: '4 min', reward: 5, content: ['Slippage is the difference between expected and actual execution price.','Low liquidity = high slippage. Your large buy moves the price up before your order fills.','Too low tolerance → transaction fails. Too high → you overpay.','For memecoins, 10-25% slippage is common. For blue chips, 1-5% is standard.'], interactiveModuleId: 'demo' },
      { id: 'tf06', title: 'Liquidity Pools Explained', desc: 'Where your trades happen', level: 'int', time: '6 min', reward: 5, content: ['A liquidity pool is a smart contract holding two tokens (e.g., SOL + BONK).','When you buy BONK, you deposit SOL into the pool and withdraw BONK.','The constant product formula (x * y = k) determines the price.','Low liquidity pools are dangerous: small trades cause huge price impact.'] },
      { id: 'tf07', title: 'Market Cap vs. Price', desc: 'Why price alone is meaningless', level: 'beg', time: '3 min', reward: 3, content: ['Market Cap = Price x Total Supply. This is the true measure of value.','A token at $0.001 with 1T supply has a $1B market cap. That is not cheap.','Compare market caps, not prices. A $5M mcap has more upside than $500M mcap.'] },
    ],
  },

  /* ── Category 2: The Dark Arts ── */
  {
    id: 'dark-arts',
    name: 'The Dark Arts',
    icon: 'shield',
    color: 'red',
    lessons: [
      { id: 'da01', title: 'Identifying Rug Pulls', desc: 'Red flags and warning signs', level: 'adv', time: '6 min', reward: 10, content: ['Rug pull: creator removes all liquidity, price goes to zero instantly.','Red flags: unlocked LP, mintable token, dev wallet holding >10%, no community.','Check LP lock status. Locked LP is safer but not guaranteed.','If it launched recently with >100x gains and <$50K liquidity, be cautious.'] },
      { id: 'da02', title: 'Honeypot Detection', desc: 'Tokens you can buy but never sell', level: 'adv', time: '4 min', reward: 15, content: ['Honeypot: a token with code that prevents selling. You can buy in but never sell out.','Signs: high buy volume, zero sell volume. Sell tax set to 100%.','The contract may include a whitelist that only allows the dev to sell.','Always use a honeypot checker tool before buying unknown tokens.'], interactiveModuleId: 'honeypot-sim' },
      { id: 'da03', title: 'Phishing Link Identification', desc: 'Spotting fake websites', level: 'beg', time: '5 min', reward: 5, content: ['Phishing: fake websites that look identical to real ones but steal your credentials.','Always check the URL. raydium.io is real. raydlum.io is a scam.','Never click links in Discord DMs, Telegram messages, or Twitter replies.','Bookmark the real URLs. Never Google and click the first result.'], interactiveModuleId: 'quiz', quizData: { question: 'Which URL is likely a phishing scam?', options: [{ value: 'a', text: 'raydium.io' }, { value: 'b', text: 'raydlum.com' }, { value: 'c', text: 'jup.ag' }], correctAnswer: 'b' } },
      { id: 'da04', title: 'Developer Wallet Dumping', desc: 'When insiders sell on you', level: 'adv', time: '5 min', reward: 10, content: ['Insiders may hold large percentages of supply.','When they sell, it crashes the price for everyone else.','Check top holders on Solscan. If one wallet holds >20% of supply, it is risky.','Bundled wallets: devs split holdings across many wallets to hide concentration.'] },
    ],
  },

  /* ── Category 3: On-Chain Mechanics ── */
  {
    id: 'on-chain-mechanics',
    name: 'On-Chain Mechanics',
    icon: 'terminal',
    color: 'cyan',
    lessons: [
      { id: 'ao01', title: 'Bonding Curves (Pump.fun)', desc: 'How new token pricing works', level: 'adv', time: '6 min', reward: 10, content: ['Pump.fun uses a bonding curve: price increases exponentially as more buy.','No liquidity pool needed initially — the bonding curve IS the market maker.','When mcap hits ~$69K, the token migrates to Raydium.','Pre-migration tokens are highest risk: if hype dies, price returns to near zero.'], interactiveModuleId: 'bonding-curve-demo' },
      { id: 'ao02', title: 'MEV & Sandwich Attacks', desc: 'How bots exploit your trades', level: 'adv', time: '5 min', reward: 15, content: ['MEV: bots detect your pending transaction and profit from it.','Sandwich attack: bot buys before you (raising price), then sells after you (dumping).','Result: you pay more AND the price drops right after you buy.','Mitigation: Jito bundles, tight slippage, private RPCs.'], interactiveModuleId: 'sandwich-sim' },
      { id: 'ao03', title: 'Jupiter Aggregation', desc: 'DEX routing for optimal price', level: 'int', time: '4 min', reward: 5, content: ['Jupiter aggregates liquidity across all Solana DEXes for the best price.','Your trade might route through Raydium + Orca + Phoenix to minimize slippage.','Always use an aggregator for large trades. Direct pool swaps get worse prices.'] },
      { id: 'ao04', title: 'Token Supply Mechanics', desc: 'Circulating, total, and max supply', level: 'int', time: '3 min', reward: 5, content: ['Circulating supply: tokens currently trading in the market.','Total supply: all tokens that exist, including locked/vested ones.','Inflation: some tokens mint new supply over time, diluting holders.','For memecoins: most have a fixed supply with no inflation.'] },
    ],
  },
];

/** All lessons flattened for easy lookup */
export function getAllLessons(): Lesson[] {
  return CURRICULUM.flatMap(c => c.lessons);
}

/** Find a lesson by ID */
export function getLessonById(id: string): Lesson | undefined {
  return getAllLessons().find(l => l.id === id);
}

/** Get category for a lesson */
export function getCategoryForLesson(lessonId: string): Category | undefined {
  return CURRICULUM.find(c => c.lessons.some(l => l.id === lessonId));
}

/** Total possible reward SOL */
export function getTotalReward(): number {
  return getAllLessons().reduce((s, l) => s + l.reward, 0);
}
