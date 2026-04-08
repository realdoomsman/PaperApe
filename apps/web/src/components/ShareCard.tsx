'use client';
import { useRef, useState, useCallback } from 'react';

interface ShareCardProps {
  tokenSymbol: string;
  pnlPercent: number;
  pnlSol: number;
  entryPrice: number;
  exitPrice?: number;
  investedSol: number;
  username?: string;
  rank?: number;
  tokenImage?: string;
  openedAt?: string;
  closedAt?: string;
  isOpen?: boolean;
  onClose: () => void;
}

const RANKS = [
  { min: 500, label: 'HIMOTHY', emoji: '👑', color: '#ffd700' },
  { min: 100, label: 'DIAMOND', emoji: '💎', color: '#00d4ff' },
  { min: 50, label: 'GOLD', emoji: '🥇', color: '#ffb300' },
  { min: 20, label: 'SILVER', emoji: '🥈', color: '#c0c0c0' },
  { min: 0, label: 'APE', emoji: '🦍', color: '#8b7355' },
];

function getRank(pnl: number) {
  return RANKS.find(r => pnl >= r.min) ?? RANKS[RANKS.length - 1];
}

export default function ShareCard({
  tokenSymbol, pnlPercent, pnlSol, entryPrice, exitPrice, investedSol, username, rank, tokenImage, openedAt, closedAt, isOpen, onClose,
}: ShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const rankData = getRank(pnlPercent);
  const isWin = pnlPercent >= 0;

  // Calculate trade duration
  const tradeDuration = (() => {
    if (!openedAt) return null;
    const end = closedAt ? new Date(closedAt).getTime() : Date.now();
    const start = new Date(openedAt).getTime();
    const ms = end - start;
    if (ms < 3600000) return `${Math.max(1, Math.floor(ms / 60000))} minutes`;
    if (ms < 86400000) return `${Math.floor(ms / 3600000)} hours`;
    return `${Math.floor(ms / 86400000)} days`;
  })();

  const generateImage = useCallback(async () => {
    if (!cardRef.current) return;
    setGenerating(true);

    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
      if (blob) {
        const url = URL.createObjectURL(blob);
        setImageUrl(url);
      }
    } catch (err) {
      console.error('Failed to generate image:', err);
    }

    setGenerating(false);
  }, []);

  const downloadImage = useCallback(() => {
    if (!imageUrl) return;
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `paperape-${tokenSymbol}-${pnlPercent > 0 ? 'W' : 'L'}.png`;
    a.click();
  }, [imageUrl, tokenSymbol, pnlPercent]);

  const shareToX = useCallback(() => {
    const text = pnlPercent >= 0
      ? `Just caught a ${pnlPercent.toFixed(0)}% simulated pump on $${tokenSymbol} 🚀\n\nPracticing for the real trenches on @PaperApe_io\n\n${rankData.emoji} Rank: ${rankData.label}`
      : `Got rugged on $${tokenSymbol} for ${pnlPercent.toFixed(0)}% 💀\n\nLearning from paper losses on @PaperApe_io`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'width=550,height=420');
  }, [tokenSymbol, pnlPercent, rankData]);

  if (!isOpen) return null;

  return (
    <div className="modal-bg" onClick={onClose} style={{ zIndex: 9999 }}>
      <div onClick={e => e.stopPropagation()} style={{ maxWidth: 460, width: '100%', padding: 0 }}>

        {/* The renderable card */}
        <div ref={cardRef} style={{
          width: 440,
          padding: 32,
          borderRadius: 20,
          background: 'linear-gradient(145deg, #1a1410 0%, #0d0b08 50%, #1a1410 100%)',
          border: `2px solid ${isWin ? 'rgba(0,255,136,0.2)' : 'rgba(255,59,92,0.2)'}`,
          position: 'relative',
          overflow: 'hidden',
          fontFamily: "'Inter', system-ui, sans-serif",
        }}>
          {/* Glassmorphism overlay */}
          <div style={{
            position: 'absolute', top: -60, right: -60, width: 200, height: 200,
            borderRadius: '50%', background: isWin ? 'rgba(0,255,136,0.06)' : 'rgba(255,59,92,0.06)',
            filter: 'blur(40px)',
          }} />
          <div style={{
            position: 'absolute', bottom: -40, left: -40, width: 150, height: 150,
            borderRadius: '50%', background: 'rgba(0,200,255,0.04)',
            filter: 'blur(40px)',
          }} />

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {tokenImage ? (
                <img src={tokenImage} alt="" style={{ width: 36, height: 36, borderRadius: '50%' }} />
              ) : (
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #2d6b3f, #1a4528)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, fontWeight: 900, color: '#fff',
                }}>🦍</div>
              )}
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: 1 }}>PAPERAPE</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, textTransform: 'uppercase' }}>Paper Trading Terminal</div>
              </div>
            </div>
            <div style={{
              padding: '4px 10px', borderRadius: 6,
              background: `${rankData.color}15`, border: `1px solid ${rankData.color}30`,
              fontSize: 10, fontWeight: 800, color: rankData.color, letterSpacing: 1,
            }}>
              {rankData.emoji} {rankData.label}
            </div>
          </div>

          {/* Token & PnL */}
          <div style={{ textAlign: 'center', marginBottom: 24, position: 'relative' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 2 }}>
              ${tokenSymbol}
            </div>
            <div style={{
              fontSize: 52, fontWeight: 900, lineHeight: 1,
              color: isWin ? '#00ff88' : '#ff3b5c',
              textShadow: isWin ? '0 0 40px rgba(0,255,136,0.3)' : '0 0 40px rgba(255,59,92,0.3)',
              letterSpacing: -2,
            }}>
              {isWin ? '+' : ''}{pnlPercent.toFixed(0)}%
            </div>
            <div style={{
              fontSize: 16, fontWeight: 700, marginTop: 6,
              color: isWin ? 'rgba(0,255,136,0.7)' : 'rgba(255,59,92,0.7)',
            }}>
              {isWin ? '+' : ''}{pnlSol.toFixed(4)} SOL
            </div>
          </div>

          {/* Stats row */}
          <div style={{
            display: 'flex', gap: 1, marginBottom: 20,
            background: 'rgba(255,255,255,0.03)', borderRadius: 10, overflow: 'hidden',
          }}>
            {[
              { label: 'ENTRY', value: entryPrice < 0.001 ? entryPrice.toExponential(2) : entryPrice.toFixed(6) },
              { label: 'EXIT', value: exitPrice ? (exitPrice < 0.001 ? exitPrice.toExponential(2) : exitPrice.toFixed(6)) : 'OPEN' },
              { label: 'INVESTED', value: `${investedSol.toFixed(2)} SOL` },
            ].map(s => (
              <div key={s.label} style={{ flex: 1, padding: '10px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: 8, fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: 1 }}>{s.label}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.8)', marginTop: 2, fontFamily: 'monospace' }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Username & Duration */}
          {(username || tradeDuration) && (
            <div style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
              {username && <>Traded by <span style={{ fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>{username}</span></>}
              {username && tradeDuration && ' · '}
              {tradeDuration && <>{isWin ? 'Caught' : 'Lost'} in <span style={{ fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>{tradeDuration}</span></>}
            </div>
          )}

          {/* Footer */}
          <div style={{ textAlign: 'center', marginTop: 16, fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: 1 }}>
            SIMULATED TRADE • NO REAL FUNDS • PAPERAPE.IO
          </div>
        </div>

        {/* Action buttons (outside the rendered card) */}
        <div style={{ display: 'flex', gap: 8, marginTop: 12, padding: '0 4px' }}>
          {!imageUrl ? (
            <button onClick={generateImage} disabled={generating} className="btn primary haptic" style={{ flex: 1, justifyContent: 'center', padding: '12px 0', fontSize: 13, fontWeight: 700 }}>
              {generating ? '⏳ Generating...' : '📸 Generate Image'}
            </button>
          ) : (
            <>
              <button onClick={downloadImage} className="btn haptic" style={{ flex: 1, justifyContent: 'center', padding: '12px 0', fontSize: 12, fontWeight: 600 }}>
                💾 Download
              </button>
              <button onClick={shareToX} className="btn primary haptic" style={{ flex: 1, justifyContent: 'center', padding: '12px 0', fontSize: 12, fontWeight: 600 }}>
                Share to 𝕏
              </button>
            </>
          )}
          <button onClick={onClose} className="btn haptic" style={{ padding: '12px 16px', fontSize: 12 }}>✕</button>
        </div>
      </div>
    </div>
  );
}
