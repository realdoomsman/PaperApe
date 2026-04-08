'use client';
import { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import { apiRequest } from '@/lib/api';

interface TokenData {
  name: string;
  symbol: string;
  address: string;
  priceUsd: number;
  volume24h: number;
  liquidity: number;
  priceChange24h: number;
  mcap: number;
  image?: string;
}

function StatRow({ label, left, right, format = 'text', highlight }: { label: string; left: any; right: any; format?: string; highlight?: 'higher' | 'lower' }) {
  const fmtVal = (v: any) => {
    if (format === 'usd') return v < 0.01 ? `$${Number(v).toExponential(2)}` : `$${Number(v).toLocaleString(undefined, { maximumFractionDigits: 4 })}`;
    if (format === 'pct') return `${Number(v) >= 0 ? '+' : ''}${Number(v).toFixed(2)}%`;
    if (format === 'compact') {
      const n = Number(v);
      if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
      if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
      if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
      return `$${n.toFixed(0)}`;
    }
    return String(v);
  };

  const lNum = Number(left); const rNum = Number(right);
  const leftWins = highlight === 'higher' ? lNum > rNum : highlight === 'lower' ? lNum < rNum : false;
  const rightWins = highlight === 'higher' ? rNum > lNum : highlight === 'lower' ? rNum < lNum : false;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, padding: '8px 0', borderBottom: '1px dashed var(--border-0)', alignItems: 'center' }}>
      <div className="mono" style={{ fontSize: 12, textAlign: 'right', fontWeight: leftWins ? 700 : 400, color: leftWins ? 'var(--green)' : 'var(--t1)' }}>
        {fmtVal(left)} {leftWins && '✓'}
      </div>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--t3)', textAlign: 'center', minWidth: 80, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div className="mono" style={{ fontSize: 12, textAlign: 'left', fontWeight: rightWins ? 700 : 400, color: rightWins ? 'var(--green)' : 'var(--t1)' }}>
        {rightWins && '✓ '}{fmtVal(right)}
      </div>
    </div>
  );
}

