'use client';
import { useEffect, useRef, useState } from 'react';

export interface ChartTradeMarker {
  id: string;
  type: 'buy' | 'sell' | 'sell_init';
  tokenAddress?: string;
  tokenSymbol?: string;
  priceUsd: number;
  marketCapUsd?: number;
  amountSol?: number;
  createdAt?: string;
}

interface PaperChartProps {
  pairAddress?: string;
  tokenAddress?: string;
  height?: number;
  entryPrice?: number;     // USD entry price
  currentPrice?: number;   // USD current price
  tp?: number;            // Take profit price (USD)
  sl?: number;            // Stop loss price (USD)
  positionSize?: number;   // SOL invested
  tradeMarkers?: ChartTradeMarker[];
}

function formatUsd(price: number) {
  if (!Number.isFinite(price) || price <= 0) return '-';
  if (price < 0.000001) return `$${price.toExponential(2)}`;
  if (price < 0.01) return `$${price.toExponential(3)}`;
  if (price < 1) return `$${price.toFixed(5)}`;
  return `$${price.toFixed(4)}`;
}

function formatMcap(value?: number) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 'MC n/a';
  if (n >= 1_000_000_000) return `MC $${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `MC $${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `MC $${(n / 1_000).toFixed(1)}K`;
  return `MC $${n.toFixed(0)}`;
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
        {label}: {formatUsd(price)}
      </div>
    </div>
  );
}

function TradeMarker({ marker, position, offset }: {
  marker: ChartTradeMarker;
  position: number;
  offset: number;
}) {
  const clampedPos = Math.max(6, Math.min(94, position));
  const isBuy = marker.type === 'buy';
  const color = isBuy ? '#10b981' : marker.type === 'sell_init' ? '#b7791f' : '#ef4444';
  const title = marker.type === 'sell_init' ? 'SELL INIT' : isBuy ? 'BUY' : 'SELL';
  const yOffset = offset % 2 === 0 ? -26 : 10;

  return (
    <div style={{
      position: 'absolute',
      top: `${clampedPos}%`,
      left: 0,
      right: 0,
      pointerEvents: 'none',
      zIndex: 7,
      transition: 'top 0.3s ease',
    }}>
      <div style={{
        width: '100%',
        borderTop: `2px solid ${color}`,
        opacity: 0.78,
        boxShadow: `0 0 8px ${color}33`,
      }} />
      <div style={{
        position: 'absolute',
        left: 8,
        top: yOffset,
        background: 'rgba(31, 26, 20, 0.92)',
        color: '#fff',
        border: `1px solid ${color}`,
        borderLeft: `5px solid ${color}`,
        padding: '5px 8px 4px',
        borderRadius: 5,
        fontSize: 9,
        fontWeight: 700,
        fontFamily: "'Special Elite', monospace",
        whiteSpace: 'nowrap',
        maxWidth: 'calc(100% - 16px)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        boxShadow: '0 4px 12px rgba(0,0,0,0.22)',
      }}>
        <div style={{ color, lineHeight: 1.1 }}>{title} {formatMcap(marker.marketCapUsd)}</div>
        <div style={{ color: 'rgba(255,255,255,0.68)', fontSize: 8, marginTop: 2, lineHeight: 1.1 }}>
          {formatUsd(marker.priceUsd)}{marker.amountSol ? ` / ${marker.amountSol.toFixed(3)} SOL` : ''}
        </div>
      </div>
    </div>
  );
}

export default function PaperChart({ pairAddress, tokenAddress, height = 400, entryPrice, currentPrice, tp, sl, positionSize, tradeMarkers = [] }: PaperChartProps) {
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

  const visibleTradeMarkers = tradeMarkers
    .filter(m => Number.isFinite(m.priceUsd) && m.priceUsd > 0)
    .slice(-8);

  // Calculate marker positions against a padded local price range.
  const hasPosition = !!(entryPrice && entryPrice > 0 && currentPrice && currentPrice > 0);
  const pricePoints = [
    currentPrice,
    entryPrice,
    tp,
    sl,
    ...visibleTradeMarkers.map(m => m.priceUsd),
  ].filter((p): p is number => Number.isFinite(Number(p)) && Number(p) > 0);
  const anchorPrice = currentPrice && currentPrice > 0
    ? currentPrice
    : entryPrice && entryPrice > 0
      ? entryPrice
      : visibleTradeMarkers.length > 0
        ? visibleTradeMarkers[visibleTradeMarkers.length - 1].priceUsd
        : 0;

  let high = anchorPrice > 0 ? anchorPrice * 1.3 : 1;
  let low = anchorPrice > 0 ? anchorPrice * 0.7 : 0;
  if (pricePoints.length > 0) {
    const minPrice = Math.min(...pricePoints);
    const maxPrice = Math.max(...pricePoints);
    const spread = Math.max(maxPrice - minPrice, maxPrice * 0.08);
    high = Math.max(anchorPrice * 1.3, maxPrice + spread * 0.18);
    low = Math.max(0, Math.min(anchorPrice * 0.7, minPrice - spread * 0.18));
    if (high <= low) {
      high = maxPrice * 1.12;
      low = minPrice * 0.88;
    }
  }
  const range = Math.max(high - low, Number.EPSILON);
  const priceToPosition = (price: number) => ((high - price) / range) * 100;

  let entryPos = 50, tpPos = 20, slPos = 80;
  let pnlPercent = 0;

  if (hasPosition) {
    // Position: 0% = top (high price), 100% = bottom (low price)
    entryPos = priceToPosition(entryPrice);
    pnlPercent = ((currentPrice - entryPrice) / entryPrice) * 100;

    if (tp && tp > 0) {
      tpPos = priceToPosition(tp);
    }
    if (sl && sl > 0) {
      slPos = priceToPosition(sl);
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

      {/* ═══ Entry / Fill Overlay ═══ */}
      {(hasPosition || visibleTradeMarkers.length > 0) && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          zIndex: 4,
        }}>
          {visibleTradeMarkers.map((marker, i) => (
            <TradeMarker
              key={marker.id}
              marker={marker}
              position={priceToPosition(marker.priceUsd)}
              offset={i}
            />
          ))}

          {/* Entry price line */}
          {hasPosition && (
            <PriceMarker
              label={`Entry ${pnlPercent >= 0 ? '▲' : '▼'} ${pnlPercent >= 0 ? '+' : ''}${pnlPercent.toFixed(1)}%`}
              price={entryPrice}
              color={pnlPercent >= 0 ? '#10b981' : '#ef4444'}
              position={entryPos}
            />
          )}

          {/* Take profit line */}
          {hasPosition && tp && tp > 0 && (
            <PriceMarker label="TP" price={tp} color="#10b981" position={tpPos} />
          )}

          {/* Stop loss line */}
          {hasPosition && sl && sl > 0 && (
            <PriceMarker label="SL" price={sl} color="#ef4444" position={slPos} />
          )}

          {/* Position info badge (top-left) */}
          {hasPosition && (
            <div style={{
              position: 'absolute',
              top: 8,
              left: visibleTradeMarkers.length > 0 ? 132 : 8,
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
          )}
        </div>
      )}
    </div>
  );
}
