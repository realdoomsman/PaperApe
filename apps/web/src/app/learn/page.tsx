'use client';
import { useState, useEffect, useCallback } from 'react';
import AppShell from '@/components/AppShell';
import { useMode } from '@/components/ModeContext';
import { IconGraduationCap, IconChevronRight, IconCheck, IconZap, IconWallet, IconTerminal, IconExtension, IconChart, IconShield, IconRocket, IconTrophy } from '@/components/Icons';

interface Lesson { id: string; title: string; desc: string; level: 'beg' | 'int' | 'adv'; time: string; content: string[]; }
interface Category { name: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; color: string; lessons: Lesson[]; }

const CATS: Category[] = [
  { name: 'Getting Started', icon: IconZap, color: 'purple', lessons: [
    { id: 'gs1', title: 'What Is Paper Trading?', desc: 'Simulated trading explained', level: 'beg', time: '3 min', content: ['Paper trading lets you practice buying and selling tokens using fake money. No real funds are ever at risk.','You start with 100 SOL of paper money. Execute trades, track PnL, and build your strategy before going live.','PaperApe simulates the full Solana DEX experience — slippage, fees, rug detection, and moon bags.'] },
    { id: 'gs2', title: 'Setting Up Your Account', desc: 'First steps with PaperApe', level: 'beg', time: '2 min', content: ['Sign in with Google or Apple via Privy. An invisible paper wallet is created automatically.','Your balance starts at 100 SOL. You can add more anytime from the Wallet Manager.','All data syncs between the web dashboard and the Chrome Extension in real-time.'] },
    { id: 'gs3', title: 'Your First Trade', desc: 'Step-by-step buy walkthrough', level: 'beg', time: '4 min', content: ['Go to the Terminal. Search for a token or pick from trending.','Set your SOL amount and click Buy. The trade executes with simulated slippage.','Your position appears on the Dashboard. Watch the PnL update in real-time.','When ready, sell from the Terminal or use Sell Init to recover your initial.'] },
  ]},
  { name: 'Memecoin Fundamentals', icon: IconRocket, color: 'gold', lessons: [
    { id: 'mc1', title: 'What Are Memecoins?', desc: 'Culture-driven tokens on Solana', level: 'beg', time: '3 min', content: ['Memecoins are tokens driven by community, memes, and social momentum rather than utility.','On Solana, they trade on DEXes like Raydium, Jupiter, and Pump.fun with near-instant settlement.','Examples: BONK, WIF, POPCAT, BOME, SLERF — each started as a meme and gained massive volume.'] },
    { id: 'mc2', title: 'Pump.fun Mechanics', desc: 'Bonding curves and migration', level: 'int', time: '5 min', content: ['Pump.fun lets anyone launch a token with a bonding curve — price increases as more people buy.','When market cap hits ~$69K, the token "migrates" to Raydium with real liquidity.','Pre-migration tokens are high risk. Post-migration tokens have real LP but can still rug.','Watch for: bundled wallets, dev holding large %, no socials = red flags.'] },
    { id: 'mc3', title: 'Token Categories', desc: 'Blue chips vs micro caps', level: 'beg', time: '3 min', content: ['Blue Chips: BONK, WIF — established, large market cap, lower risk, lower upside.','Mid Caps: POPCAT, MYRO — moderate risk, can 2-5x or go to zero.','Micro Caps: New launches — highest risk, highest potential return. Most go to zero.','PaperApe lets you practice all three risk levels without real consequences.'] },
  ]},
  { name: 'Launch Strategy', icon: IconChart, color: 'green', lessons: [
    { id: 'ls1', title: 'Sniping New Launches', desc: 'Timing entry on fresh tokens', level: 'adv', time: '5 min', content: ['Sniping = buying a token within seconds of launch to get the lowest price.','On Pump.fun, this means buying on the bonding curve before migration.','Risks: most new launches fail. Dev rugs, no community, zero liquidity post-hype.','Strategy: Small position (0.1-0.5 SOL), sell init fast, ride moon bag if it runs.'] },
    { id: 'ls2', title: 'When to Take Profit', desc: 'Exit strategies that work', level: 'int', time: '4 min', content: ['Never got broke taking profit. Set targets: 2x sell half, 5x sell half again, moon bag the rest.','Sell Init: recover your initial SOL investment. Everything remaining is free money.','Avoid "one more candle" syndrome — if you hit your target, execute.','PaperApe tracks sell init and moon bags so you can practice these strategies.'] },
    { id: 'ls3', title: 'Position Sizing', desc: 'How much SOL per trade', level: 'int', time: '3 min', content: ['Never risk more than 1-5% of your portfolio on a single trade.','Micro caps: 0.1-0.5 SOL max. Blue chips: 1-5 SOL is reasonable.','Use the Position Sizer tool to calculate exact amounts based on your risk tolerance.','Diversify across 5-10 positions to reduce single-trade blow-up risk.'] },
  ]},
  { name: 'Risk Management', icon: IconShield, color: 'red', lessons: [
    { id: 'rm1', title: 'Identifying Rug Pulls', desc: 'Red flags and warning signs', level: 'adv', time: '6 min', content: ['Rug pull: creator removes all liquidity, token price goes to zero instantly.','Red flags: unlocked LP, mintable token, dev wallet holding >10%, no Twitter/Telegram.','Check LP lock status with the Risk Score tool. Locked LP is safer but not guaranteed.','PaperApe auto-detects rugs via Helius RPC and marks positions at -100%.'] },
    { id: 'rm2', title: 'Honeypot Detection', desc: 'Tokens you can buy but not sell', level: 'adv', time: '4 min', content: ['Honeypot: a token with code that prevents selling. You can buy in but never sell out.','Signs: high buy volume, zero sell volume. Tax on sells is 100%.','Always check with the Risk Score tool before buying unknown tokens.','PaperApe simulates honeypot detection to train your pattern recognition.'] },
    { id: 'rm3', title: 'Managing Drawdowns', desc: 'When your portfolio is bleeding', level: 'int', time: '3 min', content: ['Drawdown = your portfolio declining from its peak value.','Rule: if you hit 20% daily drawdown, stop trading for the day.','Review losing trades — was it bad entry, bad token, or bad luck?','Paper trading lets you experience drawdowns emotionally without financial damage.'] },
  ]},
  { name: 'Trading Patterns', icon: IconTerminal, color: 'cyan', lessons: [
    { id: 'tp1', title: 'Sell Init Strategy', desc: 'Recover your initial, ride the rest', level: 'int', time: '4 min', content: ['Sell Init: when your position doubles, sell enough tokens to recover your initial SOL.','Now you are playing with \"house money\" — zero risk on the remaining position.','Example: Buy 1 SOL of BONK. It 2x\'s. Sell 0.5 SOL worth. Your remaining tokens are free.','This is the most important risk management technique in memecoin trading.'] },
    { id: 'tp2', title: 'Moon Bags', desc: 'Free rides on winning trades', level: 'beg', time: '3 min', content: ['A moon bag is the remaining tokens after you\'ve already recovered your initial investment.','There\'s no risk — if it goes to zero, you already have your money back. If it 100x\'s, you win big.','PaperApe tracks moon bags separately so you can see exactly how they perform.','Pro tip: never sell your entire moon bag. Always keep 10-20% as a true \"forget about it\" position.'] },
    { id: 'tp3', title: 'DCA and Scaling', desc: 'Dollar cost averaging in and out', level: 'int', time: '4 min', content: ['DCA in: instead of buying all at once, split into 3-5 buys as the price drops.','DCA out: sell in stages as the price rises. Don\'t try to time the exact top.','Scaling: increase position size as you gain confidence in a thesis.','Use multiple wallets to test DCA strategies vs. lump sum on the same token.'] },
  ]},
  { name: 'DEX Platforms', icon: IconExtension, color: 'purple', lessons: [
    { id: 'dp1', title: 'BullX vs Photon vs Axiom', desc: 'Choosing your terminal', level: 'beg', time: '4 min', content: ['BullX: Popular terminal with charts, portfolio tracking, and social features. Good for beginners.','Photon: Speed-focused. Best for sniping and fast execution. Minimal UI.','Axiom: Full-featured platform with Pulse feed, smart wallet tracking, and perps. Most advanced.','PaperApe works inside all four + Padre. Choose based on your speed and feature needs.'] },
    { id: 'dp2', title: 'Extension Injection', desc: 'How PaperApe injects into DEX terminals', level: 'int', time: '3 min', content: ['The Chrome Extension uses Shadow DOM to inject a trading widget into supported platforms.','Shadow DOM ensures complete CSS isolation — the widget never conflicts with the host page.','Platform adapters use MutationObserver for SPA navigation detection and auto-injection.','The widget is draggable — position it wherever works best for your workflow.'] },
  ]},
  { name: 'Advanced Concepts', icon: IconTrophy, color: 'gold', lessons: [
    { id: 'ac1', title: 'MEV and Front-Running', desc: 'How bots exploit your trades', level: 'adv', time: '5 min', content: ['MEV (Maximal Extractable Value): bots detect your pending transaction and trade before you.','Sandwich attacks: a bot buys before you (raising the price) and sells after you (dumping on you).','Mitigation: use MEV protection (Jito bundles), set low slippage, use private RPCs.','PaperApe simulates MEV costs so you understand the real execution cost of trades.'] },
    { id: 'ac2', title: 'Wallet Tracking', desc: 'Following smart money', level: 'adv', time: '4 min', content: ['Smart money tracking: monitor wallets of successful traders and mirror their moves.','Look for: consistent PnL, early entries on winners, reasonable position sizes.','Warning: some tracked wallets are actually bait — they front-run followers.','PaperApe\'s simulated wallet tracker lets you practice this without real risk.'] },
    { id: 'ac3', title: 'Leaderboard Strategy', desc: 'Climb the rankings efficiently', level: 'beg', time: '3 min', content: ['Weekly rankings reset Monday. Monthly on the 1st. Your rank = total PnL in the period.','Strategy: consistent small wins beat one big gamble. Win rate matters.','Avoid revenge trading — if you\'re on a losing streak, stop and review.','Top 10 gets featured on the Social Export card. Prove your alpha.'] },
  ]},
];

