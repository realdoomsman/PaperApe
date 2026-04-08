'use client';
import { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/components/AuthContext';

interface LBEntry { rank: number; username: string; total_pnl: number; win_rate: number; total_trades: number; id: string; badge?: string; paper_balance?: number; }

const TIERS = [
  { min: 20, label: 'Legendary' },
  { min: 10, label: 'Diamond' },
  { min: 5, label: 'Gold' },
  { min: 0, label: 'Silver' },
];
function getTier(pnl: number) { return (TIERS.find(t => pnl >= t.min) ?? TIERS[TIERS.length - 1]).label; }

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'weekly' | 'monthly' | 'alltime'>('weekly');
  const [entries, setEntries] = useState<LBEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedRank, setCopiedRank] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    apiRequest('GET', `/leaderboard/${tab}`).then(r => {
      if (r.success && r.data?.rankings) setEntries(r.data.rankings);
      setLoading(false);
    });
  }, [tab]);

  const userEntry = entries.find(e => user?.uid && e.id?.includes(user.uid));

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--t0)', margin: 0 }}>Leaderboard</h1>
          <div style={{ fontSize: 12, color: 'var(--t2)', marginTop: 2 }}>Top paper traders ranked by PnL</div>
        </div>
        {userEntry && <div style={{ padding: '5px 12px', borderRadius: 'var(--r-sm)', background: 'var(--accent-bg)', border: '1px solid var(--accent-glow)', fontSize: 12, color: 'var(--accent-l)', fontWeight: 600 }}>Your Rank: #{userEntry.rank}</div>}
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
        <button className={`preset ${tab === 'weekly' ? 'on' : ''}`} onClick={() => setTab('weekly')} style={{ padding: '6px 16px', fontSize: 12 }}>Weekly</button>
        <button className={`preset ${tab === 'monthly' ? 'on' : ''}`} onClick={() => setTab('monthly')} style={{ padding: '6px 16px', fontSize: 12 }}>Monthly</button>
        <button className={`preset ${tab === 'alltime' ? 'on' : ''}`} onClick={() => setTab('alltime')} style={{ padding: '6px 16px', fontSize: 12 }}>All Time</button>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.12)', borderRadius: 8 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></svg>
          <span className="mono" style={{ fontSize: 10, fontWeight: 700, color: 'var(--gold)' }}>Prize: Paper Bragging Rights</span>
        </div>
      </div>

      {/* Top 3 */}
      {entries.length >= 3 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
          {entries.slice(0, 3).map(e => (
            <div key={e.rank} style={{ background: 'var(--bg-1)', border: `1px solid ${e.rank === 1 ? 'var(--accent-glow)' : 'var(--border-1)'}`, borderRadius: 'var(--r-lg)', textAlign: 'center', padding: '18px 12px', position: 'relative' }}>
              {e.rank === 1 && <div style={{ position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)', fontSize: 18 }}>👑</div>}
              {e.rank === 1 && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'var(--accent)', borderRadius: 'var(--r-lg) var(--r-lg) 0 0' }} />}
              <div style={{ fontSize: 24, fontWeight: 800, color: e.rank === 1 ? 'var(--accent-l)' : e.rank === 2 ? 'var(--t1)' : 'var(--gold)', marginBottom: 4 }}>
                {e.rank === 1 ? '🥇' : e.rank === 2 ? '🥈' : '🥉'} #{e.rank}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--t0)' }}>{e.username}</div>
              {e.badge === 'HIMOTHY' && <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--accent-l)', background: 'var(--accent-bg)', border: '1px solid var(--accent-glow)', padding: '2px 8px', borderRadius: 'var(--r-sm)', letterSpacing: 1, marginTop: 4, display: 'inline-block' }}>HIMOTHY</div>}
              {!e.badge && <div style={{ fontSize: 10, color: 'var(--t2)', marginTop: 2, marginBottom: 8 }}>{getTier(e.total_pnl)}</div>}
              <div className={`mono ${e.total_pnl >= 0 ? 'up' : 'down'}`} style={{ fontWeight: 700, fontSize: 15 }}>
                {e.total_pnl >= 0 ? '+' : ''}{e.total_pnl.toFixed(4)} SOL
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 8 }}>
                <span className="mono" style={{ fontSize: 10, color: 'var(--t2)' }}>{e.win_rate.toFixed(0)}% W/R</span>
                <span className="mono" style={{ fontSize: 10, color: 'var(--t2)' }}>{e.total_trades} trades</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full rankings */}
      <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border-1)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '50px 1.5fr 1fr 0.6fr 0.6fr 40px', padding: '8px 14px', borderBottom: '1px solid var(--border-0)', fontSize: 10, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          <span>Rank</span><span>Trader</span><span>PnL</span><span>W/R</span><span>Trades</span><span></span>
        </div>
        {loading && (
          <div style={{ padding: '4px 0' }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '50px 1.5fr 1fr 0.6fr 0.6fr 40px', padding: '12px 14px', borderBottom: '1px solid var(--border-0)', alignItems: 'center', gap: 8 }}>
                <div className="skeleton" style={{ height: 14, width: 30 }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="skeleton" style={{ width: 26, height: 26, borderRadius: '50%' }} />
                  <div>
                    <div className="skeleton skel-text" style={{ width: 80 + Math.random() * 40 }} />
                    <div className="skeleton skel-text short" style={{ width: 40 }} />
                  </div>
                </div>
                <div className="skeleton skel-text" style={{ width: 60 }} />
                <div className="skeleton skel-text short" style={{ width: 35 }} />
                <div className="skeleton skel-text short" style={{ width: 25 }} />
              </div>
            ))}
          </div>
        )}
        {!loading && entries.map(e => {
          const isMe = userEntry?.id === e.id;
          return (
            <div key={e.rank} style={{ display: 'grid', gridTemplateColumns: '50px 1.5fr 1fr 0.6fr 0.6fr 40px', padding: '10px 14px', borderBottom: '1px solid var(--border-0)', alignItems: 'center', fontSize: 12, background: isMe ? 'var(--accent-bg)' : undefined, borderLeft: isMe ? '3px solid var(--accent)' : undefined }}>
              <span className="mono" style={{ fontWeight: 700, color: e.rank <= 3 ? 'var(--accent-l)' : 'var(--t2)' }}>#{e.rank}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--t1)' }}>{e.username?.slice(0, 2).toUpperCase()}</div>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--t0)' }}>{e.username}{isMe && <span style={{ marginLeft: 6, fontSize: 9, color: 'var(--accent-l)', fontWeight: 700 }}>YOU</span>}{e.badge === 'HIMOTHY' && <span style={{ marginLeft: 6, fontSize: 9, color: 'var(--accent-l)', fontWeight: 800, background: 'var(--accent-bg)', padding: '1px 6px', borderRadius: 4, letterSpacing: 0.5 }}>HIMOTHY</span>}</div>
                  <div style={{ fontSize: 10, color: 'var(--t2)' }}>{getTier(e.total_pnl)}</div>
                </div>
              </div>
              <span className={`mono ${e.total_pnl >= 0 ? 'up' : 'down'}`} style={{ fontWeight: 600 }}>{e.total_pnl >= 0 ? '+' : ''}{e.total_pnl.toFixed(4)}</span>
              <span className="mono" style={{ color: 'var(--t1)' }}>{e.win_rate.toFixed(1)}%</span>
              <span className="mono" style={{ color: 'var(--t2)' }}>{e.total_trades}</span>
              <button className="haptic" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: copiedRank === e.rank ? 'var(--green)' : 'var(--t3)', padding: 2 }}
                title="Share rank"
                onClick={() => { navigator.clipboard.writeText(`🏆 ${e.username} is ranked #${e.rank} on PaperApe! PnL: ${e.total_pnl >= 0 ? '+' : ''}${e.total_pnl.toFixed(4)} SOL | W/R: ${e.win_rate.toFixed(0)}% | paperape.io`); setCopiedRank(e.rank); setTimeout(() => setCopiedRank(null), 2000); }}>
                {copiedRank === e.rank ? '✓' : '📋'}
              </button>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
