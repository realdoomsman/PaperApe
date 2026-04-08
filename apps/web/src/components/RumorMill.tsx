'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

interface Rumor {
  id: number;
  text: string;
  type: 'whale' | 'alpha' | 'rug' | 'dev' | 'kol';
  token?: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  timestamp: Date;
  avatar: string;
  handle: string;
}

const AVATAR_COLORS = ['#2d6b3f', '#6b2d3f', '#2d3f6b', '#6b5a2d', '#4a2d6b', '#2d6b5a'];

// ─── Rumor Templates ────────────────────────────────────
const BULLISH_TEMPLATES = [
  { text: '🚨 WHALE ALERT: {amt} SOL just rotated into ${token}', type: 'whale' as const },
  { text: '👀 Smart money wallet ending in ...{addr} just loaded ${token}. This wallet was early on $WIF', type: 'whale' as const },
  { text: '🔥 ${token} breaking out of accumulation zone. Volume 3x in last hour', type: 'alpha' as const },
  { text: '📊 ${token} just hit new ATH. Dev wallet hasn\'t sold a single token', type: 'alpha' as const },
  { text: '💎 Huge buy wall forming on ${token}. Someone knows something', type: 'whale' as const },
  { text: '🎯 Insider alpha: ${token} partnership announcement dropping tomorrow', type: 'kol' as const },
  { text: '🦍 ${token} community just hit 50K holders. Organic growth only', type: 'alpha' as const },
  { text: '🚀 Tier 1 CEX listing rumor for ${token}. Load your bags', type: 'kol' as const },
  { text: '📈 ${token} bonding curve about to complete. Migration to Raydium imminent', type: 'alpha' as const },
  { text: '🐋 Solana Foundation wallet just bought {amt} SOL worth of ${token}', type: 'whale' as const },
];

const BEARISH_TEMPLATES = [
  { text: '⚠️ DEV WALLET UNLOCKED for ${token}. {pct}% supply moving to CEX', type: 'dev' as const },
  { text: '🚨 ${token} showing honeypot patterns. Sell volume is ZERO', type: 'rug' as const },
  { text: '💀 Top holder of ${token} just dumped {pct}% of supply. RIP', type: 'whale' as const },
  { text: '🔴 ${token} LP getting drained. Only {amt} SOL left in pool', type: 'rug' as const },
  { text: '⚠️ ${token} dev team went silent. Telegram deleted. Not good', type: 'dev' as const },
  { text: '🚩 Fake volume detected on ${token}. {pct}% is wash trading', type: 'rug' as const },
];

const NEUTRAL_TEMPLATES = [
  { text: '📊 Solana DEX volume up {pct}% today. Money is flowing in', type: 'alpha' as const },
  { text: '🔄 Capital rotating from dog coins to AI narrative. Watch ${token}', type: 'alpha' as const },
  { text: '📉 BTC dominance dropping. Alt season loading for Solana memes', type: 'alpha' as const },
  { text: '🤖 New MEV bot detected targeting ${token} pool. Set slippage carefully', type: 'alpha' as const },
];

const TOKENS = ['BONK', 'WIF', 'POPCAT', 'JUP', 'RAY', 'MYRO', 'SLERF', 'BOME', 'BOOK', 'TRUMP', 'MOODENG'];
const HANDLES = ['@SolanaWhaleBot', '@AlphaLeaks_SOL', '@DegenAlerts', '@TrenchRunner', '@ChainWatch', '@PumpFunSniper', '@MevTrackerSOL', '@CT_Alpha', '@RugRadar'];

function generateRumor(id: number): Rumor {
  const roll = Math.random();
  const templates = roll < 0.5 ? BULLISH_TEMPLATES : roll < 0.75 ? BEARISH_TEMPLATES : NEUTRAL_TEMPLATES;
  const template = templates[Math.floor(Math.random() * templates.length)];
  const token = TOKENS[Math.floor(Math.random() * TOKENS.length)];
  const handle = HANDLES[Math.floor(Math.random() * HANDLES.length)];

  let text = template.text
    .replace(/\$\{token\}/g, token)
    .replace(/\{amt\}/g, String(Math.floor(500 + Math.random() * 9500)))
    .replace(/\{pct\}/g, String(Math.floor(10 + Math.random() * 60)))
    .replace(/\{addr\}/g, Math.random().toString(36).slice(2, 6).toUpperCase());

  return {
    id,
    text,
    type: template.type,
    token,
    sentiment: roll < 0.5 ? 'bullish' : roll < 0.75 ? 'bearish' : 'neutral',
    timestamp: new Date(),
    avatar: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
    handle,
  };
}

