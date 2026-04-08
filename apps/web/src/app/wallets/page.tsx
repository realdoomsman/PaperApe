'use client';
import { useState, useCallback, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import { useAuth } from '@/components/AuthContext';
import { apiRequest } from '@/lib/api';

interface PaperWallet {
  id: string;
  name: string;
  address: string;
  balance: number;
  isPrimary: boolean;
  type: 'main' | 'burner' | 'vault';
}

interface TrackedWallet {
  address: string;
  label: string;
  addedAt: string;
}

interface WalletTrade {
  tokenAddress: string;
  tokenSymbol: string;
  tokenImage: string | null;
  type: 'buy' | 'sell';
  amountSol: number;
  amountUsd: number;
  priceUsd: number;
  timestamp: string;
  txHash: string;
}

export default function WalletsPage() {
  const { token: authToken } = useAuth();
  const [mainTab, setMainTab] = useState<'wallets' | 'tracker'>('wallets');
  const [wallets, setWallets] = useState<PaperWallet[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Transfer modal state
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferFrom, setTransferFrom] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [transferAmt, setTransferAmt] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);

  // Tracker state
  const [tracked, setTracked] = useState<TrackedWallet[]>([]);
  const [trackerLoading, setTrackerLoading] = useState(false);
  const [trackAddr, setTrackAddr] = useState('');
  const [trackLabel, setTrackLabel] = useState('');
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [walletTrades, setWalletTrades] = useState<WalletTrade[]>([]);
  const [tradesLoading, setTradesLoading] = useState(false);

  // Load wallets from API
  useEffect(() => {
    if (!authToken) return;
    setLoading(true);
    apiRequest('GET', '/wallets', undefined, authToken).then(r => {
      if (r.success && r.data?.wallets) setWallets(r.data.wallets);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [authToken]);

  // Load tracked wallets
  useEffect(() => {
    if (!authToken || mainTab !== 'tracker') return;
    setTrackerLoading(true);
    apiRequest('GET', '/wallets/tracked', undefined, authToken).then(r => {
      if (r.success && r.data?.wallets) setTracked(r.data.wallets);
      setTrackerLoading(false);
    }).catch(() => setTrackerLoading(false));
  }, [authToken, mainTab]);

  const showMsg = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const create = useCallback(async (type: 'burner' | 'vault') => {
    if (wallets.length >= 5) { showMsg('Maximum 5 wallets'); return; }
    const name = type === 'burner' ? `Burner ${wallets.length}` : `Vault ${wallets.length}`;
    const r = await apiRequest('POST', '/wallets', { name, type }, authToken || undefined);
    if (r.success && r.data?.wallet) {
      setWallets(p => [...p, r.data.wallet]);
      showMsg(`${type === 'burner' ? 'Burner' : 'Vault'} wallet created`);
    } else showMsg(r.error || 'Failed');
  }, [wallets.length, authToken, showMsg]);

  const del = useCallback(async (id: string) => {
    const r = await apiRequest('DELETE', `/wallets/${id}`, undefined, authToken || undefined);
    if (r.success) { setWallets(p => p.filter(w => w.id !== id)); showMsg('Deleted'); }
    else showMsg(r.error || 'Failed');
  }, [authToken, showMsg]);

  const setPri = useCallback(async (id: string) => {
    const r = await apiRequest('POST', `/wallets/${id}/primary`, undefined, authToken || undefined);
    if (r.success && r.data?.wallets) { setWallets(r.data.wallets); showMsg('Primary updated'); }
    else showMsg(r.error || 'Failed');
  }, [authToken, showMsg]);

  const executeTransfer = useCallback(async () => {
    if (!transferFrom || !transferTo || !transferAmt) return;
    setTransferLoading(true);
    const amt = parseFloat(transferAmt);
    const r = await apiRequest('POST', '/wallets/transfer', { from_wallet_id: transferFrom, to_wallet_id: transferTo, amount: amt }, authToken || undefined);
    setTransferLoading(false);
    if (r.success && r.data) {
      setWallets(p => p.map(w => {
        if (w.id === transferFrom) return { ...w, balance: r.data.from.balance };
        if (w.id === transferTo) return { ...w, balance: r.data.to.balance };
        return w;
      }));
      showMsg(`Transferred ${amt} SOL`);
      setShowTransfer(false);
      setTransferAmt('');
    } else showMsg(r.error || 'Failed');
  }, [transferFrom, transferTo, transferAmt, authToken, showMsg]);

  const fund = useCallback(async (id: string, amt: number) => {
    if (!authToken) return;
    const r = await apiRequest('POST', '/auth/fund', { amount: amt }, authToken);
    if (r.success) { setWallets(p => p.map(w => w.id === id ? { ...w, balance: w.balance + amt } : w)); showMsg(`Added ${amt} SOL`); }
    else showMsg(r.error || 'Failed');
  }, [authToken, showMsg]);

  const copy = useCallback((a: string) => {
    navigator.clipboard.writeText(a);
    setCopied(a);
    setTimeout(() => setCopied(null), 1500);
  }, []);

  // Tracker functions
  const addTrack = useCallback(async () => {
    if (trackAddr.length < 32) { showMsg('Enter a valid Solana address'); return; }
    const r = await apiRequest('POST', '/wallets/track', { address: trackAddr, label: trackLabel }, authToken || undefined);
    if (r.success && r.data?.wallet) {
      setTracked(p => [...p, r.data.wallet]);
      setTrackAddr('');
      setTrackLabel('');
      showMsg('Wallet tracked');
    } else showMsg(r.error || 'Failed to track');
  }, [trackAddr, trackLabel, authToken, showMsg]);

  const removeTrack = useCallback(async (address: string) => {
    const r = await apiRequest('DELETE', `/wallets/track/${address}`, undefined, authToken || undefined);
    if (r.success) { setTracked(p => p.filter(w => w.address !== address)); showMsg('Removed'); }
    else showMsg(r.error || 'Failed');
  }, [authToken, showMsg]);

  const loadActivity = useCallback(async (address: string) => {
    setSelectedWallet(address);
    setTradesLoading(true);
    const r = await apiRequest('GET', `/wallets/track/${address}/activity`, undefined, authToken || undefined);
    if (r.success && r.data?.trades) setWalletTrades(r.data.trades);
    else setWalletTrades([]);
    setTradesLoading(false);
  }, [authToken]);

  const total = wallets.reduce((s, w) => s + w.balance, 0);
  const trunc = (a: string) => a.length > 10 ? `${a.slice(0, 6)}...${a.slice(-4)}` : a;
  const timeAgo = (ts: string) => {
    const d = Date.now() - new Date(ts).getTime();
    if (d < 3600000) return `${Math.floor(d / 60000)}m ago`;
    if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`;
    return `${Math.floor(d / 86400000)}d ago`;
  };

  return (
    <AppShell balance={total}>
      {toast && <div className="toast info">{toast}</div>}

      <div className="page-head an">
        <div>
          <h1>{mainTab === 'wallets' ? 'Multi-Wallet Sandbox' : 'Smart Money Tracker'}</h1>
          <div className="page-head-sub">{mainTab === 'wallets' ? 'Manage paper wallets and practice fund segregation' : 'Track whale wallets and copy their trades'}</div>
        </div>
        <div className="page-head-right" style={{ display: 'flex', gap: 6 }}>
          {mainTab === 'wallets' && (
            <>
              <button className="btn haptic" onClick={async () => {
                if (!confirm('Reset your paper balance to 100 SOL? This will close all open positions.')) return;
                const r = await apiRequest('POST', '/wallets/reset', undefined, authToken || undefined);
                if (r.success) { showMsg('Balance reset to 100 SOL!'); window.location.reload(); }
                else showMsg(r.error || 'Failed to reset');
              }} style={{ padding: '5px 14px', fontSize: 11, fontWeight: 600, color: 'var(--gold)' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                &nbsp;Reset
              </button>
              <button className="btn haptic" onClick={() => setShowTransfer(true)} style={{ padding: '5px 14px', fontSize: 11, fontWeight: 600 }}>Transfer</button>
              <span className="mono" style={{ fontSize: 12, color: 'var(--t3)', alignSelf: 'center' }}>{wallets.length}/5</span>
            </>
          )}
        </div>
      </div>

      {/* Tab switcher */}
      <div className="an an1" style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {(['wallets', 'tracker'] as const).map(t => (
          <button key={t} className={`preset haptic ${mainTab === t ? 'on' : ''}`}
            onClick={() => setMainTab(t)}
            style={{ flex: 1, padding: '10px 0', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
            {t === 'wallets' ? '💼 My Wallets' : '🐋 Smart Money'}
          </button>
        ))}
      </div>

      {/* ═══ MY WALLETS TAB ═══ */}
      {mainTab === 'wallets' && (
        <>
          {/* Summary strip */}
          <div className="stats-row an an1">
            <div className="stat-card" style={{ borderColor: 'rgba(0,255,136,0.08)' }}>
              <div className="stat-label">Total Balance</div>
              <div className="stat-val mono">{total.toFixed(4)} <span style={{ fontSize: 12, color: 'var(--t3)' }}>SOL</span></div>
              <div className="stat-sub">Across all wallets</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Active Wallets</div>
              <div className="stat-val mono">{wallets.length}</div>
              <div className="stat-sub">of 5 maximum</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Primary Wallet</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--t0)', marginTop: 4 }}>{wallets.find(w => w.isPrimary)?.name || '-'}</div>
              <div className="stat-sub">Used for trades</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Burner Wallets</div>
              <div className="stat-val mono">{wallets.filter(w => w.type === 'burner').length}</div>
              <div className="stat-sub">Disposable wallets</div>
            </div>
          </div>

          {/* Transfer Modal */}
          {showTransfer && (
            <div className="modal-bg" onClick={() => setShowTransfer(false)}>
              <div className="modal-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 380, width: '100%', padding: 24 }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: 'var(--t0)' }}>Transfer Between Wallets</h3>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--t2)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>From</label>
                  <select value={transferFrom} onChange={e => setTransferFrom(e.target.value)} style={{ width: '100%', padding: 10, background: 'var(--bg-2)', border: '1px solid var(--border-1)', borderRadius: 'var(--r-sm)', color: 'var(--t0)', fontSize: 13 }}>
                    <option value="">Select wallet</option>
                    {wallets.map(w => <option key={w.id} value={w.id}>{w.name} ({w.balance.toFixed(4)} SOL)</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--t2)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>To</label>
                  <select value={transferTo} onChange={e => setTransferTo(e.target.value)} style={{ width: '100%', padding: 10, background: 'var(--bg-2)', border: '1px solid var(--border-1)', borderRadius: 'var(--r-sm)', color: 'var(--t0)', fontSize: 13 }}>
                    <option value="">Select wallet</option>
                    {wallets.filter(w => w.id !== transferFrom).map(w => <option key={w.id} value={w.id}>{w.name} ({w.balance.toFixed(4)} SOL)</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--t2)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Amount (SOL)</label>
                  <input type="number" value={transferAmt} onChange={e => setTransferAmt(e.target.value)} placeholder="0.00" min="0" step="0.01" style={{ width: '100%', padding: 10, background: 'var(--bg-2)', border: '1px solid var(--border-1)', borderRadius: 'var(--r-sm)', color: 'var(--t0)', fontSize: 14, fontFamily: 'var(--font-mono)' }} />
                  {transferFrom && (
                    <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                      {[25, 50, 100].map(pct => {
                        const fromWallet = wallets.find(w => w.id === transferFrom);
                        const pctAmt = fromWallet ? (fromWallet.balance * pct / 100).toFixed(4) : '0';
                        return <button key={pct} onClick={() => setTransferAmt(pctAmt)} className="preset" style={{ fontSize: 10, padding: '3px 8px' }}>{pct}%</button>;
                      })}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setShowTransfer(false)} className="btn haptic" style={{ flex: 1, justifyContent: 'center', padding: '10px 0', fontSize: 12 }}>Cancel</button>
                  <button onClick={executeTransfer} disabled={transferLoading || !transferFrom || !transferTo || !transferAmt} className="btn buy haptic" style={{ flex: 1, justifyContent: 'center', padding: '10px 0', fontSize: 12 }}>
                    {transferLoading ? 'Transferring...' : 'Transfer'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Wallet grid */}
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--t2)', fontSize: 13 }}>Loading wallets...</div>
          ) : (
            <div className="an an2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 10 }}>
              {wallets.map(w => (
                <div key={w.id} className="card" style={{ borderColor: w.isPrimary ? 'rgba(0,255,136,0.1)' : undefined, position: 'relative' }}>
                  {w.isPrimary && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'var(--green)', borderRadius: '16px 16px 0 0' }} />}
                  <div style={{ padding: 18 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--t0)' }}>{w.name}</span>
                        {w.isPrimary && <span className="tag tag-live" style={{ fontSize: 9 }}>PRIMARY</span>}
                        <span className="tag" style={{ fontSize: 9, color: w.type === 'burner' ? 'var(--red)' : w.type === 'vault' ? 'var(--gold)' : 'var(--green)', background: w.type === 'burner' ? 'var(--red-bg)' : w.type === 'vault' ? 'var(--gold-bg)' : 'var(--green-bg)' }}>
                          {w.type.toUpperCase()}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {!w.isPrimary && <button onClick={() => setPri(w.id)} className="btn haptic" style={{ padding: '3px 8px', fontSize: 10 }}>Set Primary</button>}
                        <button onClick={() => copy(w.address)} className="btn haptic" style={{ padding: '3px 8px', fontSize: 10 }}>{copied === w.address ? 'Copied' : 'Copy'}</button>
                        {!w.isPrimary && <button onClick={() => del(w.id)} className="btn danger haptic" style={{ padding: '3px 8px', fontSize: 10 }}>Delete</button>}
                      </div>
                    </div>
                    <div className="mono" style={{ fontSize: 10, color: 'var(--t3)', marginBottom: 14, overflow: 'hidden', textOverflow: 'ellipsis', padding: '6px 10px', background: 'var(--bg-2)', borderRadius: 6 }}>{w.address}</div>
                    <div style={{ display: 'flex', gap: 20, marginBottom: 14 }}>
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>Balance</div>
                        <div className="mono" style={{ fontSize: 20, fontWeight: 800, color: 'var(--t0)' }}>{w.balance.toFixed(4)} <span style={{ fontSize: 11, color: 'var(--t3)' }}>SOL</span></div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {w.isPrimary && [10, 50, 100].map(a => <button key={a} onClick={() => fund(w.id, a)} className="btn haptic" style={{ flex: 1, justifyContent: 'center', fontSize: 11, padding: '7px 0' }}>+{a} SOL</button>)}
                      {!w.isPrimary && <button onClick={() => { setTransferFrom(wallets.find(x => x.isPrimary)?.id || ''); setTransferTo(w.id); setShowTransfer(true); }} className="btn haptic" style={{ flex: 1, justifyContent: 'center', fontSize: 11, padding: '7px 0' }}>Transfer Funds Here</button>}
                    </div>
                  </div>
                </div>
              ))}
              {wallets.length < 5 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button onClick={() => create('burner')} className="card haptic" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 28, cursor: 'pointer', border: '2px dashed var(--border-2)', background: 'transparent' }}>
                    <span style={{ fontSize: 20, color: 'var(--t3)', marginBottom: 6 }}>+</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--t2)' }}>Create Burner Wallet</span>
                    <span style={{ fontSize: 10, color: 'var(--t3)', marginTop: 2 }}>Disposable wallet for risky plays</span>
                  </button>
                  <button onClick={() => create('vault')} className="card haptic" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 28, cursor: 'pointer', border: '2px dashed var(--border-2)', background: 'transparent' }}>
                    <span style={{ fontSize: 20, color: 'var(--gold)', marginBottom: 6 }}>+</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--t2)' }}>Create Vault Wallet</span>
                    <span style={{ fontSize: 10, color: 'var(--t3)', marginTop: 2 }}>Safe storage for long-term holds</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ═══ SMART MONEY TRACKER TAB ═══ */}
      {mainTab === 'tracker' && (
        <>
          {/* Add wallet form */}
          <div className="card an an1" style={{ padding: 18, marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Track a Wallet</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={trackAddr} onChange={e => setTrackAddr(e.target.value)} placeholder="Wallet address (e.g. ansem.sol)" style={{ flex: 3, padding: '10px 12px', background: 'var(--bg-2)', border: '1px solid var(--border-1)', borderRadius: 'var(--r-sm)', color: 'var(--t0)', fontSize: 12, fontFamily: 'var(--font-mono)' }} />
              <input value={trackLabel} onChange={e => setTrackLabel(e.target.value)} placeholder="Label (optional)" style={{ flex: 1, padding: '10px 12px', background: 'var(--bg-2)', border: '1px solid var(--border-1)', borderRadius: 'var(--r-sm)', color: 'var(--t0)', fontSize: 12 }} />
              <button onClick={addTrack} className="btn primary haptic" style={{ padding: '10px 20px', fontSize: 12, fontWeight: 700 }}>Track</button>
            </div>
          </div>

          {/* Tracked wallets list */}
          <div style={{ display: 'grid', gridTemplateColumns: selectedWallet ? '300px 1fr' : '1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Tracked Wallets ({tracked.length}/10)
              </div>
              {trackerLoading ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--t3)', fontSize: 12 }}>Loading...</div>
              ) : tracked.length === 0 ? (
                <div className="card" style={{ padding: 20, textAlign: 'center', color: 'var(--t3)', fontSize: 12 }}>No wallets tracked yet. Add one above.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {tracked.map(tw => (
                    <div key={tw.address} className={`card haptic ${selectedWallet === tw.address ? 'card-active' : ''}`}
                      onClick={() => loadActivity(tw.address)}
                      style={{ padding: 14, cursor: 'pointer', borderColor: selectedWallet === tw.address ? 'var(--accent-glow)' : undefined }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t0)', marginBottom: 2 }}>{tw.label}</div>
                          <div className="mono" style={{ fontSize: 10, color: 'var(--t3)' }}>{trunc(tw.address)}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={e => { e.stopPropagation(); copy(tw.address); }} className="btn haptic" style={{ padding: '3px 8px', fontSize: 9 }}>
                            {copied === tw.address ? '✓' : 'Copy'}
                          </button>
                          <button onClick={e => { e.stopPropagation(); removeTrack(tw.address); }} className="btn danger haptic" style={{ padding: '3px 8px', fontSize: 9 }}>✕</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Activity panel */}
            {selectedWallet && (
              <div className="an">
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Recent Activity — {tracked.find(t => t.address === selectedWallet)?.label || trunc(selectedWallet)}
                </div>
                {tradesLoading ? (
                  <div className="card" style={{ padding: 30, textAlign: 'center', color: 'var(--t3)', fontSize: 12 }}>Loading trades...</div>
                ) : walletTrades.length === 0 ? (
                  <div className="card" style={{ padding: 30, textAlign: 'center', color: 'var(--t3)', fontSize: 12 }}>No recent activity</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {walletTrades.map((t, i) => (
                      <div key={i} className="card" style={{ padding: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 32, height: 32, borderRadius: '50%',
                              background: t.tokenImage ? `url(${t.tokenImage}) center/cover` : 'var(--bg-3)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 10, fontWeight: 700, color: 'var(--t3)',
                            }}>{!t.tokenImage && t.tokenSymbol.slice(0, 2)}</div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t0)' }}>${t.tokenSymbol}</span>
                                <span className="tag" style={{
                                  fontSize: 9,
                                  color: t.type === 'buy' ? 'var(--green)' : 'var(--red)',
                                  background: t.type === 'buy' ? 'var(--green-bg)' : 'var(--red-bg)',
                                }}>{t.type.toUpperCase()}</span>
                              </div>
                              <div className="mono" style={{ fontSize: 10, color: 'var(--t3)', marginTop: 2 }}>{timeAgo(t.timestamp)}</div>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div className="mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--t0)' }}>{t.amountSol.toFixed(2)} SOL</div>
                            <div className="mono" style={{ fontSize: 10, color: 'var(--t3)' }}>${t.amountUsd.toFixed(2)}</div>
                          </div>
                          <button onClick={() => {
                            window.location.href = `/terminal?token=${t.tokenAddress}`;
                          }} className="btn primary haptic" style={{ padding: '6px 12px', fontSize: 10, fontWeight: 700, marginLeft: 8 }}>
                            Copy Trade
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </AppShell>
  );
}