export default function AcademyPage() {
  const { mode } = useMode();
  const [openCats, setOpenCats] = useState<string[]>([CATS[0].name]);
  const [selLesson, setSelLesson] = useState<string | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());

  useEffect(() => {
    const s = localStorage.getItem('pa-academy');
    if (s) try { setDone(new Set(JSON.parse(s))); } catch {}
  }, []);

  const toggleCat = (name: string) => setOpenCats((p) => p.includes(name) ? p.filter((c) => c !== name) : [...p, name]);
  const toggleDone = useCallback((id: string) => {
    setDone((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      localStorage.setItem('pa-academy', JSON.stringify([...n]));
      return n;
    });
  }, []);

  const totalLessons = CATS.reduce((s, c) => s + c.lessons.length, 0);
  const completedCount = done.size;
  const lesson = selLesson ? CATS.flatMap((c) => c.lessons).find((l) => l.id === selLesson) : null;

  return (
    <AppShell>
      <div className="ptop"><div><h1>Academy</h1><div className="ptop-desc">Master paper trading with structured lessons</div></div>
        <div className="ptop-right"><div className="chip"><IconGraduationCap style={{ width: 12, height: 12 }} /> {completedCount}/{totalLessons} complete</div></div></div>

      {/* Progress bar */}
      <div className="panel an" style={{ marginBottom: 16 }}>
        <div className="panel-pad" style={{ padding: '14px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--t0)' }}>Your Progress</span>
            <span className="mono" style={{ fontSize: 12, color: 'var(--t2)' }}>{completedCount}/{totalLessons}</span>
          </div>
          <div style={{ height: 6, background: 'var(--bg-2)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(completedCount / totalLessons) * 100}%`, background: 'linear-gradient(90deg, var(--accent), var(--green))', borderRadius: 3, transition: 'width 0.3s var(--ease)' }} />
          </div>
        </div>
      </div>

      {selLesson && lesson ? (
        <>
          <button className="btn an" onClick={() => setSelLesson(null)} style={{ marginBottom: 16 }}><IconChevronRight style={{ transform: 'rotate(180deg)', width: 14, height: 14 }} /> Back to Academy</button>
          <div className="learn-detail an an1">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <span className={`lesson-badge ${lesson.level}`}>{lesson.level === 'beg' ? 'Beginner' : lesson.level === 'int' ? 'Intermediate' : 'Advanced'}</span>
              <span className="lesson-time">{lesson.time}</span>
            </div>
            <h2 style={{ marginBottom: 8 }}>{lesson.title}</h2>
            <p style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 24 }}>{lesson.desc}</p>
            {lesson.content.map((p, i) => <p key={i}>{p}</p>)}
            <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
              <button className={`btn ${done.has(lesson.id) ? '' : 'primary'}`} onClick={() => toggleDone(lesson.id)}>
                <IconCheck style={{ width: 14, height: 14 }} /> {done.has(lesson.id) ? 'Completed' : 'Mark Complete'}
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="an an1">
          {CATS.map((cat) => {
            const isOpen = openCats.includes(cat.name);
            const catDone = cat.lessons.filter((l) => done.has(l.id)).length;
            const I = cat.icon;
            return (
              <div key={cat.name} className="academy-cat">
                <div className={`cat-header ${isOpen ? 'open' : ''}`} onClick={() => toggleCat(cat.name)}>
                  <div className="cat-left">
                    <div className={`cat-icon feat-icon ${cat.color}`}><I /></div>
                    <div><div className="cat-name">{cat.name}</div><div className="cat-count">{catDone}/{cat.lessons.length} complete</div></div>
                  </div>
                  <IconChevronRight className="cat-chev" />
                </div>
                {isOpen && (
                  <div className="cat-body">
                    {cat.lessons.map((l) => (
                      <div key={l.id} className="lesson-row" onClick={() => setSelLesson(l.id)}>
                        <div className={`lesson-check ${done.has(l.id) ? 'done' : ''}`} onClick={(e) => { e.stopPropagation(); toggleDone(l.id); }}>{done.has(l.id) && <IconCheck />}</div>
                        <div className="lesson-info"><div className="lesson-name">{l.title}</div><div className="lesson-desc-short">{l.desc}</div></div>
                        <span className={`lesson-badge ${l.level}`}>{l.level === 'beg' ? 'Beginner' : l.level === 'int' ? 'Intermediate' : 'Advanced'}</span>
                        <span className="lesson-time">{l.time}</span>
                        <IconChevronRight style={{ width: 14, height: 14, color: 'var(--t3)', flexShrink: 0 }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