interface RumorMillProps {
  onRumorEvent?: (token: string, sentiment: 'bullish' | 'bearish') => void;
}

export default function RumorMill({ onRumorEvent }: RumorMillProps) {
  const [rumors, setRumors] = useState<Rumor[]>(() => {
    const initial: Rumor[] = [];
    for (let i = 0; i < 5; i++) initial.push(generateRumor(i));
    return initial;
  });
  const [expanded, setExpanded] = useState(true);
  const feedRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(5);

  // Push new rumors every 10-30 seconds
  useEffect(() => {
    const scheduleNext = () => {
      const delay = 10000 + Math.random() * 20000; // 10-30s
      return setTimeout(() => {
        const newRumor = generateRumor(idRef.current++);
        setRumors(prev => [newRumor, ...prev.slice(0, 19)]); // Max 20

        // Fire price hook event
        if (onRumorEvent && newRumor.token && newRumor.sentiment !== 'neutral') {
          onRumorEvent(newRumor.token, newRumor.sentiment);
        }

        // Schedule next
        const nextTimer = scheduleNext();
        return () => clearTimeout(nextTimer);
      }, delay);
    };

    const timer = scheduleNext();
    return () => clearTimeout(timer);
  }, [onRumorEvent]);

  // Auto-scroll to top on new rumor
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = 0;
    }
  }, [rumors.length]);

  const typeIcon = (t: Rumor['type']) => {
    switch (t) {
      case 'whale': return '🐋';
      case 'alpha': return '📊';
      case 'rug': return '🚩';
      case 'dev': return '⚠️';
      case 'kol': return '💬';
    }
  };

  const timeAgo = (d: Date) => {
    const s = Math.floor((Date.now() - d.getTime()) / 1000);
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    return `${Math.floor(s / 3600)}h`;
  };

  return (
    <div style={{
      background: 'var(--bg-1)',
      border: '1px solid var(--border-1)',
      borderRadius: 'var(--r-lg)',
      overflow: 'hidden',
      height: expanded ? 'auto' : 48,
      transition: 'height 0.3s ease',
    }}>
      {/* Header */}
      <div
        onClick={() => setExpanded(p => !p)}
        style={{
          padding: '10px 14px',
          borderBottom: expanded ? '1px solid var(--border-0)' : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--red)', boxShadow: '0 0 6px var(--red)',
            animation: 'pulse 2s infinite',
          }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--t0)', letterSpacing: 0.5 }}>RUMOR MILL</span>
          <span style={{ fontSize: 10, color: 'var(--t3)' }}>Live Alpha Feed</span>
        </div>
        <span style={{ fontSize: 10, color: 'var(--t3)', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
      </div>

      {/* Feed */}
      {expanded && (
        <div ref={feedRef} style={{ maxHeight: 380, overflowY: 'auto', padding: '4px 0' }}>
          {rumors.map((rumor, i) => (
            <div
              key={rumor.id}
              style={{
                padding: '10px 14px',
                borderBottom: i < rumors.length - 1 ? '1px solid var(--border-0)' : 'none',
                animation: i === 0 ? 'fadeIn 0.5s ease' : undefined,
              }}
            >
              <div style={{ display: 'flex', gap: 10 }}>
                {/* Avatar */}
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                  background: rumor.avatar,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12,
                }}>
                  {typeIcon(rumor.type)}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--t0)' }}>{rumor.handle}</span>
                    <span style={{ fontSize: 9, color: 'var(--t3)' }}>• {timeAgo(rumor.timestamp)}</span>
                    <span style={{
                      fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 3, marginLeft: 'auto',
                      color: rumor.sentiment === 'bullish' ? 'var(--green)' : rumor.sentiment === 'bearish' ? 'var(--red)' : 'var(--t2)',
                      background: rumor.sentiment === 'bullish' ? 'var(--green-bg)' : rumor.sentiment === 'bearish' ? 'var(--red-bg)' : 'var(--bg-3)',
                    }}>
                      {rumor.sentiment === 'bullish' ? 'BULLISH' : rumor.sentiment === 'bearish' ? 'BEARISH' : 'NEUTRAL'}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--t1)', lineHeight: 1.5 }}>
                    {rumor.text}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
