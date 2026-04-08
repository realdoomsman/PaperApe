'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { useMode } from '@/components/ModeContext';
import { apiRequest } from '@/lib/api';

interface Token {
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
  createdAt: string | null;
  ageMinutes?: number;
  dex?: string;
  pairAddress?: string;
  txns?: { buys: number; sells: number };
}

type FilterTab = 'trending' | 'trenches' | 'watchlist';

interface TrenchFilters {
  keyword: string;
  protocol: string;
  minMcap: string;
  maxMcap: string;
  minLiq: string;
  maxLiq: string;
  minVol: string;
  maxVol: string;
  filterTab: 'protocols' | 'metrics';
}

const defaultFilters: TrenchFilters = {
  keyword: '', protocol: '', minMcap: '', maxMcap: '', minLiq: '', maxLiq: '', minVol: '', maxVol: '',
  filterTab: 'protocols',
};

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
  if (n > 0) return `$${n.toFixed(0)}`;
  return '-';
}

function fmtAge(minutes?: number): string {
  if (!minutes && minutes !== 0) return '-';
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
  return `${Math.floor(minutes / 1440)}d`;
}

// SVG Icons (no emojis)
const IconFire = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>;
const IconBolt = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
const IconTrend = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>;
const IconFilter = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>;
const IconNew = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>;
const IconRocket = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/></svg>;
const IconCheck = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;