export default function ComparePage() {
  const [searchA, setSearchA] = useState('');
  const [searchB, setSearchB] = useState('');
  const [tokenA, setTokenA] = useState<TokenData | null>(null);
  const [tokenB, setTokenB] = useState<TokenData | null>(null);
  const [loadingA, setLoadingA] = useState(false);
  const [loadingB, setLoadingB] = useState(false);
  const [resultsA, setResultsA] = useState<any[]>([]);
  const [resultsB, setResultsB] = useState<any[]>([]);

  const search = async (q: string, side: 'A' | 'B') => {
    if (!q.trim()) return;
    const setResults = side === 'A' ? setResultsA : setResultsB;
    const r = await apiRequest('GET', `/tokens/search?q=${encodeURIComponent(q)}`);
    if (r.success && r.data?.results) setResults(r.data.results.slice(0, 5));
  };

  const selectToken = async (t: any, side: 'A' | 'B') => {
    const setLoading = side === 'A' ? setLoadingA : setLoadingB;
    const setToken = side === 'A' ? setTokenA : setTokenB;
    const setSearch = side === 'A' ? setSearchA : setSearchB;
    const setResults = side === 'A' ? setResultsA : setResultsB;

    setLoading(true);
    setSearch(t.symbol || t.name);
    setResults([]);
    const r = await apiRequest('GET', `/tokens/${t.address}/live`);
    if (r.success && r.data) {
      setToken({
        name: r.data.name || t.name,
        symbol: r.data.symbol || t.symbol,
        address: t.address,
        priceUsd: parseFloat(r.data.priceUsd || 0),
        volume24h: parseFloat(r.data.volume24h || 0),
        liquidity: parseFloat(r.data.liquidity || 0),
        priceChange24h: parseFloat(r.data.priceChange24h || 0),
        mcap: parseFloat(r.data.mcap || 0),
        image: r.data.image,
      });
    }
    setLoading(false);
  };

  const TokenInput = ({ side, search: sq, setSearch: ss, results, loading, token }: any) => (
    <div style={{ flex: 1 }}>
      <div style={{ position: 'relative' }}>
        <input className="inp" value={sq} onChange={e => { ss(e.target.value); search(e.target.value, side); }}
          placeholder={`Search token ${side}...`}
          style={{ width: '100%', fontSize: 13, padding: '10px 14px' }} />
        {results.length > 0 && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: 'var(--bg-0)', border: '1px solid var(--border-1)', borderRadius: 8, marginTop: 4, overflow: 'hidden', boxShadow: '0 8px 20px rgba(0,0,0,0.15)' }}>
            {results.map((r: any) => (
              <button key={r.address} onClick={() => selectToken(r, side)} className="haptic"
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                {r.image && <img src={r.image} alt="" style={{ width: 20, height: 20, borderRadius: 4 }} />}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t0)' }}>{r.symbol}</div>
                  <div style={{ fontSize: 9, color: 'var(--t3)' }}>{r.name}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      {loading && <div className="skeleton" style={{ height: 60, borderRadius: 8, marginTop: 8 }} />}
      {token && !loading && (
        <div style={{ marginTop: 10, padding: '14px 16px', background: 'var(--bg-1)', border: '1px solid var(--border-1)', borderRadius: 10, textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {token.image && <img src={token.image} alt="" style={{ width: 28, height: 28, borderRadius: 6 }} />}
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--t0)' }}>{token.symbol}</div>
              <div style={{ fontSize: 10, color: 'var(--t2)' }}>{token.name}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <AppShell>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--t0)', margin: 0 }}>Token Compare</h1>
        <div style={{ fontSize: 12, color: 'var(--t2)', marginTop: 2 }}>Compare two tokens side-by-side with live data</div>
      </div>

      {/* Search Inputs */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, alignItems: 'flex-start' }}>
        <TokenInput side="A" search={searchA} setSearch={setSearchA} results={resultsA} loading={loadingA} token={tokenA} />
        <div style={{ paddingTop: 12, fontSize: 16, fontWeight: 800, color: 'var(--t3)' }}>VS</div>
        <TokenInput side="B" search={searchB} setSearch={setSearchB} results={resultsB} loading={loadingB} token={tokenB} />
      </div>

      {/* Comparison Table */}
      {tokenA && tokenB ? (
        <div className="card">
          <div className="card-head">
            <span className="card-title">Head-to-Head Comparison</span>
          </div>
          <div className="card-pad">
            {/* Token Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, padding: '12px 0 16px', borderBottom: '2px solid var(--border-1)', marginBottom: 4 }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--t0)' }}>{tokenA.symbol}</div>
                <div style={{ fontSize: 10, color: 'var(--t2)' }}>{tokenA.name}</div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent-l)', alignSelf: 'center' }}>⚔️</div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--t0)' }}>{tokenB.symbol}</div>
                <div style={{ fontSize: 10, color: 'var(--t2)' }}>{tokenB.name}</div>
              </div>
            </div>

            <StatRow label="Price" left={tokenA.priceUsd} right={tokenB.priceUsd} format="usd" />
            <StatRow label="Market Cap" left={tokenA.mcap} right={tokenB.mcap} format="compact" highlight="higher" />
            <StatRow label="24h Volume" left={tokenA.volume24h} right={tokenB.volume24h} format="compact" highlight="higher" />
            <StatRow label="Liquidity" left={tokenA.liquidity} right={tokenB.liquidity} format="compact" highlight="higher" />
            <StatRow label="24h Change" left={tokenA.priceChange24h} right={tokenB.priceChange24h} format="pct" highlight="higher" />

            {/* Score Summary */}
            <div style={{ marginTop: 16, padding: '14px 16px', background: 'var(--bg-2)', borderRadius: 10, textAlign: 'center' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Verdict</div>
              {(() => {
                let aScore = 0, bScore = 0;
                if (tokenA.mcap > tokenB.mcap) aScore++; else bScore++;
                if (tokenA.volume24h > tokenB.volume24h) aScore++; else bScore++;
                if (tokenA.liquidity > tokenB.liquidity) aScore++; else bScore++;
                if (tokenA.priceChange24h > tokenB.priceChange24h) aScore++; else bScore++;
                const winner = aScore > bScore ? tokenA.symbol : aScore < bScore ? tokenB.symbol : null;
                return winner
                  ? <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--green)' }}>🏆 {winner} wins {Math.max(aScore, bScore)}-{Math.min(aScore, bScore)}</div>
                  : <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--gold)' }}>🤝 It&apos;s a tie!</div>;
              })()}
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚔️</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--t1)', marginBottom: 6 }}>Select Two Tokens</div>
          <div style={{ fontSize: 12, color: 'var(--t3)' }}>Search and select tokens above to see their head-to-head comparison</div>
        </div>
      )}
    </AppShell>
  );
}
