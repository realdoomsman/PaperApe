'use client';
import { useState, useEffect, useMemo } from 'react';
import AppShell from '@/components/AppShell';
import { useAuth } from '@/components/AuthContext';
import { apiRequest } from '@/lib/api';

function MiniBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 3 }}>
        <span style={{ fontWeight: 600, color: 'var(--t1)' }}>{label}</span>
        <span className="mono" style={{ color: 'var(--t2)' }}>{value}</span>
      </div>
      <div style={{ height: 6, background: 'var(--bg-2)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.3s' }} />
      </div>
    </div>
  );
}

function SparkLine({ data, width = 200, height = 40, color = 'var(--green)' }: { data: number[]; width?: number; height?: number; color?: string }) {
  if (data.length < 2) return <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: 'var(--t3)' }}>No data yet</div>;
  const min = Math.min(...data); const max = Math.max(...data); const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * (height - 4) - 2}`).join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <defs><linearGradient id="perfFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.12" /><stop offset="100%" stopColor={color} stopOpacity="0.01" /></linearGradient></defs>
      <polygon points={`0,${height} ${pts} ${width},${height}`} fill="url(#perfFill)" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AnalyticsPage() {
  const { token: authToken } = useAuth();
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiRequest('GET', '/trades/history', undefined, authToken || undefined).then(r => {
      if (r.success && r.data?.trades) setTrades(r.data.trades);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [authToken]);

  const stats = useMemo(() => {
    if (trades.length === 0) return null;

    // By token
    const byToken: Record<string, { trades: number; pnl: number; wins: number }> = {};
    trades.forEach(t => {
      const sym = t.token_symbol || 'Unknown';
      if (!byToken[sym]) byToken[sym] = { trades: 0, pnl: 0, wins: 0 };
      byToken[sym].trades++;
      const pnl = parseFloat(t.pnl_sol ?? t.pnl ?? 0);
      byToken[sym].pnl += pnl;
      if (pnl > 0) byToken[sym].wins++;
    });

    // By day of week
    const byDay = Array(7).fill(null).map(() => ({ trades: 0, pnl: 0 }));
    trades.forEach(t => {
      const d = new Date(t.created_at).getDay();
      byDay[d].trades++;
      byDay[d].pnl += parseFloat(t.pnl_sol ?? t.pnl ?? 0);
    });

    // PnL over time (cumulative)
    const sorted = [...trades].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const pnlCurve = [0];
    let running = 0;
    sorted.forEach(t => { running += parseFloat(t.pnl_sol ?? t.pnl ?? 0); pnlCurve.push(running); });

    // Win rate over time (rolling 10)
    const winRateCurve: number[] = [];
    for (let i = 0; i < sorted.length; i++) {
      const window = sorted.slice(Math.max(0, i - 9), i + 1);
      const wins = window.filter(t => parseFloat(t.pnl_sol ?? t.pnl ?? 0) > 0).length;
      winRateCurve.push((wins / window.length) * 100);
    }

    // Best/worst streaks
    let bestStreak = 0, worstStreak = 0, curStreak = 0;
    sorted.forEach(t => {
      const pnl = parseFloat(t.pnl_sol ?? t.pnl ?? 0);
      if (pnl > 0) { curStreak = curStreak > 0 ? curStreak + 1 : 1; bestStreak = Math.max(bestStreak, curStreak); }
      else { curStreak = curStreak < 0 ? curStreak - 1 : -1; worstStreak = Math.min(worstStreak, curStreak); }
    });

    const totalPnl = trades.reduce((s, t) => s + parseFloat(t.pnl_sol ?? t.pnl ?? 0), 0);
    const wins = trades.filter(t => parseFloat(t.pnl_sol ?? t.pnl ?? 0) > 0).length;
    const avgPnl = trades.length > 0 ? totalPnl / trades.length : 0;
    const profitFactor = (() => {
      const grossProfit = trades.reduce((s, t) => { const p = parseFloat(t.pnl_sol ?? t.pnl ?? 0); return p > 0 ? s + p : s; }, 0);
      const grossLoss = Math.abs(trades.reduce((s, t) => { const p = parseFloat(t.pnl_sol ?? t.pnl ?? 0); return p < 0 ? s + p : s; }, 0));
      return grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
    })();

    return { byToken, byDay, pnlCurve, winRateCurve, bestStreak, worstStreak: Math.abs(worstStreak), totalPnl, wins, avgPnl, profitFactor };
  }, [trades]);

  const tokenEntries = stats ? Object.entries(stats.byToken).sort((a, b) => b[1].trades - a[1].trades) : [];
  const maxTrades = Math.max(...tokenEntries.map(([, v]) => v.trades), 1);

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--t0)', margin: 0 }}>Performance Analytics</h1>
          <div style={{ fontSize: 12, color: 'var(--t2)', marginTop: 2 }}>Deep dive into your trading performance</div>
        </div>
        <div className="mono" style={{ fontSize: 11, color: 'var(--t3)' }}>{trades.length} trades analyzed</div>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12 }} />)}
        </div>
      ) : !stats ? (
        <div className="card" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--t1)', marginBottom: 6 }}>No Trading Data Yet</div>
          <div style={{ fontSize: 12, color: 'var(--t3)' }}>Make some trades in the Terminal to see your analytics here</div>
        </div>
      ) : (
        <>
          {/* Key Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
            {[
              { label: 'Total PnL', value: `${stats.totalPnl >= 0 ? '+' : ''}${stats.totalPnl.toFixed(4)}`, sub: 'SOL', cls: stats.totalPnl >= 0 ? 'up' : 'down' },
              { label: 'Win Rate', value: `${trades.length > 0 ? ((stats.wins / trades.length) * 100).toFixed(1) : 0}`, sub: '%', cls: stats.wins / trades.length > 0.5 ? 'up' : 'down' },
              { label: 'Profit Factor', value: stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2), sub: 'ratio', cls: stats.profitFactor >= 1 ? 'up' : 'down' },
              { label: 'Avg PnL/Trade', value: `${stats.avgPnl >= 0 ? '+' : ''}${stats.avgPnl.toFixed(4)}`, sub: 'SOL', cls: stats.avgPnl >= 0 ? 'up' : 'down' },
            ].map(m => (
              <div key={m.label} className="card" style={{ textAlign: 'center', padding: '16px 12px' }}>
                <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{m.label}</div>
                <div className={`mono ${m.cls}`} style={{ fontSize: 18, fontWeight: 700 }}>{m.value}</div>
                <div style={{ fontSize: 9, color: 'var(--t3)' }}>{m.sub}</div>
              </div>
            ))}
          </div>

          {/* Charts Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            <div className="card">
              <div className="card-head"><span className="card-title">Cumulative PnL</span></div>
              <div className="card-pad">
                <SparkLine data={stats.pnlCurve} width={500} height={60} color={stats.totalPnl >= 0 ? 'var(--green)' : 'var(--red)'} />
              </div>
            </div>
            <div className="card">
              <div className="card-head"><span className="card-title">Win Rate Trend (Rolling 10)</span></div>
              <div className="card-pad">
                <SparkLine data={stats.winRateCurve} width={500} height={60} color="var(--cyan)" />
              </div>
            </div>
          </div>

          {/* Streaks + Day of Week */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            <div className="card">
              <div className="card-head"><span className="card-title">Streaks</span></div>
              <div className="card-pad" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--green)' }}>{stats.bestStreak}</div>
                  <div style={{ fontSize: 10, color: 'var(--t2)' }}>Best Win Streak</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--red)' }}>{stats.worstStreak}</div>
                  <div style={{ fontSize: 10, color: 'var(--t2)' }}>Worst Loss Streak</div>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="card-head"><span className="card-title">Trades by Day</span></div>
              <div className="card-pad">
                <div style={{ display: 'flex', gap: 4, height: 60, alignItems: 'flex-end' }}>
                  {stats.byDay.map((d, i) => {
                    const maxD = Math.max(...stats.byDay.map(x => x.trades), 1);
                    return (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <div style={{ width: '100%', background: d.pnl >= 0 ? 'var(--green)' : 'var(--red)', borderRadius: 2, height: `${Math.max((d.trades / maxD) * 40, 2)}px`, opacity: 0.7, transition: 'height 0.3s' }} />
                        <span style={{ fontSize: 8, color: 'var(--t3)', fontWeight: 600 }}>{DAYS[i]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Performance by Token */}
          <div className="card">
            <div className="card-head"><span className="card-title">Performance by Token</span></div>
            <div className="card-pad">
              {tokenEntries.slice(0, 10).map(([sym, data]) => (
                <MiniBar key={sym} label={`${sym} — ${data.trades} trades — ${data.pnl >= 0 ? '+' : ''}${data.pnl.toFixed(4)} SOL — ${((data.wins / data.trades) * 100).toFixed(0)}% W/R`}
                  value={data.trades} max={maxTrades} color={data.pnl >= 0 ? 'var(--green)' : 'var(--red)'} />
              ))}
              {tokenEntries.length === 0 && <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: 'var(--t3)' }}>No token data yet</div>}
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
