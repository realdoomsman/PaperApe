'use client';
import { useState, useMemo } from 'react';
import AppShell from '@/components/AppShell';
import { useMode } from '@/components/ModeContext';
import { IconCompass, IconFilter, IconTrendingUp, IconSearch } from '@/components/Icons';

const CATS = ['All', 'Pump.fun', 'Raydium', 'Trending', 'New (<1h)', 'Most Volume'];

function genTokens(n: number) {
  const names = ['BONK','WIF','POPCAT','MYRO','BOME','SLERF','PENGU','MEW','TREMP','HARAMBE','BOOK','GME','TURBO','ANDY','PEPE2','DEGEN','NEIRO','GOAT','MOG','SPX'];
  const cats = ['pump','ray','pump','ray','pump','pump','ray','pump','ray','pump','pump','ray','ray','pump','pump','ray','pump','pump','ray','pump'];
  return names.slice(0, n).map((sym, i) => {
    const price = Math.random() < 0.5 ? Math.random() * 0.0001 : Math.random() * 5;
    const chg = (Math.random() - 0.35) * 80;
    const vol = (Math.random() * 20).toFixed(1);
    const mcap = (Math.random() * 500).toFixed(0);
    const liq = (Math.random() * 5).toFixed(1);
    const holders = Math.floor(Math.random() * 80000);
    const age = Math.random() < 0.3 ? Math.floor(Math.random() * 55) + 'm' : Math.floor(Math.random() * 48) + 'h';
    const addr = sym.slice(0, 4) + '...' + 'xYzW';
    return { sym, addr, price, chg, vol: vol + 'M', mcap: mcap + 'M', liq: liq + 'M', holders, age, cat: cats[i] };
  });
}

export default function DiscoverPage() {
  const { mode } = useMode();
  const [cat, setCat] = useState('All');
  const [search, setSearch] = useState('');
  const tokens = useMemo(() => genTokens(20), []);

  const filtered = tokens.filter((t) => {
    if (cat === 'Pump.fun') return t.cat === 'pump';
    if (cat === 'Raydium') return t.cat === 'ray';
    if (cat === 'Trending') return t.chg > 10;
    if (cat === 'New (<1h)') return t.age.endsWith('m');
    if (cat === 'Most Volume') return parseFloat(t.vol) > 5;
    return true;
  }).filter((t) => !search || t.sym.toLowerCase().includes(search.toLowerCase()));

  return (
    <AppShell>
      <div className="ptop"><div><h1>Discover</h1><div className="ptop-desc">Scan and filter tokens across Solana DEXes</div></div>
        <div className="ptop-right"><div className="chip"><IconCompass style={{ width: 12, height: 12 }} /> {filtered.length} tokens</div></div></div>

      {/* Search + Filters */}
      <div className="panel an" style={{ marginBottom: 16 }}>
        <div className="panel-pad" style={{ padding: '14px 20px' }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <IconSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--t3)' }} />
              <input className="term-inp" style={{ paddingLeft: 34 }} placeholder="Search tokens..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {CATS.map((c) => <button key={c} className={`preset ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)} style={{ flex: 'none', padding: '5px 14px' }}>{c}</button>)}
          </div>
        </div>
      </div>

      {/* Token Table */}
      <div className="panel an an1">
        <div className="panel-body" style={{ overflowX: 'auto' }}>
          <div className="disc-row disc-head"><div>#</div><div>Token</div><div>Price</div><div>24h %</div><div>Volume</div><div>MCap</div><div>Liquidity</div><div>Action</div></div>
          {filtered.map((t, i) => (
            <div key={t.sym} className="disc-row">
              <div className="mono" style={{ color: 'var(--t3)' }}>{i + 1}</div>
              <div className="tk"><div className="tk-img">{t.sym.slice(0, 2)}</div><div><div className="tk-name">{t.sym}</div><div className="tk-addr">{t.addr}</div></div></div>
              <div className="mono bold" style={{ color: 'var(--t0)' }}>{t.price < 0.001 ? t.price.toExponential(2) : '$' + t.price.toFixed(4)}</div>
              <div className={`mono bold ${t.chg >= 0 ? 'up' : 'down'}`}>{t.chg >= 0 ? '+' : ''}{t.chg.toFixed(1)}%</div>
              <div className="mono" style={{ color: 'var(--t2)' }}>${t.vol}</div>
              <div className="mono" style={{ color: 'var(--t2)' }}>${t.mcap}</div>
              <div className="mono" style={{ color: 'var(--t2)' }}>${t.liq}</div>
              <div><button className="quick-buy">Quick Buy</button></div>
            </div>
          ))}
          {filtered.length === 0 && <div className="panel-empty"><h4>No tokens match filters</h4><p>Try adjusting your search or category</p></div>}
        </div>
      </div>

      {mode === 'beginner' && (
        <div className="panel an an2" style={{ marginTop: 16 }}>
          <div className="panel-pad" style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div className="feat-icon purple"><IconFilter /></div>
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--t0)', marginBottom: 6 }}>How Token Discovery Works</h4>
              <p style={{ fontSize: 12, color: 'var(--t3)', lineHeight: 1.7 }}>
                All data shown here is simulated for paper trading practice. In production, this connects to Birdeye and DexScreener APIs for live token data.
                Use the category filters to focus on specific token types — Pump.fun launches, Raydium pools, or trending tokens by volume.
                Quick Buy opens the Terminal pre-loaded with that token.
              </p>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
