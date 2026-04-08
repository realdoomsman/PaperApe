'use client';
import { useEffect, useRef, useState } from 'react';

interface PaperChartProps {
  pairAddress?: string;
  tokenAddress?: string;
  height?: number;
}

export default function PaperChart({ pairAddress, tokenAddress, height = 400 }: PaperChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [resolvedPair, setResolvedPair] = useState<string>(pairAddress || '');
  const [loading, setLoading] = useState(!pairAddress);
  const [error, setError] = useState(false);

  // If we only have a token address, resolve it to a pair address via DexScreener
  useEffect(() => {
    if (pairAddress) {
      setResolvedPair(pairAddress);
      setLoading(false);
      return;
    }
    if (!tokenAddress) { setLoading(false); setError(true); return; }

    setLoading(true);
    setError(false);

    fetch(`https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`)
      .then(r => r.json())
      .then(data => {
        const pairs = (data.pairs ?? [])
          .filter((p: any) => p.chainId === 'solana')
          .sort((a: any, b: any) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0));
        if (pairs.length > 0) {
          setResolvedPair(pairs[0].pairAddress);
        } else {
          setError(true);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [pairAddress, tokenAddress]);

  if (loading) {
    return (
      <div style={{ width: '100%', height, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e8dfc8', borderRadius: 4 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 24, height: 24, border: '3px solid var(--border-1)', borderTopColor: 'var(--t0)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 10px' }} />
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', letterSpacing: 1, textTransform: 'uppercase' }}>Loading chart...</div>
        </div>
      </div>
    );
  }

  if (error || !resolvedPair) {
    return (
      <div style={{ width: '100%', height, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e8dfc8', borderRadius: 4 }}>
        <div style={{ textAlign: 'center', color: 'var(--t3)', fontSize: 12 }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>--</div>
          <div style={{ fontWeight: 700 }}>Chart unavailable</div>
          <div style={{ marginTop: 4, fontSize: 10 }}>No pair data found for this token</div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ width: '100%', height, position: 'relative', overflow: 'hidden', borderRadius: 4 }}>
      <iframe
        src={`https://dexscreener.com/solana/${resolvedPair}?embed=1&theme=light&info=0&trades=0`}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          borderRadius: 4,
        }}
        title="DexScreener Chart"
        allow="clipboard-write"
        loading="lazy"
      />
    </div>
  );
}
