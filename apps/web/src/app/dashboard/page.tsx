'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import AppShell from '@/components/AppShell';
import { useAuth } from '@/components/AuthContext';
import { useMode } from '@/components/ModeContext';
import { apiRequest } from '@/lib/api';
import { CURRICULUM, getAllLessons } from '@/lib/curriculum';

// Mini SVG sparkline component
function Sparkline({ data, width = 280, height = 60, color = 'var(--green)' }: { data: number[]; width?: number; height?: number; color?: string }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  const fillPoints = `0,${height} ${points} ${width},${height}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={fillPoints} fill="url(#sparkFill)" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const ShareCard = dynamic(() => import('@/components/ShareCard'), { ssr: false });

interface TrendingToken {
  address: string;
  symbol: string;
  name: string;
  priceUsd: number;
  priceSol: number;
  priceChange24h: number;
  volume24h: number;
  liquidity: number;
  marketCap: number;
  image: string | null;
}

function fmtMcap(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  if (n > 0) return `${n.toFixed(0)}`;
  return '-';
}

function fmtVol(n: number): string {
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return n > 0 ? `$${n.toFixed(0)}` : '-';
}

export default function DashboardPage() {
  const { mode } = useMode();
  const { user, token: authToken } = useAuth();
  const [balance, setBalance] = useState(100);
  const [positions, setPositions] = useState<any[]>([]);
  const [trades, setTrades] = useState<any[]>([]);
  const [trendingTokens, setTrendingTokens] = useState<TrendingToken[]>([]);
  const [showFlex, setShowFlex] = useState(false);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());

  // Fetch user data
  useEffect(() => {
    if (!authToken) return;
    // Fetch balance from /auth/me
    apiRequest('GET', '/auth/me', undefined, authToken).then(r => {
      if (r.success && r.data?.user) {
        setBalance(parseFloat(r.data.user.paper_balance ?? 100));
      }
    }).catch(() => {});
    // Fetch positions from correct endpoint
    apiRequest('GET', '/trades/positions?status=open', undefined, authToken).then(r => {
      if (r.success && r.data?.positions) {
        setPositions(r.data.positions);
      }
    }).catch(() => {});
    // Fetch trade history
    apiRequest('GET', '/trades/history', undefined, authToken).then(r => {
      if (r.success && r.data?.trades) {
        setTrades(r.data.trades);
      }
    }).catch(() => {});
  }, [authToken]);

  // Fetch trending tokens from API (real data)
  useEffect(() => {
    apiRequest('GET', '/tokens/trending').then(r => {
      if (r.success && r.data?.tokens) {
        setTrendingTokens(r.data.tokens.slice(0, 8));
      }
    }).catch(() => {});
  }, []);

  // Fetch academy progress
  useEffect(() => {
    if (!authToken) return;
    apiRequest('GET', '/academy/progress', undefined, authToken).then(r => {
      if (r.success && r.data?.completed_lessons) {
        setCompletedLessons(new Set(r.data.completed_lessons));
      }
    }).catch(() => {
      const s = localStorage.getItem('pa-academy');
      if (s) try { setCompletedLessons(new Set(JSON.parse(s))); } catch {}
    });
  }, [authToken]);

  const totalPnl = positions.reduce((s: number, p: any) => s + parseFloat(String(p.pnl_sol ?? p.pnl ?? 0)), 0);
  const winRate = trades.length > 0 ? Math.round((trades.filter((t: any) => parseFloat(String(t.pnl_sol ?? t.pnl ?? 0)) > 0).length / trades.length) * 100) : 0;
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Trader';

  // Calculate trading streak
  const streak = (() => {
    let count = 0;
    const sorted = [...trades].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    for (const t of sorted) {
      const pnl = parseFloat(String(t.pnl_sol ?? t.pnl ?? 0));
      if (count === 0) {
        count = pnl >= 0 ? 1 : -1;
      } else if ((count > 0 && pnl >= 0) || (count < 0 && pnl < 0)) {
        count += count > 0 ? 1 : -1;
      } else break;
    }
    return count;
  })();

  // Build equity curve from trade history
  const equityCurve = (() => {
    const curve = [100]; // starting balance
    const sorted = [...trades].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    let running = 100;
    for (const t of sorted) {
      const pnl = parseFloat(String(t.pnl_sol ?? t.pnl ?? 0));
      running += pnl;
      curve.push(running);
    }
    if (curve.length === 1) curve.push(balance); // at least 2 points
    return curve;
  })();

  // Best/worst trade
  const bestTrade = trades.length > 0 ? Math.max(...trades.map((t: any) => parseFloat(String(t.pnl_sol ?? t.pnl ?? 0)))) : 0;
  const worstTrade = trades.length > 0 ? Math.min(...trades.map((t: any) => parseFloat(String(t.pnl_sol ?? t.pnl ?? 0)))) : 0;
  const avgHoldTime = trades.length > 0 ? 'N/A' : '-';

  const allLessons = getAllLessons();
  const academyPct = allLessons.length > 0 ? Math.round((completedLessons.size / allLessons.length) * 100) : 0;
  const nextLesson = allLessons.find(l => !completedLessons.has(l.id));

  return (
    <AppShell balance={balance}>
      {showFlex && (
        <ShareCard
          tokenSymbol="PORTFOLIO"
          pnlPercent={balance > 100 ? ((balance - 100) / 100) * 100 : ((balance - 100) / 100) * 100}
          pnlSol={totalPnl}
          entryPrice={100}
          investedSol={100}
          isOpen={true}
          onClose={() => setShowFlex(false)}
        />
      )}

      {/* Greeting */}
      <div style={{ marginBottom: 20 }} className="an">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--t0)', letterSpacing: -0.5 }}>
              Welcome back, <span style={{ color: 'var(--green)' }}>{displayName}</span>
            </h1>
            <p style={{ fontSize: 13, color: 'var(--t3)', marginTop: 4 }}>
              {mode === 'beginner'
                ? 'Your paper trading dashboard. No real money -- learn to trade risk-free.'
                : `Portfolio overview. ${positions.length} open positions.`}
            </p>
          </div>
          <button className="btn haptic" style={{ background: 'linear-gradient(135deg, rgba(0,255,136,0.08), rgba(59,130,246,0.08))', border: '1px solid rgba(0,255,136,0.1)', color: 'var(--green)', fontWeight: 700, fontSize: 12 }}
            onClick={() => setShowFlex(true)}>
            Share / Flex
          </button>
        </div>
      </div>

      {/* Stats Strip */}
      <div className="stats-row an an1">
        <div className="stat-card" style={{ borderColor: 'rgba(0,255,136,0.08)' }}>
          <div className="stat-label">Portfolio Value</div>
          <div className="stat-val mono">{balance.toFixed(mode === 'pro' ? 4 : 2)} <span style={{ fontSize: 12, color: 'var(--t3)' }}>SOL</span></div>
          <div className="stat-sub">Starting: 100.00 SOL</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total PnL</div>
          <div className={`stat-val mono ${totalPnl >= 0 ? 'up' : 'down'}`}>
            {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(4)}
          </div>
          <div className="stat-sub">{totalPnl >= 0 ? 'Profit' : 'Loss'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Trades</div>
          <div className="stat-val mono">{trades.length}</div>
          <div className="stat-sub">Lifetime trades</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Win Rate</div>
          <div className="stat-val mono">{winRate}<span style={{ fontSize: 14, color: 'var(--t3)' }}>%</span></div>
          <div className="stat-bar"><div className="stat-bar-fill" style={{ width: `${winRate}%`, background: winRate > 50 ? 'var(--green)' : 'var(--red)' }} /></div>
        </div>
      </div>

      {/* Equity Chart + Streak */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }} className="an an1">
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="card-head">
            <span className="card-title">Portfolio Equity</span>
            <span className={`mono ${balance >= 100 ? 'up' : 'down'}`} style={{ fontSize: 12, fontWeight: 700 }}>
              {balance >= 100 ? '+' : ''}{((balance - 100) / 100 * 100).toFixed(1)}%
            </span>
          </div>
          <div style={{ padding: '8px 14px 14px' }}>
            <Sparkline data={equityCurve} width={500} height={70} color={balance >= 100 ? 'var(--green)' : 'var(--red)'} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 9, color: 'var(--t3)' }}>
              <span>Start: 100 SOL</span>
              <span className="mono" style={{ fontWeight: 600, color: balance >= 100 ? 'var(--green)' : 'var(--red)' }}>Now: {balance.toFixed(2)} SOL</span>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-head">
            <span className="card-title">Trading Stats</span>
          </div>
          <div className="card-pad">
            {/* Streak */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: streak > 0 ? 'var(--green)' : streak < 0 ? 'var(--red)' : 'var(--t3)' }}>
                {Math.abs(streak)}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: streak > 0 ? 'var(--green)' : streak < 0 ? 'var(--red)' : 'var(--t3)' }}>
                  {streak > 0 ? '🔥 Win Streak' : streak < 0 ? '❄️ Loss Streak' : 'No streak'}
                </div>
                <div style={{ fontSize: 10, color: 'var(--t3)' }}>Consecutive {streak > 0 ? 'wins' : streak < 0 ? 'losses' : '-'}</div>
              </div>
            </div>
            {/* Mini stats grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div style={{ padding: '8px 10px', background: 'var(--bg-2)', borderRadius: 6 }}>
                <div style={{ fontSize: 9, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Best Trade</div>
                <div className="mono up" style={{ fontSize: 13, fontWeight: 700 }}>{bestTrade > 0 ? '+' : ''}{bestTrade.toFixed(4)}</div>
              </div>
              <div style={{ padding: '8px 10px', background: 'var(--bg-2)', borderRadius: 6 }}>
                <div style={{ fontSize: 9, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Worst Trade</div>
                <div className="mono down" style={{ fontSize: 13, fontWeight: 700 }}>{worstTrade.toFixed(4)}</div>
              </div>
              <div style={{ padding: '8px 10px', background: 'var(--bg-2)', borderRadius: 6 }}>
                <div style={{ fontSize: 9, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Open Positions</div>
                <div className="mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--t0)' }}>{positions.length}</div>
              </div>
              <div style={{ padding: '8px 10px', background: 'var(--bg-2)', borderRadius: 6 }}>
                <div style={{ fontSize: 9, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Avg Hold</div>
                <div className="mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--t0)' }}>{avgHoldTime}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Portfolio Allocation Bar */}
      {positions.length > 0 && (
        <div className="card an an1" style={{ marginBottom: 14 }}>
          <div className="card-head">
            <span className="card-title">Portfolio Allocation</span>
          </div>
          <div className="card-pad">
            {(() => {
              const ALLOC_COLORS = ['#4ade80', '#22d3ee', '#facc15', '#f87171', '#c084fc', '#fb923c', '#60a5fa'];
              const posAllocations = positions.map((p: any, i: number) => ({
                label: p.token_symbol || p.symbol || 'TK',
                value: parseFloat(p.amount_sol ?? p.amount ?? 0),
                color: ALLOC_COLORS[i % ALLOC_COLORS.length],
              }));
              const cashVal = balance - posAllocations.reduce((s: number, a: any) => s + a.value, 0);
              const all = [{ label: 'Cash', value: Math.max(0, cashVal), color: 'var(--t3)' }, ...posAllocations];
              const total = all.reduce((s, a) => s + a.value, 0) || 1;
              return (
                <>
                  <div style={{ height: 20, display: 'flex', borderRadius: 10, overflow: 'hidden', gap: 1.5, marginBottom: 10 }}>
                    {all.filter(a => a.value > 0).map(a => (
                      <div key={a.label} style={{ flex: a.value / total, background: a.color, minWidth: 4, borderRadius: 2, transition: 'flex 0.3s' }} title={`${a.label}: ${a.value.toFixed(2)} SOL (${(a.value / total * 100).toFixed(1)}%)`} />
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {all.filter(a => a.value > 0).map(a => (
                      <div key={a.label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: a.color }} />
                        <span style={{ fontWeight: 600, color: 'var(--t1)' }}>{a.label}</span>
                        <span className="mono" style={{ color: 'var(--t3)' }}>{(a.value / total * 100).toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: mode === 'pro' ? '1fr 380px' : '1fr', gap: 14 }} className="an an2">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Open Positions */}
          <div className="card">
            <div className="card-head">
              <span className="card-title">Open Positions</span>
              <span className="mono" style={{ fontSize: 11, color: 'var(--t3)' }}>{positions.length}</span>
            </div>
            {positions.length === 0 ? (
              <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--t1)', marginBottom: 6 }}>No Open Trades</div>
                <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 18 }}>Go to the Terminal to make your first paper trade.</div>
                <Link href="/terminal" className="btn primary haptic">Start Trading</Link>
              </div>
            ) : (
              <div>
                {positions.map((p: any, i: number) => (
                  <div key={p.id || i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: '1px solid var(--border-0)' }}>
                    {p.token_image ? (
                      <img src={p.token_image} alt={p.token_symbol} style={{ width: 32, height: 32, borderRadius: 8 }} />
                    ) : (
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--t2)' }}>
                        {(p.token_symbol || p.symbol || 'TK').slice(0, 2)}
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t0)' }}>{p.token_symbol || p.symbol || 'Token'}</div>
                      <div className="mono" style={{ fontSize: 11, color: 'var(--t3)' }}>{parseFloat(p.amount_sol ?? p.amount ?? 0).toFixed(4)} SOL</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className={`mono ${(p.pnl_percent ?? p.pnl ?? 0) >= 0 ? 'up' : 'down'}`} style={{ fontSize: 13, fontWeight: 700 }}>
                        {(p.pnl_percent ?? 0) >= 0 ? '+' : ''}{(p.pnl_percent ?? 0).toFixed(1)}%
                      </div>
                      <div className="mono" style={{ fontSize: 10, color: 'var(--t3)' }}>
                        {(p.pnl_sol ?? p.pnl ?? 0) >= 0 ? '+' : ''}{parseFloat(String(p.pnl_sol ?? p.pnl ?? 0)).toFixed(4)} SOL
                      </div>
                    </div>
                    <Link href={`/terminal?ca=${p.token_address}`} className="btn haptic" style={{ padding: '5px 12px', fontSize: 10 }}>View</Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Trending Tokens (REAL DATA from API) */}
          <div className="card">
            <div className="card-head">
              <span className="card-title">Trending Tokens</span>
              <Link href="/discover" style={{ fontSize: 11, fontWeight: 600, color: 'var(--green)' }}>View All</Link>
            </div>
            {trendingTokens.length === 0 ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--t3)', fontSize: 12 }}>Loading trending tokens...</div>
            ) : mode === 'beginner' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8, padding: 12 }}>
                {trendingTokens.slice(0, 6).map(tk => (
                  <Link key={tk.address} href={`/terminal?ca=${tk.address}`} className="haptic"
                    style={{ padding: 14, background: 'var(--bg-2)', border: '1px solid var(--border-0)', borderRadius: 12, transition: 'all 0.2s', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      {tk.image ? (
                        <img src={tk.image} alt={tk.symbol} style={{ width: 22, height: 22, borderRadius: '50%' }} />
                      ) : (
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: 'var(--t2)' }}>{tk.symbol.slice(0, 2)}</div>
                      )}
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--t0)' }}>{tk.symbol}</div>
                    </div>
                    <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: 'var(--t0)', marginBottom: 2 }}>{fmtMcap(tk.marketCap)}</div>
                    <div style={{ fontSize: 10, color: 'var(--t3)', marginBottom: 4 }}>MCap</div>
                    <div className={`mono ${tk.priceChange24h >= 0 ? 'up' : 'down'}`} style={{ fontSize: 11, fontWeight: 600 }}>{tk.priceChange24h >= 0 ? '+' : ''}{tk.priceChange24h.toFixed(1)}%</div>
                  </Link>
                ))}
              </div>
            ) : (
              <table className="tbl">
                <thead><tr><th>Token</th><th>MCap</th><th>24h</th><th>Volume</th><th></th></tr></thead>
                <tbody>
                  {trendingTokens.map(tk => (
                    <tr key={tk.address} onClick={() => window.location.href = `/terminal?ca=${tk.address}`} style={{ cursor: 'pointer' }}>
                      <td>
                        <div className="tk">
                          {tk.image ? (
                            <img src={tk.image} alt={tk.symbol} style={{ width: 26, height: 26, borderRadius: '50%' }} />
                          ) : (
                            <div className="tk-img">{tk.symbol.slice(0, 2)}</div>
                          )}
                          <div><div className="tk-name">{tk.symbol}</div><div className="tk-addr">{tk.name}</div></div>
                        </div>
                      </td>
                      <td className="mono" style={{ fontWeight: 600, color: 'var(--t0)' }}>{fmtMcap(tk.marketCap)}</td>
                      <td className={`mono ${tk.priceChange24h >= 0 ? 'up' : 'down'}`} style={{ fontWeight: 600 }}>{tk.priceChange24h >= 0 ? '+' : ''}{tk.priceChange24h.toFixed(1)}%</td>
                      <td className="mono" style={{ color: 'var(--t2)' }}>{fmtVol(tk.volume24h)}</td>
                      <td><Link href={`/terminal?ca=${tk.address}`} className="btn haptic" style={{ padding: '4px 10px', fontSize: 10, color: 'var(--green)', background: 'var(--green-bg)', border: '1px solid rgba(0,255,136,0.08)' }}>Trade</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right column — Pro sidebar */}
        {mode === 'pro' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Academy Progress */}
            <div className="card">
              <div className="card-head">
                <span className="card-title">Academy Progress</span>
                <Link href="/learn" style={{ fontSize: 11, fontWeight: 600, color: 'var(--cyan)' }}>{academyPct}%</Link>
              </div>
              <div className="card-pad">
                <div className="stat-bar" style={{ marginBottom: 10 }}>
                  <div className="stat-bar-fill" style={{ width: `${academyPct}%`, background: 'linear-gradient(90deg, var(--green), var(--cyan))' }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--t2)', marginBottom: 8 }}>
                  {completedLessons.size}/{allLessons.length} lessons complete
                </div>
                {nextLesson && (
                  <Link href="/learn" className="haptic" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--bg-2)', borderRadius: 8, border: '1px solid var(--border-0)' }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(0,200,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'var(--cyan)' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t0)' }}>Next: {nextLesson.title}</div>
                      <div style={{ fontSize: 10, color: 'var(--t3)' }}>+{nextLesson.reward} SOL reward</div>
                    </div>
                  </Link>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="card">
              <div className="card-head"><span className="card-title">Quick Actions</span></div>
              <div style={{ padding: 6 }}>
                {[
                  { href: '/terminal', label: 'Open Terminal', desc: 'Trade any Solana token', color: 'var(--green)' },
                  { href: '/discover', label: 'Discover Tokens', desc: 'Browse trending memecoins', color: 'var(--accent-l)' },
                  { href: '/leaderboard', label: 'Leaderboard', desc: 'Check your ranking', color: 'var(--gold)' },
                  { href: '/learn', label: 'Academy', desc: 'Learn trading strategies', color: 'var(--cyan)' },
                ].map(a => (
                  <Link key={a.href} href={a.href} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', borderRadius: 10, transition: 'all 0.15s', cursor: 'pointer' }}
                    className="haptic">
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: `color-mix(in srgb, ${a.color} 8%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: a.color }}>
                      {a.label[0]}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t0)' }}>{a.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--t3)' }}>{a.desc}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Trader Tier */}
            <div className="card" style={{ borderColor: 'rgba(251,191,36,0.08)', background: 'linear-gradient(135deg, rgba(11,13,18,0.95), rgba(30,25,10,0.15))' }}>
              <div className="card-pad">
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--gold)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Trader Tier</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--t0)', marginBottom: 4 }}>
                  {balance >= 1000 ? 'HIMOTHY' : balance >= 500 ? 'Diamond Hands' : balance >= 200 ? 'Paper Veteran' : 'Fresh Ape'}
                </div>
                <div className="mono" style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 12 }}>
                  {balance.toFixed(2)} / {balance >= 1000 ? '---' : balance >= 500 ? '1000' : balance >= 200 ? '500' : '200'} SOL
                </div>
                <div className="stat-bar"><div className="stat-bar-fill" style={{ width: `${Math.min(100, (balance / (balance >= 1000 ? balance : balance >= 500 ? 1000 : balance >= 200 ? 500 : 200)) * 100)}%`, background: 'var(--gold)' }} /></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Beginner-only CTA */}
      {mode === 'beginner' && (
        <div className="an an3" style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Link href="/terminal" className="haptic" style={{
            padding: '22px 24px', borderRadius: 16, background: 'linear-gradient(135deg, rgba(0,255,136,0.08), rgba(0,255,136,0.02))',
            border: '1px solid rgba(0,255,136,0.1)', transition: 'all 0.2s', cursor: 'pointer'
          }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--green)', marginBottom: 4 }}>Start Trading</div>
            <div style={{ fontSize: 12, color: 'var(--t2)' }}>Search any Solana token and make a paper trade</div>
          </Link>
          <Link href="/learn" className="haptic" style={{
            padding: '22px 24px', borderRadius: 16, background: 'linear-gradient(135deg, rgba(0,200,255,0.06), rgba(0,200,255,0.02))',
            border: '1px solid rgba(0,200,255,0.08)', transition: 'all 0.2s', cursor: 'pointer'
          }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--cyan)', marginBottom: 4 }}>Academy</div>
            <div style={{ fontSize: 12, color: 'var(--t2)' }}>{completedLessons.size}/{allLessons.length} lessons · earn SOL rewards</div>
          </Link>
        </div>
      )}
    </AppShell>
  );
}
