'use client';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { useMode } from '@/components/ModeContext';
import { IconWallet, IconChart, IconActivity, IconTarget, IconBox, IconCompass, IconTerminal, IconChevronRight, IconTrendingUp, IconArrowUp, IconArrowDown, IconZap, IconGraduationCap, IconShield } from '@/components/Icons';
import { apiRequest } from '@/lib/api';
import { formatSol, formatPercent, truncateAddress } from '@paperape/shared';
import type { Position } from '@paperape/shared';

/* ── Watchlist tokens (would be from API in prod) ── */
const TOKENS = [
  { sym: 'BONK', price: 0.00002341, chg: 12.4, vol: '8.2M', mcap: '1.4B' },
  { sym: 'WIF', price: 2.87, chg: -3.1, vol: '24.1M', mcap: '2.8B' },
  { sym: 'POPCAT', price: 0.891, chg: 8.7, vol: '5.6M', mcap: '870M' },
  { sym: 'MYRO', price: 0.142, chg: 18.5, vol: '3.1M', mcap: '142M' },
  { sym: 'BOME', price: 0.00834, chg: -7.2, vol: '1.8M', mcap: '82M' },
];

function Sparkline({ data }: { data: number[] }) {
  const mx = Math.max(...data), mn = Math.min(...data);
  const w = 80, h = 28;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - mn) / (mx - mn || 1)) * h}`).join(' ');
  const up = data[data.length - 1] >= data[0];
  return <svg width={w} height={h} style={{ display: 'block' }}><polyline points={pts} fill="none" stroke={up ? 'var(--green)' : 'var(--red)'} strokeWidth="1.5" /></svg>;
}

export default function DashboardPage() {
  const { mode } = useMode();
  const [positions, setPositions] = useState<Position[]>([]);
  const [balance, setBalance] = useState(100);
  const [totalPnl, setTotalPnl] = useState(0);
  const [totalTrades, setTotalTrades] = useState(0);
  const [winRate, setWinRate] = useState(0);

  useEffect(() => { loadData(); }, []);
  async function loadData() {
    const token = 'mock-dev-token';
    const u = await apiRequest('GET', '/auth/me', undefined, token);
    if (u.success && u.data?.user) { setBalance(parseFloat(u.data.user.paper_balance)); setTotalPnl(parseFloat(u.data.user.total_pnl ?? 0)); }
    const p = await apiRequest('GET', '/trades/positions', undefined, token);
    if (p.success && p.data?.positions) {
      setPositions(p.data.positions); setTotalTrades(p.data.positions.length);
      const w = p.data.positions.filter((x: Position) => parseFloat(String(x.pnl_sol)) > 0).length;
      setWinRate(p.data.positions.length > 0 ? (w / p.data.positions.length) * 100 : 0);
    }
  }

  const open = positions.filter((p) => p.status === 'open');
  const closed = positions.filter((p) => p.status === 'closed');
  const hasTraded = totalTrades > 0;

  // Simulated sparkline data per token
  const sparklines = useMemo(() => TOKENS.map(() => Array.from({ length: 20 }, (_, i) => 50 + Math.sin(i * 0.5) * 20 + (Math.random() - 0.5) * 15)), []);

  return (
    <AppShell balance={balance}>
      <div className="ptop">
        <div><h1>Dashboard</h1><div className="ptop-desc">Portfolio overview and active positions</div></div>
        <div className="ptop-right"><div className="chip"><span className="chip-dot" />Mock Mode</div></div>
      </div>

      {/* Stats */}
      <div className="stats an">
        <div className="stat tip" data-tip="Your current paper SOL balance">
          <div className="stat-label"><IconWallet /> Balance</div>
          <div className="stat-val">{formatSol(balance)}</div>
          <div className="stat-sub">SOL</div>
        </div>
        <div className="stat tip" data-tip="Total profit and loss across all trades">
          <div className="stat-label"><IconChart /> Total PnL</div>
          <div className={`stat-val ${totalPnl >= 0 ? 'up' : 'down'}`}>{totalPnl >= 0 ? '+' : ''}{formatSol(totalPnl)}</div>
          <div className="stat-sub">SOL</div>
        </div>
        <div className="stat tip" data-tip="Number of executed trades">
          <div className="stat-label"><IconActivity /> Trades</div>
          <div className="stat-val">{totalTrades}</div>
        </div>
        <div className="stat tip" data-tip="Percentage of profitable trades">
          <div className="stat-label"><IconTarget /> Win Rate</div>
          <div className={`stat-val ${winRate >= 50 ? 'up' : winRate > 0 ? 'down' : ''}`}>{winRate.toFixed(1)}%</div>
        </div>
      </div>

      {/* Main content grid */}
      <div className="dash-grid an an1">
        <div className="dash-main">
          {/* Open Positions */}
          <div className="panel">
            <div className="panel-head">
              <div className="panel-title"><IconBox /> Open Positions</div>
              <span className="panel-count">{open.length}</span>
            </div>
            <div className="panel-body">
              {open.length === 0 ? (
                <div style={{ padding: '40px 24px', textAlign: 'center' }}>
                  <div className="panel-empty-icn"><IconBox /></div>
                  <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--t1)', margin: '12px 0 6px' }}>No open positions</h4>
                  <p style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 16 }}>Open your first trade using the Terminal or Chrome Extension</p>
                  <Link href="/terminal" className="btn primary" style={{ display: 'inline-flex' }}><IconTerminal style={{ width: 14, height: 14 }} /> Open Terminal</Link>
                </div>
              ) : (
                <table className="tbl">
                  <thead><tr><th>Token</th><th>Entry</th><th>Amount</th><th>PnL</th><th>Action</th></tr></thead>
                  <tbody>{open.map((pos) => {
                    const pnl = parseFloat(String(pos.pnl_percent));
                    return <tr key={pos.id}>
                      <td><div className="tk"><div className="tk-img">{pos.token_symbol?.slice(0,2)}</div><div><div className="tk-name">{pos.token_symbol}</div><div className="tk-addr">{truncateAddress(pos.token_address)}</div></div></div></td>
                      <td className="mono" style={{ fontSize: 12, color: 'var(--t2)' }}>{parseFloat(String(pos.entry_price)) < 0.001 ? parseFloat(String(pos.entry_price)).toExponential(2) : parseFloat(String(pos.entry_price)).toFixed(6)}</td>
                      <td className="mono">{formatSol(parseFloat(String(pos.amount_sol)))} SOL</td>
                      <td className={`mono bold ${pnl >= 0 ? 'up' : 'down'}`}>{formatPercent(pnl)}</td>
                      <td><button className="quick-buy" style={{ color: 'var(--red)', background: 'var(--red-bg)', borderColor: 'rgba(255,68,102,0.1)' }}>Sell</button></td>
                    </tr>;
                  })}</tbody>
                </table>
              )}
            </div>
          </div>

          {/* Market Overview / Watchlist */}
          <div className="panel">
            <div className="panel-head">
              <div className="panel-title"><IconTrendingUp /> Market</div>
              <Link href="/discover" style={{ fontSize: 11, color: 'var(--accent-l)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>View All <IconChevronRight style={{ width: 12, height: 12 }} /></Link>
            </div>
            <div className="panel-body">
              <table className="tbl">
                <thead><tr><th>Token</th><th>Price</th><th>24h</th><th>Volume</th><th style={{ width: 90 }}>Chart</th></tr></thead>
                <tbody>{TOKENS.map((t, i) => (
                  <tr key={t.sym}>
                    <td><div className="tk"><div className="tk-img">{t.sym.slice(0,2)}</div><div className="tk-name">{t.sym}</div></div></td>
                    <td className="mono" style={{ color: 'var(--t0)', fontWeight: 600 }}>{t.price < 0.01 ? t.price.toFixed(8) : '$' + t.price.toFixed(2)}</td>
                    <td className={`mono bold ${t.chg >= 0 ? 'up' : 'down'}`}>{t.chg >= 0 ? '+' : ''}{t.chg.toFixed(1)}%</td>
                    <td className="mono" style={{ color: 'var(--t2)' }}>${t.vol}</td>
                    <td><Sparkline data={sparklines[i]} /></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="dash-side">
          {/* Quick Actions */}
          <div className="panel">
            <div className="panel-head"><div className="panel-title"><IconZap /> Quick Actions</div></div>
            <div className="panel-pad" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '16px' }}>
              <Link href="/terminal" className="dash-action"><IconTerminal style={{ width: 16, height: 16, color: 'var(--green)' }} /><div><div style={{ fontWeight: 600, color: 'var(--t0)', fontSize: 13 }}>Paper Trade</div><div style={{ fontSize: 11, color: 'var(--t3)' }}>Open the terminal</div></div><IconChevronRight style={{ width: 14, height: 14, color: 'var(--t3)', marginLeft: 'auto' }} /></Link>
              <Link href="/wallets" className="dash-action"><IconWallet style={{ width: 16, height: 16, color: 'var(--accent-l)' }} /><div><div style={{ fontWeight: 600, color: 'var(--t0)', fontSize: 13 }}>Fund Wallet</div><div style={{ fontSize: 11, color: 'var(--t3)' }}>Add paper SOL</div></div><IconChevronRight style={{ width: 14, height: 14, color: 'var(--t3)', marginLeft: 'auto' }} /></Link>
              <Link href="/discover" className="dash-action"><IconCompass style={{ width: 16, height: 16, color: 'var(--cyan)' }} /><div><div style={{ fontWeight: 600, color: 'var(--t0)', fontSize: 13 }}>Discover Tokens</div><div style={{ fontSize: 11, color: 'var(--t3)' }}>Scan the market</div></div><IconChevronRight style={{ width: 14, height: 14, color: 'var(--t3)', marginLeft: 'auto' }} /></Link>
              <Link href="/learn" className="dash-action"><IconGraduationCap style={{ width: 16, height: 16, color: 'var(--gold)' }} /><div><div style={{ fontWeight: 600, color: 'var(--t0)', fontSize: 13 }}>Academy</div><div style={{ fontSize: 11, color: 'var(--t3)' }}>Learn trading</div></div><IconChevronRight style={{ width: 14, height: 14, color: 'var(--t3)', marginLeft: 'auto' }} /></Link>
            </div>
          </div>

          {/* Recent Closed */}
          <div className="panel">
            <div className="panel-head">
              <div className="panel-title"><IconActivity /> Recent Trades</div>
              <Link href="/history" style={{ fontSize: 11, color: 'var(--accent-l)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>All <IconChevronRight style={{ width: 12, height: 12 }} /></Link>
            </div>
            <div className="panel-body">
              {closed.length === 0 ? (
                <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                  <p style={{ fontSize: 12, color: 'var(--t3)' }}>No completed trades yet</p>
                </div>
              ) : closed.slice(0, 5).map((pos) => {
                const pnl = parseFloat(String(pos.pnl_percent));
                return <div key={pos.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid var(--border-0)' }}>
                  <div className="tk-img" style={{ width: 28, height: 28, fontSize: 9 }}>{pos.token_symbol?.slice(0, 2)}</div>
                  <div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t0)' }}>{pos.token_symbol}</div><div className="mono" style={{ fontSize: 10, color: 'var(--t3)' }}>{formatSol(parseFloat(String(pos.amount_sol)))} SOL</div></div>
                  <div className={`mono bold ${pnl >= 0 ? 'up' : 'down'}`} style={{ fontSize: 12 }}>{formatPercent(pnl)}</div>
                </div>;
              })}
            </div>
          </div>

          {/* Portfolio breakdown if beginner */}
          {mode === 'beginner' && (
            <div className="panel">
              <div className="panel-head"><div className="panel-title"><IconShield /> Getting Started</div></div>
              <div className="panel-pad" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { done: true, text: 'Create an account' },
                    { done: balance > 0, text: 'Fund your paper wallet' },
                    { done: hasTraded, text: 'Execute your first trade' },
                    { done: closed.length > 0, text: 'Close a position' },
                  ].map((step, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', border: `1.5px solid ${step.done ? 'var(--green)' : 'var(--border-2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: step.done ? 'var(--green-bg)' : 'transparent', flexShrink: 0 }}>
                        {step.done && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="3"><path d="M20 6 9 17l-5-5"/></svg>}
                      </div>
                      <span style={{ color: step.done ? 'var(--t2)' : 'var(--t0)', textDecoration: step.done ? 'line-through' : 'none' }}>{step.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
