'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import AppShell from '@/components/AppShell';
import { IconArrowUp, IconArrowDown } from '@/components/Icons';

const PRESETS = [0.5, 1, 2, 5, 10];
function genBars(n: number): number[] { const b: number[] = []; let p = 0.00001 + Math.random() * 0.0001; for (let i = 0; i < n; i++) { p *= (0.92 + Math.random() * 0.16); b.push(p); } return b; }

const TOKENS = [
  { sym: 'BONK', addr: '8Kag...nRKi', price: 0.00002341 },
  { sym: 'WIF', addr: 'EKpo...vN3a', price: 2.87 },
  { sym: 'POPCAT', addr: '7GCi...xY3q', price: 0.891 },
  { sym: 'MYRO', addr: 'HhJp...kWm4', price: 0.142 },
  { sym: 'BOME', addr: 'ukHH...jy6D', price: 0.00834 },
];

export default function TerminalPage() {
  const [addr, setAddr] = useState('');
  const [tok, setTok] = useState(TOKENS[0]);
  const [amt, setAmt] = useState('1');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [bars, setBars] = useState<number[]>([]);
  const [price, setPrice] = useState(tok.price);
  const [chg, setChg] = useState(0);
  const [toast, setToast] = useState<{ type: string; msg: string } | null>(null);
  const iv = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { setBars(genBars(40)); setPrice(tok.price); setChg((Math.random() - 0.4) * 30); }, [tok]);
  useEffect(() => { iv.current = setInterval(() => setPrice((p) => p * (0.995 + Math.random() * 0.01)), 2000); return () => { if (iv.current) clearInterval(iv.current); }; }, [tok]);

  const mx = Math.max(...(bars.length > 0 ? bars : [1]));
  const exec = useCallback(() => { setToast({ type: side, msg: `${amt} SOL of ${tok.sym} at ${price < 0.001 ? price.toExponential(4) : price.toFixed(6)}` }); setTimeout(() => setToast(null), 3000); }, [side, amt, tok, price]);

  return (
    <AppShell>
      <div className="ptop"><div><h1>Paper Terminal</h1><div className="ptop-desc">Execute simulated trades directly</div></div>
        <div className="ptop-right"><div className="chip"><span className="chip-dot" />Live Simulation</div></div></div>

      {/* Search */}
      <div className="panel an" style={{ marginBottom: 16 }}>
        <div className="panel-pad" style={{ padding: '14px 22px' }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <input className="term-inp" placeholder="Paste token address or search..." value={addr} onChange={(e) => setAddr(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && addr.length >= 10) setTok({ sym: addr.slice(0,4).toUpperCase(), addr: addr.slice(0,4)+'...'+addr.slice(-4), price: Math.random()*0.01 }); }}
              style={{ flex: 1 }} />
            <button className="btn primary" onClick={() => { if (addr.length >= 10) setTok({ sym: addr.slice(0,4).toUpperCase(), addr: addr.slice(0,4)+'...'+addr.slice(-4), price: Math.random()*0.01 }); }}>Load</button>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--t3)', letterSpacing: '0.8px', padding: '6px 0', marginRight: 4 }}>TRENDING:</span>
            {TOKENS.map((t) => <button key={t.sym} className={`preset ${tok.sym === t.sym ? 'on' : ''}`} onClick={() => { setTok(t); setAddr(''); }} style={{ flex: 'none', padding: '5px 14px' }}>{t.sym}</button>)}
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 200, background: toast.type === 'buy' ? 'var(--green-bg)' : 'var(--red-bg)', border: `1px solid ${toast.type === 'buy' ? 'rgba(0,240,160,0.15)' : 'rgba(255,68,102,0.15)'}`, borderRadius: 'var(--r-md)', padding: '14px 20px', animation: 'rise 0.3s var(--ease)', boxShadow: 'var(--shadow-lg, 0 8px 32px rgba(0,0,0,0.5))' }}>
        <div style={{ fontWeight: 700, color: toast.type === 'buy' ? 'var(--green)' : 'var(--red)', fontSize: 14 }}>{toast.type === 'buy' ? 'BUY' : 'SELL'} Executed</div>
        <div style={{ fontSize: 12, color: 'var(--t1)', marginTop: 4 }}>{toast.msg}</div>
      </div>}

      <div className="term-grid an an1">
        <div className="term-chart">
          <div className="term-top">
            <div className="term-tkinfo"><div className="term-tkimg">{tok.sym.slice(0,2)}</div><div><div className="term-tkname">{tok.sym}</div><div className="term-tkaddr">{tok.addr}</div></div></div>
            <div style={{ textAlign: 'right' }}><div className="term-price">{price < 0.001 ? price.toExponential(4) : '$'+price.toFixed(4)}</div><div className={`term-chg ${chg >= 0 ? 'up' : 'down'}`}>{chg >= 0 ? '+' : ''}{chg.toFixed(2)}%</div></div>
          </div>
          <div className="term-body">
            <div className="term-bars">{bars.map((b, i) => <div key={i} className="term-bar" style={{ height: `${(b/mx)*100}%`, background: i < bars.length-1 && bars[i+1] >= b ? 'var(--green)' : 'var(--red)', opacity: 0.3 + (i/bars.length)*0.7 }} />)}</div>
          </div>
          <div className="term-stats-row">
            {[{ l:'Vol 24h', v:'$'+(Math.random()*10).toFixed(2)+'M' }, { l:'Liquidity', v:'$'+(Math.random()*2).toFixed(2)+'M' }, { l:'MCap', v:'$'+(Math.random()*50).toFixed(1)+'M' }, { l:'Holders', v:Math.floor(Math.random()*50000).toLocaleString() }]
              .map((s) => <div key={s.l} className="term-stat"><div className="term-stat-l">{s.l}</div><div className="term-stat-v">{s.v}</div></div>)}
          </div>
        </div>

        <div className="term-panel">
          <div className="term-panel-title">Place Order</div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
            <button className={`preset ${side === 'buy' ? 'on' : ''}`} onClick={() => setSide('buy')} style={{ flex: 1, color: side === 'buy' ? 'var(--green)' : undefined, borderColor: side === 'buy' ? 'rgba(0,240,160,0.3)' : undefined, background: side === 'buy' ? 'var(--green-bg)' : undefined }}>BUY</button>
            <button className={`preset ${side === 'sell' ? 'on' : ''}`} onClick={() => setSide('sell')} style={{ flex: 1, color: side === 'sell' ? 'var(--red)' : undefined, borderColor: side === 'sell' ? 'rgba(255,68,102,0.3)' : undefined, background: side === 'sell' ? 'var(--red-bg)' : undefined }}>SELL</button>
          </div>
          <div className="term-inp-group"><div className="term-inp-label">Amount (SOL)</div><input className="term-inp" type="number" step="0.1" min="0" value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="0.00" /></div>
          <div className="presets">{PRESETS.map((a) => <button key={a} className={`preset ${amt === String(a) ? 'on' : ''}`} onClick={() => setAmt(String(a))}>{a}</button>)}</div>
          <div className="term-inp-group"><div className="term-inp-label">Slippage</div><div style={{ display: 'flex', gap: 6 }}>{['1%','5%','10%','15%'].map((s) => <button key={s} className="preset" style={{ flex: 1 }}>{s}</button>)}</div></div>
          <div style={{ background: 'var(--bg-2)', borderRadius: 'var(--r-sm)', padding: '12px 14px', margin: '8px 0 16px' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--t3)', letterSpacing: '0.5px', marginBottom: 6, textTransform: 'uppercase' as const }}>Est. {side === 'buy' ? 'Tokens' : 'SOL'}</div>
            <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--t0)' }}>
              {side === 'buy' ? (parseFloat(amt||'0')/price).toLocaleString(undefined,{maximumFractionDigits:0}) : parseFloat(amt||'0').toFixed(4)}
              <span style={{ fontSize: 11, color: 'var(--t3)', marginLeft: 4 }}>{side === 'buy' ? tok.sym : 'SOL'}</span>
            </div>
          </div>
          {side === 'buy' ? <button className="buy-btn" onClick={exec}><IconArrowUp style={{ display:'inline', width:16, height:16, verticalAlign:'-3px', marginRight:6 }} />Buy {tok.sym}</button>
            : <button className="sell-btn" onClick={exec}><IconArrowDown style={{ display:'inline', width:16, height:16, verticalAlign:'-3px', marginRight:6 }} />Sell {tok.sym}</button>}
          <div style={{ fontSize: 11, color: 'var(--t3)', textAlign: 'center', marginTop: 8 }}>Simulated execution with estimated fees</div>
        </div>
      </div>
    </AppShell>
  );
}
