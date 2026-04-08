'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

const STEPS = [
  {
    title: 'Welcome to PaperApe! 🦍',
    desc: 'The ultimate Solana memecoin trading simulator. Practice trading with zero risk using simulated SOL.',
    icon: '🎉',
  },
  {
    title: 'You start with 100 Paper SOL',
    desc: 'Use your paper balance to buy and sell any Solana token with live market prices. Slippage, fees, and execution are all simulated realistically.',
    icon: '💰',
  },
  {
    title: 'Track your performance',
    desc: 'Monitor your PnL, win rate, and trading streaks. Climb the leaderboard and prove your alpha — all risk-free.',
    icon: '📊',
  },
  {
    title: 'Learn with the Academy',
    desc: '50+ interactive lessons on trading, scam detection, and DeFi fundamentals. Earn rewards as you learn.',
    icon: '🎓',
  },
  {
    title: 'Pro tips',
    desc: 'Press ⌘K anytime for quick navigation. Use keyboard shortcuts in the terminal (B=Buy, S=Sell, 1-7=Amount). Star tokens to add them to your watchlist.',
    icon: '⚡',
  },
];

export default function OnboardingModal() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const seen = localStorage.getItem('pa_onboarded');
    if (!seen) setShow(true);
  }, []);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem('pa_onboarded', '1');
  };

  if (!show) return null;

  const s = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <>
      <div onClick={dismiss} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9997,
        backdropFilter: 'blur(6px)', animation: 'fadeInUp 0.15s ease',
      }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: '100%', maxWidth: 440, zIndex: 9998,
        background: 'var(--bg-0)', border: '2px solid var(--border-1)',
        borderRadius: 20, boxShadow: '0 24px 48px rgba(0,0,0,0.3)',
        overflow: 'hidden', animation: 'fadeInUp 0.2s ease',
      }}>
        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center', padding: '16px 0 0' }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              width: i === step ? 18 : 6, height: 6, borderRadius: 3,
              background: i === step ? 'var(--accent-l)' : 'var(--bg-3)',
              transition: 'all 0.2s',
            }} />
          ))}
        </div>

        <div style={{ padding: '24px 32px 28px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>{s.icon}</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--t0)', margin: '0 0 10px' }}>{s.title}</h2>
          <p style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.7, margin: '0 0 24px' }}>{s.desc}</p>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            {step > 0 && (
              <button onClick={() => setStep(step - 1)} className="btn haptic"
                style={{ padding: '10px 20px', fontSize: 12, border: '1px solid var(--border-1)' }}>
                Back
              </button>
            )}
            {isLast ? (
              <Link href="/terminal" onClick={dismiss} className="btn primary haptic"
                style={{ padding: '10px 24px', fontSize: 12 }}>
                Start Trading →
              </Link>
            ) : (
              <button onClick={() => setStep(step + 1)} className="btn primary haptic"
                style={{ padding: '10px 24px', fontSize: 12 }}>
                Next
              </button>
            )}
          </div>

          <button onClick={dismiss} style={{
            marginTop: 16, background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 10, color: 'var(--t3)',
          }}>
            Skip intro
          </button>
        </div>
      </div>
    </>
  );
}