export default function DiscoverPage() {
  const { mode } = useMode();
  const router = useRouter();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [trenchData, setTrenchData] = useState<{ newPairs: Token[]; finalStretch: Token[]; migrated: Token[] }>({ newPairs: [], finalStretch: [], migrated: [] });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<FilterTab>('trending');
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<TrenchFilters>(defaultFilters);
  const [sortBy, setSortBy] = useState<'volume' | 'mcap' | 'change' | 'new'>('volume');

  // Watchlist (localStorage-backed)
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set());
  useEffect(() => {
    try {
      const saved = localStorage.getItem('pa_watchlist');
      if (saved) setWatchlist(new Set(JSON.parse(saved)));
    } catch {}
  }, []);
  const toggleWatchlist = (address: string) => {
    setWatchlist(prev => {
      const next = new Set(prev);
      if (next.has(address)) next.delete(address); else next.add(address);
      localStorage.setItem('pa_watchlist', JSON.stringify([...next]));
      return next;
    });
  };
  const watchlistTokens = useMemo(() => tokens.filter(t => watchlist.has(t.address)), [tokens, watchlist]);

  // Auto-refresh
  const [autoRefresh, setAutoRefresh] = useState<number>(0); // 0=off, 10000, 30000
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      Promise.all([
        apiRequest('GET', '/tokens/trending'),
        apiRequest('GET', '/tokens/trenches'),
      ]).then(([trendRes, trenchRes]) => {
        if (trendRes.success && trendRes.data?.tokens) setTokens(trendRes.data.tokens);
        if (trenchRes.success && trenchRes.data) {
          setTrenchData({
            newPairs: trenchRes.data.newPairs || [],
            finalStretch: trenchRes.data.finalStretch || [],
            migrated: trenchRes.data.migrated || [],
          });
        }
      }).catch(() => {});
    }, autoRefresh);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Fetch data
  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiRequest('GET', '/tokens/trending'),
      apiRequest('GET', '/tokens/trenches'),
    ]).then(([trendRes, trenchRes]) => {
      if (trendRes.success && trendRes.data?.tokens) setTokens(trendRes.data.tokens);
      if (trenchRes.success && trenchRes.data) {
        setTrenchData({
          newPairs: trenchRes.data.newPairs || [],
          finalStretch: trenchRes.data.finalStretch || [],
          migrated: trenchRes.data.migrated || [],
        });
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // Search handler (any SOL coin)
  useEffect(() => {
    if (!search.trim()) return;

    // Auto-detect contract address
    const isCA = search.length >= 32 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(search);
    if (isCA) {
      router.push(`/terminal?ca=${search}`);
      return;
    }

    const timeout = setTimeout(() => {
      apiRequest('GET', `/tokens/search?q=${encodeURIComponent(search.trim())}`).then(r => {
        if (r.success && r.data?.tokens?.length > 0) setTokens(r.data.tokens);
      }).catch(() => {});
    }, 500);
    return () => clearTimeout(timeout);
  }, [search, router]);

  // Sort trending
  const sortedTokens = useMemo(() => {
    const list = [...tokens];
    switch (sortBy) {
      case 'volume': list.sort((a, b) => b.volume24h - a.volume24h); break;
      case 'mcap': list.sort((a, b) => b.marketCap - a.marketCap); break;
      case 'change': list.sort((a, b) => b.priceChange24h - a.priceChange24h); break;
      case 'new': list.sort((a, b) => (a.ageMinutes ?? 9999) - (b.ageMinutes ?? 9999)); break;
    }
    return list;
  }, [tokens, sortBy]);

  // Navigate to terminal on row click
  const goTrade = (address: string) => {
    router.push(`/terminal?ca=${address}`);
  };

  return (
    <AppShell>
      <div className="page-head an">
        <div>
          <h1>Discover</h1>
          <div className="page-head-sub">
            {tab === 'trenches'
              ? 'New pairs, pre-graduation & freshly migrated tokens'
              : tab === 'watchlist'
              ? `Your saved tokens (${watchlist.size})`
              : 'Trending Solana memecoins - live market data'}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="an an1" style={{ marginBottom: 14 }}>
        <input className="inp" placeholder="Search any Solana token or paste contract address..."
          value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', padding: '12px 16px', fontSize: 13 }} />
      </div>

      {/* Main tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 14, alignItems: 'center' }} className="an an1">
        <button onClick={() => setTab('trending')} className={`preset ${tab === 'trending' ? 'on' : ''}`} style={{ padding: '7px 16px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}>
          <IconFire /> Trending
        </button>
        <button onClick={() => setTab('trenches')} className={`preset ${tab === 'trenches' ? 'on' : ''}`} style={{ padding: '7px 16px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}>
          <IconBolt /> Trenches
        </button>
        <button onClick={() => setTab('watchlist')} className={`preset ${tab === 'watchlist' ? 'on' : ''}`} style={{ padding: '7px 16px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 5, color: tab === 'watchlist' ? 'var(--gold)' : undefined }}>
          ⭐ Watchlist{watchlist.size > 0 && <span style={{ fontSize: 9, background: 'var(--gold-bg)', color: 'var(--gold)', padding: '1px 5px', borderRadius: 8, fontWeight: 700 }}>{watchlist.size}</span>}
        </button>
        <div style={{ flex: 1 }} />
        {/* Auto-refresh toggle */}
        <div style={{ display: 'flex', gap: 3, alignItems: 'center', marginRight: 6 }}>
          {autoRefresh > 0 && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 1.5s infinite' }} />}
          {[0, 10000, 30000].map(v => (
            <button key={v} onClick={() => setAutoRefresh(v)} className={`preset ${autoRefresh === v ? 'on' : ''}`} style={{ padding: '4px 8px', fontSize: 9 }}>
              {v === 0 ? 'Off' : `${v / 1000}s`}
            </button>
          ))}
        </div>
        {tab === 'trending' && (
          <div style={{ display: 'flex', gap: 3 }}>
            {([['volume', 'Vol'], ['mcap', 'MCap'], ['change', '24h'], ['new', 'New']] as const).map(([k, l]) => (
              <button key={k} onClick={() => setSortBy(k)} className={`preset ${sortBy === k ? 'on' : ''}`} style={{ padding: '5px 10px', fontSize: 10 }}>{l}</button>
            ))}
          </div>
        )}
        {tab === 'trenches' && (
          <button onClick={() => setShowFilters(!showFilters)} className={`preset ${showFilters ? 'on' : ''}`} style={{ padding: '7px 14px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}>
            <IconFilter /> Filters
          </button>
        )}
      </div>

      {loading ? (
        <div className="card an an2" style={{ padding: '4px 0' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border-0)' }}>
              <div className="skeleton" style={{ width: 32, height: 32, borderRadius: '50%' }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton skel-text" style={{ width: 80 + Math.random() * 40 }} />
                <div className="skeleton skel-text short" style={{ width: 50 }} />
              </div>
              <div className="skeleton skel-text" style={{ width: 50 }} />
              <div className="skeleton skel-text short" style={{ width: 40 }} />
            </div>
          ))}
        </div>
      ) : tab === 'watchlist' ? (
        /* ═══ WATCHLIST TABLE ═══ */
        <div className="card an an2">
          {watchlistTokens.length === 0 ? (
            <div style={{ padding: '50px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>⭐</div>
              <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 8 }}>Your watchlist is empty</div>
              <div style={{ fontSize: 11, color: 'var(--t3)' }}>Star tokens from Trending or Trenches to add them here</div>
            </div>
          ) : (
            <table className="tbl">
              <thead><tr><th>Token</th><th>MCap</th><th>Price</th><th>24h</th><th>Vol</th><th></th></tr></thead>
              <tbody>
                {watchlistTokens.map((t, i) => (
                  <tr key={t.address} onClick={() => goTrade(t.address)} className="haptic" style={{ cursor: 'pointer' }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {t.image ? <img src={t.image} alt={t.symbol} style={{ width: 24, height: 24, borderRadius: '50%' }} /> : <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8 }}>{t.symbol.slice(0, 2)}</div>}
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 12 }}>{t.symbol}</div>
                          <div style={{ fontSize: 9, color: 'var(--t3)' }}>{t.name?.slice(0, 20)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="mono">{fmtMcap(t.marketCap)}</td>
                    <td className="mono">{t.priceUsd < 0.01 ? t.priceUsd.toExponential(2) : `$${t.priceUsd.toFixed(4)}`}</td>
                    <td className={`mono ${t.priceChange24h >= 0 ? 'up' : 'down'}`}>{t.priceChange24h >= 0 ? '+' : ''}{t.priceChange24h.toFixed(1)}%</td>
                    <td className="mono">{fmtVol(t.volume24h)}</td>
                    <td>
                      <button onClick={(e) => { e.stopPropagation(); toggleWatchlist(t.address); }} className="haptic" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 4 }}>⭐</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : tab === 'trending' ? (
        /* ═══ TRENDING TABLE ═══ */
        <div className="card an an2">
          <table className="tbl">
            <thead>
              <tr><th>Token</th><th>MCap</th><th>Price</th><th>24h</th><th>Volume</th><th>Liq</th><th></th></tr>
            </thead>
            <tbody>
              {sortedTokens.map(tk => (
                <tr key={tk.address} onClick={() => goTrade(tk.address)} style={{ cursor: 'pointer' }}>
                  <td>
                    <div className="tk">
                      {tk.image ? (
                        <img src={tk.image} alt={tk.symbol} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid var(--border-1)' }} />
                      ) : (
                        <div className="tk-img">{tk.symbol.slice(0, 2)}</div>
                      )}
                      <div>
                        <div className="tk-name">{tk.symbol}</div>
                        <div className="tk-addr">{tk.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="mono" style={{ fontWeight: 700, color: 'var(--t0)' }}>{fmtMcap(tk.marketCap)}</td>
                  <td className="mono" style={{ color: 'var(--t2)' }}>${tk.priceUsd < 0.01 ? tk.priceUsd.toExponential(2) : tk.priceUsd.toFixed(4)}</td>
                  <td className={`mono ${tk.priceChange24h >= 0 ? 'up' : 'down'}`} style={{ fontWeight: 600 }}>
                    {tk.priceChange24h >= 0 ? '+' : ''}{tk.priceChange24h.toFixed(1)}%
                  </td>
                  <td className="mono" style={{ color: 'var(--t2)' }}>{fmtVol(tk.volume24h)}</td>
                  <td className="mono" style={{ color: 'var(--t2)' }}>{fmtVol(tk.liquidity)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button onClick={(e) => { e.stopPropagation(); goTrade(tk.address); }} className="btn haptic" style={{ padding: '3px 10px', fontSize: 9, fontWeight: 700, marginRight: 4, background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.12)', color: 'var(--green)' }}>
                      Trade
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); toggleWatchlist(tk.address); }} className="haptic" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 4, opacity: watchlist.has(tk.address) ? 1 : 0.3 }} title={watchlist.has(tk.address) ? 'Remove from watchlist' : 'Add to watchlist'}>
                      {watchlist.has(tk.address) ? '⭐' : '☆'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {sortedTokens.length === 0 && (
            <div style={{ padding: '40px 0', textAlign: 'center', fontSize: 12, color: 'var(--t3)' }}>No tokens found.</div>
          )}
        </div>
      ) : (
        /* ═══ TRENCHES — 3-Column Layout ═══ */
        <div className="an an2">
          {/* Filter Panel */}
          {showFilters && (
            <div className="card" style={{ marginBottom: 14, padding: 18 }}>
              <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
                <button onClick={() => setFilters(f => ({ ...f, filterTab: 'protocols' }))} className={`preset ${filters.filterTab === 'protocols' ? 'on' : ''}`} style={{ padding: '6px 14px', fontSize: 11 }}>Protocols</button>
                <button onClick={() => setFilters(f => ({ ...f, filterTab: 'metrics' }))} className={`preset ${filters.filterTab === 'metrics' ? 'on' : ''}`} style={{ padding: '6px 14px', fontSize: 11 }}>$ Metrics</button>
              </div>

              {filters.filterTab === 'protocols' && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--t3)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Protocol</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                    {[
                      { key: '', label: 'All' },
                      { key: 'pump', label: 'Pump.fun' },
                      { key: 'raydium', label: 'Raydium' },
                    ].map(p => (
                      <button key={p.key} onClick={() => setFilters(f => ({ ...f, protocol: f.protocol === p.key ? '' : p.key }))}
                        className={`preset ${filters.protocol === p.key ? 'on' : ''}`} style={{ padding: '6px 14px', fontSize: 11 }}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--t3)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Search Keywords</div>
                  <input className="inp" placeholder="e.g. pepe, cat, dog..." value={filters.keyword}
                    onChange={e => setFilters(f => ({ ...f, keyword: e.target.value }))}
                    style={{ fontSize: 12, padding: '8px 12px' }} />
                </div>
              )}

              {filters.filterTab === 'metrics' && (
                <div>
                  {[
                    { label: 'Market Cap ($)', minKey: 'minMcap' as const, maxKey: 'maxMcap' as const },
                    { label: 'Liquidity ($)', minKey: 'minLiq' as const, maxKey: 'maxLiq' as const },
                    { label: 'Volume ($)', minKey: 'minVol' as const, maxKey: 'maxVol' as const },
                  ].map(f => (
                    <div key={f.label} style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--t3)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>{f.label}</div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input className="inp" type="number" placeholder="Min" value={filters[f.minKey]}
                          onChange={e => setFilters(flt => ({ ...flt, [f.minKey]: e.target.value }))}
                          style={{ flex: 1, fontSize: 12, padding: '8px 12px' }} />
                        <input className="inp" type="number" placeholder="Max" value={filters[f.maxKey]}
                          onChange={e => setFilters(flt => ({ ...flt, [f.maxKey]: e.target.value }))}
                          style={{ flex: 1, fontSize: 12, padding: '8px 12px' }} />
                      </div>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                    <button onClick={() => setFilters(defaultFilters)} className="btn haptic" style={{ fontSize: 10, padding: '6px 14px' }}>Reset</button>
                    <button onClick={() => {
                      setLoading(true);
                      const params = new URLSearchParams();
                      if (filters.minMcap) params.set('minMcap', filters.minMcap);
                      if (filters.maxMcap) params.set('maxMcap', filters.maxMcap);
                      if (filters.minLiq) params.set('minLiq', filters.minLiq);
                      if (filters.maxLiq) params.set('maxLiq', filters.maxLiq);
                      if (filters.minVol) params.set('minVol', filters.minVol);
                      if (filters.maxVol) params.set('maxVol', filters.maxVol);
                      if (filters.protocol) params.set('protocol', filters.protocol);
                      if (filters.keyword) params.set('keyword', filters.keyword);
                      apiRequest('GET', `/tokens/trenches?${params.toString()}`).then(r => {
                        if (r.success && r.data) {
                          setTrenchData({
                            newPairs: r.data.newPairs || [],
                            finalStretch: r.data.finalStretch || [],
                            migrated: r.data.migrated || [],
                          });
                        }
                      }).finally(() => setLoading(false));
                    }} className="btn primary haptic" style={{ fontSize: 10, padding: '6px 14px' }}>Apply Filters</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Three Column Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {/* New Pairs */}
            <TrenchColumn
              title="New Pairs"
              icon={<IconNew />}
              count={trenchData.newPairs.length}
              tokens={trenchData.newPairs}
              accentColor="var(--green)"
              onTokenClick={goTrade}
            />
            {/* Final Stretch */}
            <TrenchColumn
              title="Final Stretch"
              icon={<IconRocket />}
              count={trenchData.finalStretch.length}
              tokens={trenchData.finalStretch}
              accentColor="var(--gold)"
              onTokenClick={goTrade}
            />
            {/* Migrated */}
            <TrenchColumn
              title="Migrated"
              icon={<IconCheck />}
              count={trenchData.migrated.length}
              tokens={trenchData.migrated}
              accentColor="var(--accent-l)"
              onTokenClick={goTrade}
            />
          </div>
        </div>
      )}
    </AppShell>
  );
}

// ─── Trench Column Component ────────────────────────────
function TrenchColumn({ title, icon, count, tokens, accentColor, onTokenClick }: {
  title: string; icon: React.ReactNode; count: number; tokens: Token[];
  accentColor: string; onTokenClick: (addr: string) => void;
}) {
  return (
    <div className="card" style={{ borderColor: `color-mix(in srgb, ${accentColor} 15%, var(--border-1))` }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 14px', borderBottom: '1px dashed var(--border-1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ color: accentColor, display: 'flex', alignItems: 'center' }}>{icon}</div>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--t0)', letterSpacing: 0.5, textTransform: 'uppercase' }}>{title}</span>
        </div>
        <span className="mono" style={{ fontSize: 10, color: accentColor, fontWeight: 700 }}>{count}</span>
      </div>

      <div style={{ maxHeight: 600, overflowY: 'auto' }}>
        {tokens.length === 0 ? (
          <div style={{ padding: '30px 14px', textAlign: 'center', color: 'var(--t3)', fontSize: 11 }}>No tokens in this category</div>
        ) : tokens.map(tk => (
          <div key={tk.address} onClick={() => onTokenClick(tk.address)} className="haptic"
            style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-0)', cursor: 'pointer', transition: 'background 0.1s' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.03)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            {/* Row 1: Token name + Age */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {tk.image ? (
                  <img src={tk.image} alt={tk.symbol} style={{ width: 24, height: 24, borderRadius: '50%', border: '1px solid var(--border-0)' }} />
                ) : (
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--bg-2)', border: '1px solid var(--border-0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: 'var(--t2)' }}>{tk.symbol.slice(0, 2)}</div>
                )}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t0)' }}>{tk.symbol}</div>
                  <div style={{ fontSize: 9, color: 'var(--t3)' }}>{tk.name.length > 18 ? tk.name.slice(0, 18) + '...' : tk.name}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="mono" style={{ fontSize: 11, fontWeight: 700, color: 'var(--t0)' }}>{fmtMcap(tk.marketCap)}</div>
                <div className="mono" style={{ fontSize: 9, color: (tk.ageMinutes ?? 999) < 30 ? 'var(--green)' : 'var(--t3)', fontWeight: 600 }}>{fmtAge(tk.ageMinutes)}</div>
              </div>
            </div>
            {/* Row 2: Stats */}
            <div style={{ display: 'flex', gap: 8, fontSize: 9 }}>
              <span className={`mono ${tk.priceChange24h >= 0 ? 'up' : 'down'}`} style={{ fontWeight: 600 }}>{tk.priceChange24h >= 0 ? '+' : ''}{tk.priceChange24h.toFixed(0)}%</span>
              <span className="mono" style={{ color: 'var(--t3)' }}>V: {fmtVol(tk.volume24h)}</span>
              {tk.liquidity > 0 && <span className="mono" style={{ color: 'var(--t3)' }}>L: {fmtVol(tk.liquidity)}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
