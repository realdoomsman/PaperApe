'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * HONEYPOT SIMULATOR
 * Mimics the SQUID token crash of 2021.
 * - Chart goes parabolic automatically
 * - User is prompted to buy
 * - When they try to sell, the button is disabled
 * - "Transfer From Not Allowed (Honeypot Detected)" error
 * - Chart crashes to zero
 */

type Phase = 'watching' | 'bought' | 'trapped' | 'crashed';

export default function HoneypotSimulator({ onComplete }: { onComplete?: () => void }) {
  const [phase, setPhase] = useState<Phase>('watching');
  const [price, setPrice] = useState(0.001);
  const [priceHistory, setPriceHistory] = useState<number[]>([0.001]);
  const [balance, setBalance] = useState(10); // 10 fake SOL
  const [tokens, setTokens] = useState(0);
  const [invested, setInvested] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<number | null>(null);

  // Parabolic price simulation
  useEffect(() => {
    if (phase === 'crashed') return;

    let tick = 0;
    intervalRef.current = window.setInterval(() => {
      tick++;

      if (phase === 'watching' || phase === 'bought') {
        // Parabolic rise
        setPrice(prev => {
          const growth = 1 + (0.03 + Math.random() * 0.08) * (1 + tick * 0.01);
          const newPrice = prev * growth;
          setPriceHistory(h => [...h.slice(-80), newPrice]);
          return newPrice;
        });
      }
    }, 200);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [phase]);

  // Draw chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = '#1a1410';
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const y = (h / 5) * i;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    if (priceHistory.length < 2) return;

    const maxP = Math.max(...priceHistory) * 1.1;
    const minP = Math.min(...priceHistory) * 0.9;
    const range = maxP - minP || 1;

    // Draw line
    ctx.beginPath();
    ctx.strokeStyle = phase === 'crashed' ? '#8b2020' : '#2d6b3f';
    ctx.lineWidth = 2;

    priceHistory.forEach((p, i) => {
      const x = (i / (priceHistory.length - 1)) * w;
      const y = h - ((p - minP) / range) * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Fill under line
    const lastX = w;
    const lastY = h - ((priceHistory[priceHistory.length - 1] - minP) / range) * h;
    ctx.lineTo(lastX, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fillStyle = phase === 'crashed' ? 'rgba(139,32,32,0.15)' : 'rgba(45,107,63,0.15)';
    ctx.fill();

    // "SQUID" label
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '10px monospace';
    ctx.fillText('SQUID / SOL', 8, 16);

    // Price label
    ctx.fillStyle = phase === 'crashed' ? '#8b2020' : '#2d6b3f';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`$${price.toFixed(price > 1 ? 2 : 6)}`, 8, 32);
  }, [priceHistory, phase, price]);

  const handleBuy = useCallback(() => {
    if (phase !== 'watching') return;
    const buyAmount = 5;
    const tokensReceived = buyAmount / price;
    setBalance(b => b - buyAmount);
    setTokens(tokensReceived);
    setInvested(buyAmount);
    setPhase('bought');
  }, [phase, price]);

  const handleSell = useCallback(() => {
    if (phase !== 'bought') return;
    setPhase('trapped');
    setErrorMsg('❌ Transfer From Not Allowed');
    setShowWarning(true);

    // After 2s, crash the chart
    setTimeout(() => {
      setErrorMsg('🚨 HONEYPOT DETECTED — Contract blocks all sells');
      if (intervalRef.current) clearInterval(intervalRef.current);

      // Crash animation
      let crashTick = 0;
      const crashInterval = setInterval(() => {
        crashTick++;
        setPrice(prev => {
          const newPrice = prev * (0.5 - Math.random() * 0.3);
          if (newPrice < 0.0001) {
            clearInterval(crashInterval);
            setPhase('crashed');
            return 0.0000001;
          }
          setPriceHistory(h => [...h.slice(-80), newPrice]);
          return newPrice;
        });
      }, 100);
    }, 2000);
  }, [phase]);

  const pnl = tokens > 0 ? (tokens * price - invested) : 0;
  const pnlPct = invested > 0 ? ((tokens * price - invested) / invested * 100) : 0;
  const currentValue = tokens * price;

  return (
    <div style={{ background: 'var(--bg-2)', borderRadius: 12, border: '1px solid var(--border-1)', overflow: 'hidden', marginTop: 20 }}>
      {/* Header */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-0)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--t0)' }}>🍯 Honeypot Simulator</div>
          <div style={{ fontSize: 11, color: 'var(--t3)' }}>Experience the SQUID token crash — safely</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {phase !== 'watching' && (
            <div style={{ textAlign: 'right' }}>
              <div className="mono" style={{ fontSize: 10, color: 'var(--t3)' }}>YOUR POSITION</div>
              <div className={`mono ${pnl >= 0 ? 'up' : 'down'}`} style={{ fontSize: 13, fontWeight: 700 }}>
                {pnl >= 0 ? '+' : ''}{pnl.toFixed(4)} SOL ({pnlPct.toFixed(0)}%)
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <div style={{ padding: '0 18px', position: 'relative' }}>
        <canvas ref={canvasRef} width={600} height={200} style={{ width: '100%', height: 200, borderRadius: 8 }} />

        {/* FOMO overlay on watching phase */}
        {phase === 'watching' && priceHistory.length > 20 && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(0,0,0,0.8)', padding: '14px 24px', borderRadius: 10, textAlign: 'center', border: '1px solid var(--accent-glow)' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent-l)', marginBottom: 4 }}>🚀 SQUID is PUMPING</div>
            <div style={{ fontSize: 11, color: 'var(--t2)' }}>+{pnlPct > 0 ? pnlPct.toFixed(0) : ((price / 0.001 - 1) * 100).toFixed(0)}% and climbing...</div>
          </div>
        )}

        {/* Crash overlay */}
        {phase === 'crashed' && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(139,32,32,0.9)', padding: '18px 28px', borderRadius: 12, textAlign: 'center', border: '2px solid #ff3b5c' }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', marginBottom: 4 }}>RUG PULLED</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>You lost {invested.toFixed(2)} SOL</div>
          </div>
        )}
      </div>

      {/* Error message */}
      {errorMsg && (
        <div style={{ margin: '12px 18px', padding: '12px 16px', background: 'var(--red-bg)', border: '1px solid rgba(255,59,92,0.2)', borderRadius: 8, fontSize: 13, fontWeight: 600, color: 'var(--red)', fontFamily: 'var(--font-mono)' }}>
          {errorMsg}
        </div>
      )}

      {/* Controls */}
      <div style={{ padding: '14px 18px', display: 'flex', gap: 8 }}>
        {phase === 'watching' && (
          <>
            <div style={{ flex: 1, padding: '10px 14px', background: 'var(--bg-3)', borderRadius: 8 }}>
              <div style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 600 }}>BALANCE</div>
              <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--t0)' }}>{balance.toFixed(2)} SOL</div>
            </div>
            <button onClick={handleBuy} className="btn buy haptic" style={{ flex: 1, justifyContent: 'center', padding: '14px 0', fontSize: 14, fontWeight: 700 }}>
              BUY 5 SOL 🚀
            </button>
          </>
        )}

        {phase === 'bought' && (
          <>
            <div style={{ flex: 1 }}>
              <div style={{ padding: '10px 14px', background: 'var(--bg-3)', borderRadius: 8 }}>
                <div style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 600 }}>YOUR TOKENS</div>
                <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: 'var(--t0)' }}>{tokens.toLocaleString(undefined, { maximumFractionDigits: 0 })} SQUID</div>
                <div className="mono up" style={{ fontSize: 12 }}>Value: {currentValue.toFixed(4)} SOL</div>
              </div>
            </div>
            <button onClick={handleSell} className="btn sell haptic" style={{ flex: 1, justifyContent: 'center', padding: '14px 0', fontSize: 14, fontWeight: 700, animation: 'pulse 1.5s infinite' }}>
              SELL — TAKE PROFIT 💰
            </button>
          </>
        )}

        {(phase === 'trapped' || phase === 'crashed') && (
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <div style={{ flex: 1, padding: '10px 14px', background: 'var(--bg-3)', borderRadius: 8 }}>
                <div style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 600 }}>INVESTED</div>
                <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: 'var(--t0)' }}>{invested.toFixed(2)} SOL</div>
              </div>
              <div style={{ flex: 1, padding: '10px 14px', background: 'var(--bg-3)', borderRadius: 8 }}>
                <div style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 600 }}>CURRENT VALUE</div>
                <div className="mono down" style={{ fontSize: 14, fontWeight: 700 }}>{currentValue.toFixed(6)} SOL</div>
              </div>
            </div>
            <button disabled style={{ width: '100%', padding: '12px 0', background: 'var(--bg-3)', border: '1px solid var(--border-0)', borderRadius: 8, fontSize: 12, fontWeight: 600, color: 'var(--t3)', cursor: 'not-allowed', opacity: 0.5 }}>
              SELL DISABLED — CONTRACT BLOCKS TRANSFERS
            </button>
          </div>
        )}
      </div>

      {/* Lesson after crash */}
      {phase === 'crashed' && (
        <div style={{ margin: '0 18px 18px', padding: '16px 18px', background: 'rgba(45,107,63,0.08)', border: '1px solid rgba(45,107,63,0.15)', borderRadius: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)', marginBottom: 8 }}>🧠 What You Learned</div>
          <div style={{ fontSize: 12, color: 'var(--t1)', lineHeight: 1.7 }}>
            <strong>Honeypots</strong> are tokens where the smart contract blocks sell transactions for everyone except the deployer.
            The dev buys early, lets FOMO drive the price up, then sells their allocation while everyone else is trapped.
          </div>
          <div style={{ fontSize: 12, color: 'var(--t2)', marginTop: 8, lineHeight: 1.7 }}>
            <strong>How to protect yourself:</strong> Always check sell volume before buying. Use honeypot detection tools (e.g., RugCheck.xyz).
            If a token has many buys but zero sells, it is almost certainly a honeypot.
          </div>
          {onComplete && (
            <button onClick={onComplete} className="btn primary haptic" style={{ marginTop: 12, fontSize: 12, padding: '8px 18px' }}>
              ✅ Complete Lesson — Claim Reward
            </button>
          )}
        </div>
      )}
    </div>
  );
}
