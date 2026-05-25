'use client';
import { useEffect, useRef, useState } from 'react';

interface PaperChartProps {
  pairAddress?: string;
  tokenAddress?: string;
  height?: number;
  entryPrice?: number;     // USD entry price
  currentPrice?: number;   // USD current price
  tp?: number;            // Take profit price (USD)
  sl?: number;            // Stop loss price (USD)
  positionSize?: number;   // SOL invested
}

function PriceMarker({ label, price, color, position, isCurrent }: {
  label: string; price: number; color: string; position: number; isCurrent?: boolean;
}) {
  const clampedPos = Math.max(5, Math.min(95, position));
  return (
    <div style={{
      position: 'absolute',
      top: `${clampedPos}%`,
      left: 0,
      right: 0,
      pointerEvents: 'none',
      zIndex: 5,
      transition: 'top 0.3s ease',
    }}>
      {/* Dashed line */}
      <div style={{
        width: '100%',
        borderTop: `1.5px ${isCurrent ? 'solid' : 'dashed'} ${color}`,
        opacity: isCurrent ? 0.4 : 0.7,
      }} />
      {/* Label */}
      <div style={{
        position: 'absolute',
        right: 8,
        top: -10,
        background: color,
        color: '#fff',
        padding: '2px 8px',
        borderRadius: 3,
        fontSize: 9,
        fontWeight: 700,
        fontFamily: "'Special Elite', monospace",
        letterSpacing: 0.5,
        whiteSpace: 'nowrap',
        boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
      }}>
        {label}: ${price < 0.01 ? price.toExponential(2) : price.toFixed(4)}
      </div>
    </div>
  );
}

export default function PaperChart({ pairAddress, tokenAddress, height = 400, entryPrice, currentPrice, tp, sl, positionSize }: PaperChartProps) {
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

  // Calculate marker positions (entry relative to current price)
  const hasPosition = entryPrice && entryPrice > 0 && currentPrice && currentPrice > 0;
  let entryPos = 50, tpPos = 20, slPos = 80;
  let pnlPercent = 0;

  if (hasPosition) {
    // Price range for chart: show +/- 30% from current price
    const rangePercent = 0.30;
    const high = currentPrice * (1 + rangePercent);
    const low = currentPrice * (1 - rangePercent);
    const range = high - low;

    // Position: 0% = top (high price), 100% = bottom (low price)
    entryPos = range > 0 ? ((high - entryPrice) / range) * 100 : 50;
    pnlPercent = ((currentPrice - entryPrice) / entryPrice) * 100;

    if (tp && tp > 0) {
      tpPos = range > 0 ? ((high - tp) / range) * 100 : 20;
    }
    if (sl && sl > 0) {
      slPos = range > 0 ? ((high - sl) / range) * 100 : 80;
    }
  }

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

      {/* ═══ Entry Price Overlay ═══ */}
      {hasPosition && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          zIndex: 4,
        }}>
          {/* Entry price line */}
          <PriceMarker
            label={`Entry ${pnlPercent >= 0 ? '▲' : '▼'} ${pnlPercent >= 0 ? '+' : ''}${pnlPercent.toFixed(1)}%`}
            price={entryPrice}
            color={pnlPercent >= 0 ? '#10b981' : '#ef4444'}
            position={entryPos}
          />

          {/* Take profit line */}
          {tp && tp > 0 && (
            <PriceMarker label="TP" price={tp} color="#10b981" position={tpPos} />
          )}

          {/* Stop loss line */}
          {sl && sl > 0 && (
            <PriceMarker label="SL" price={sl} color="#ef4444" position={slPos} />
          )}

          {/* Position info badge (top-left) */}
          <div style={{
            position: 'absolute',
            top: 8,
            left: 8,
            background: 'rgba(30,25,20,0.85)',
            border: `1px solid ${pnlPercent >= 0 ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
            borderRadius: 6,
            padding: '6px 10px',
            zIndex: 6,
            backdropFilter: 'blur(8px)',
          }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2 }}>
              Your Position
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
              <span style={{
                fontSize: 13,
                fontWeight: 700,
                fontFamily: "'Special Elite', monospace",
                color: pnlPercent >= 0 ? '#10b981' : '#ef4444',
              }}>
                {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
              </span>
              {positionSize && (
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace' }}>
                  {positionSize.toFixed(2)} SOL
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
