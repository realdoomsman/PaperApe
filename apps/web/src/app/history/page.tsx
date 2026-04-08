'use client';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import AppShell from '@/components/AppShell';
import { useAuth } from '@/components/AuthContext';
import { apiRequest } from '@/lib/api';
import { formatSol, formatPercent, truncateAddress } from '@paperape/shared';
import type { Position } from '@paperape/shared';

function MiniChart({ data, width = 320, height = 50, color = 'var(--green)' }: { data: number[]; width?: number; height?: number; color?: string }) {
  if (data.length < 2) return null;
  const min = Math.min(...data); const max = Math.max(...data); const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * (height - 4) - 2}`).join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <defs><linearGradient id="pnlFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.12" /><stop offset="100%" stopColor={color} stopOpacity="0.01" /></linearGradient></defs>
      <polygon points={`0,${height} ${pts} ${width},${height}`} fill="url(#pnlFill)" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

const ShareCard = dynamic(() => import('@/components/ShareCard'), { ssr: false });

const FILTERS = ['All', 'Open', 'Closed', 'Moon Bags', 'Rugged'];

export default function HistoryPage() {
  const { token: authToken } = useAuth();
  const [positions, setPositions] = useState<Position[]>([]);
  const [trades, setTrades] = useState<any[]>([]);
  const [filter, setFilter] = useState('All');
  const [tab, setTab] = useState<'positions' | 'trades'>('positions');
  const [sharePos, setSharePos] = useState<Position | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [editingNote, setEditingNote] = useState<string | null>(null);

  // Load trade notes from localStorage
  useEffect(() => {
    try { const s = localStorage.getItem('pa_trade_notes'); if (s) setNotes(JSON.parse(s)); } catch {}
  }, []);

  const saveNote = (posId: string, text: string) => {
    setNotes(prev => {
      const next = { ...prev, [posId]: text };
      if (!text.trim()) delete next[posId];
      localStorage.setItem('pa_trade_notes', JSON.stringify(next));
      return next;
    });
  };

  useEffect(() => {
    if (!authToken) return;
    apiRequest('GET', '/trades/positions', undefined, authToken).then(r => {
      if (r.success && r.data?.positions) setPositions(r.data.positions);
    });
    apiRequest('GET', '/trades/history', undefined, authToken).then(r => {
      if (r.success && r.data?.trades) setTrades(r.data.trades);
    });
  }, [authToken]);

  const filtered = filter === 'All' ? positions
    : filter === 'Open' ? positions.filter(p => p.status === 'open')
    : filter === 'Closed' ? positions.filter(p => p.status === 'closed')
    : filter === 'Moon Bags' ? positions.filter(p => p.is_moon_bag)
    : positions.filter(p => p.is_rugged);

  const totalPnl = positions.reduce((s, p) => s + parseFloat(String(p.pnl_sol ?? 0)), 0);
  const winCount = positions.filter(p => parseFloat(String(p.pnl_sol ?? 0)) > 0).length;
  const lossCount = positions.filter(p => parseFloat(String(p.pnl_sol ?? 0)) < 0).length;

  return (
    <AppShell>
      <div style={{ marginBottom: 12 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--t0)', margin: 0 }}>Trade History</h1>
        <div style={{ fontSize: 12, color: 'var(--t2)', marginTop: 2 }}>Full record of your paper trades</div>
      </div>

      {/* Summary + PnL Chart */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {[
            { label: 'TOTAL PNL', value: `${totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(4)} SOL`, cls: totalPnl >= 0 ? 'up' : 'down' },
            { label: 'TRADES', value: String(trades.length), cls: '' },
            { label: 'WINS', value: String(winCount), cls: 'up' },
            { label: 'LOSSES', value: String(lossCount), cls: 'down' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--bg-1)', border: '1px solid var(--border-1)', borderRadius: 'var(--r-md)', textAlign: 'center', padding: '14px 8px' }}>
              <div className="mono" style={{ fontSize: 9, fontWeight: 600, color: 'var(--t3)', letterSpacing: '0.5px' }}>{s.label}</div>
              <div className={`mono ${s.cls}`} style={{ fontSize: 16, fontWeight: 700, marginTop: 3 }}>{s.value}</div>
            </div>
          ))}
        </div>
        <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border-1)', borderRadius: 'var(--r-md)', padding: '12px 16px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Cumulative PnL</div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end' }}>
            <MiniChart
              data={(() => {
                const curve = [0];
                const sorted = [...trades].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                let running = 0;
                for (const t of sorted) { running += parseFloat(String(t.pnl_sol ?? t.pnl ?? 0)); curve.push(running); }
                if (curve.length < 2) curve.push(totalPnl);
                return curve;
              })()}
              width={400}
              height={60}
              color={totalPnl >= 0 ? 'var(--green)' : 'var(--red)'}
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        <button className={`preset ${tab === 'positions' ? 'on' : ''}`} onClick={() => setTab('positions')} style={{ padding: '6px 14px', fontSize: 12 }}>Positions</button>
        <button className={`preset ${tab === 'trades' ? 'on' : ''}`} onClick={() => setTab('trades')} style={{ padding: '6px 14px', fontSize: 12 }}>Trade Log</button>
        <div style={{ flex: 1 }} />
        {tab === 'positions' && FILTERS.map(f => (
          <button key={f} className={`preset ${filter === f ? 'on' : ''}`} onClick={() => setFilter(f)} style={{ padding: '4px 10px', fontSize: 11 }}>{f}</button>
        ))}
        {tab === 'trades' && trades.length > 0 && (
          <button className="btn haptic" style={{ padding: '4px 12px', fontSize: 10, color: 'var(--cyan)', background: 'rgba(0,200,255,0.06)', border: '1px solid rgba(0,200,255,0.1)' }}
            onClick={() => {
              const headers = ['Time', 'Type', 'Symbol', 'SOL Amount', 'Tokens', 'Price', 'Slippage'];
              const rows = trades.map((t: any) => [
                new Date(t.created_at).toISOString(),
                t.trade_type,
                t.token_symbol || '',
                parseFloat(t.amount_sol ?? 0).toFixed(6),
                parseFloat(t.amount_tokens ?? 0).toFixed(0),
                parseFloat(t.execution_price ?? 0).toExponential(6),
                (parseFloat(t.slippage_applied ?? 0) * 100).toFixed(2) + '%',
              ]);
              const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `paperape_trades_${new Date().toISOString().split('T')[0]}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            &nbsp;Export CSV
          </button>
        )}
      </div>

      {tab === 'positions' && (
        <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border-1)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--t2)' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--t1)', marginBottom: 4 }}>No positions yet</div>
              <div style={{ fontSize: 12 }}>Make a trade from the Terminal to get started</div>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 0.8fr 1fr 0.8fr 0.4fr', padding: '8px 14px', borderBottom: '1px solid var(--border-0)', fontSize: 10, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <span>Token</span><span>Entry Price</span><span>Invested</span><span>PnL</span><span>Status</span><span></span>
              </div>
              {filtered.map(pos => {
                const pnl = parseFloat(String(pos.pnl_sol ?? 0));
                const pnlPct = parseFloat(String(pos.pnl_percent ?? 0));
                return (
                  <div key={pos.id}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 0.8fr 1fr 0.8fr 0.4fr', padding: '10px 14px', borderBottom: editingNote === pos.id ? 'none' : '1px solid var(--border-0)', alignItems: 'center', fontSize: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {pos.token_image ? (
                        <img src={pos.token_image} alt={pos.token_symbol} style={{ width: 26, height: 26, borderRadius: 'var(--r-sm)' }} />
                      ) : (
                        <div style={{ width: 26, height: 26, borderRadius: 'var(--r-sm)', background: 'var(--bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--t1)' }}>{pos.token_symbol?.slice(0, 2)}</div>
                      )}
                      <div><div style={{ fontWeight: 700, color: 'var(--t0)' }}>{pos.token_symbol}</div><div style={{ fontSize: 10, color: 'var(--t2)' }}>{truncateAddress(pos.token_address)}</div></div>
                    </div>
                    <span className="mono" style={{ color: 'var(--t1)' }}>{parseFloat(String(pos.entry_price ?? 0)) < 0.001 ? parseFloat(String(pos.entry_price ?? 0)).toExponential(2) : parseFloat(String(pos.entry_price ?? 0)).toFixed(6)}</span>
                    <span className="mono" style={{ color: 'var(--t1)' }}>{formatSol(parseFloat(String(pos.amount_sol)))} SOL</span>
                    <div>
                      <div className={`mono ${pnl >= 0 ? 'up' : 'down'}`} style={{ fontWeight: 600 }}>{pnl >= 0 ? '+' : ''}{pnl.toFixed(4)} SOL</div>
                      <div className={`mono ${pnlPct >= 0 ? 'up' : 'down'}`} style={{ fontSize: 10 }}>{formatPercent(pnlPct)}</div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: pos.is_rugged ? 'var(--red)' : pos.is_moon_bag ? 'var(--gold)' : pos.status === 'open' ? 'var(--green)' : 'var(--t2)' }}>
                      {pos.is_rugged ? 'RUGGED' : pos.is_moon_bag ? 'MOON BAG' : pos.status === 'open' ? 'OPEN' : 'CLOSED'}
                    </span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {pnl > 0 && (
                        <button onClick={(e) => { e.stopPropagation(); setSharePos(pos); }} className="btn haptic" style={{ padding: '3px 8px', fontSize: 9, fontWeight: 700, color: 'var(--accent-l)' }}>
                          FLEX 📸
                        </button>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); setEditingNote(editingNote === pos.id ? null : pos.id); }} className="haptic" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '3px 6px', fontSize: 11, color: notes[pos.id] ? 'var(--accent-l)' : 'var(--t3)', opacity: notes[pos.id] ? 1 : 0.5 }} title="Trade notes">
                        📝
                      </button>
                    </div>
                  </div>
                  {editingNote === pos.id && (
                    <div style={{ padding: '8px 14px 12px', borderBottom: '1px solid var(--border-0)', background: 'rgba(0,0,0,0.02)' }}>
                      <textarea
                        value={notes[pos.id] || ''}
                        onChange={e => saveNote(pos.id, e.target.value)}
                        placeholder="Add notes about this trade (strategy, reasoning, lessons learned...)"
                        style={{ width: '100%', minHeight: 50, padding: '8px 10px', fontSize: 11, background: 'var(--bg-0)', border: '1px solid var(--border-0)', borderRadius: 6, resize: 'vertical', color: 'var(--t1)', fontFamily: 'inherit', outline: 'none' }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 9, color: 'var(--t3)' }}>
                        <span>Notes are saved automatically to your browser</span>
                        {notes[pos.id] && <button onClick={() => saveNote(pos.id, '')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', fontSize: 9 }}>Clear note</button>}
                      </div>
                    </div>
                  )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {tab === 'trades' && (
        <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border-1)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
          {trades.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--t2)' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--t1)', marginBottom: 4 }}>No trades yet</div>
              <div style={{ fontSize: 12 }}>Execute your first trade from the Terminal</div>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.7fr 0.8fr 1fr 0.8fr 0.6fr', padding: '8px 14px', borderBottom: '1px solid var(--border-0)', fontSize: 10, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <span>Time</span><span>Type</span><span>SOL</span><span>Tokens</span><span>Price</span><span>Slip.</span>
              </div>
              {trades.map(t => (
                <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.7fr 0.8fr 1fr 0.8fr 0.6fr', padding: '10px 14px', borderBottom: '1px solid var(--border-0)', alignItems: 'center', fontSize: 12 }}>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--t2)' }}>{new Date(t.created_at).toLocaleString()}</span>
                  <span style={{ fontWeight: 600, color: t.trade_type === 'buy' ? 'var(--green)' : 'var(--red)' }}>{t.trade_type === 'buy' ? 'BUY' : 'SELL'}</span>
                  <span className="mono" style={{ color: 'var(--t1)' }}>{parseFloat(t.amount_sol ?? 0).toFixed(4)}</span>
                  <span className="mono" style={{ color: 'var(--t1)' }}>{parseFloat(t.amount_tokens ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  <span className="mono" style={{ color: 'var(--t1)' }}>{parseFloat(t.execution_price ?? 0) < 0.001 ? parseFloat(t.execution_price ?? 0).toExponential(3) : parseFloat(t.execution_price ?? 0).toFixed(6)}</span>
                  <span className="mono" style={{ color: 'var(--t3)' }}>{(parseFloat(t.slippage_applied ?? 0) * 100).toFixed(1)}%</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}
      {/* ShareCard Modal */}
      {sharePos && (
        <ShareCard
          tokenSymbol={sharePos.token_symbol}
          pnlPercent={parseFloat(String(sharePos.pnl_percent ?? 0))}
          pnlSol={parseFloat(String(sharePos.pnl_sol ?? 0))}
          entryPrice={parseFloat(String(sharePos.entry_price ?? 0))}
          investedSol={parseFloat(String(sharePos.amount_sol ?? 0))}
          isOpen={true}
          onClose={() => setSharePos(null)}
        />
      )}
    </AppShell>
  );
}
