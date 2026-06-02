'use client';
import { useState, useEffect } from 'react';

const STEPS = [
  {
    title: 'Welcome to PaperApe',
    body: 'PaperApe is a Solana memecoin paper trading simulator. You trade with simulated SOL using real-time market prices. No real money, no risk -- just pure practice.',
  },
  {
    title: 'Search any token',
    body: 'Head to the Terminal and search for any Solana token by name, ticker, or contract address. Live prices stream in from Jupiter and Birdeye so you always see the real market.',
  },
  {
    title: 'Make your first trade',
    body: 'You start with 100 simulated SOL. Pick a token, set your amount, and hit Buy. Trades simulate realistic slippage, priority fees, and on-chain execution.',
  },
  {
    title: 'Track your portfolio',
    body: 'Your Dashboard shows open positions, PnL, win rate, and equity over time. Climb the Leaderboard and prove your alpha against other traders.',
  },
];

export default function OnboardingGuide() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      if (localStorage.getItem('pa_onboarded') !== 'true') {
        setVisible(true);
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem('pa_onboarded', 'true');
    } catch {}
  };

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      dismiss();
    }
  };

  if (!visible) return null;

  const current = STEPS[step];

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0,0,0,0.65)',
      backdropFilter: 'blur(6px)',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 420,
        margin: '0 16px',
        background: 'var(--bg-1)',
        border: '1px solid var(--border-1)',
        borderRadius: 16,
        padding: '32px 28px 24px',
        position: 'relative',
      }}>
        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
          {STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 2,
                background: i <= step ? 'var(--green)' : 'var(--border-1)',
                transition: 'background 0.2s',
              }}
            />
          ))}
        </div>

        {/* Step count */}
        <div style={{
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--green)',
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          marginBottom: 8,
        }}>
          Step {step + 1} of {STEPS.length}
        </div>

        {/* Title */}
        <h2 style={{
          fontSize: 20,
          fontWeight: 800,
          color: 'var(--t0)',
          marginBottom: 12,
          letterSpacing: -0.3,
        }}>
          {current.title}
        </h2>

        {/* Body */}
        <p style={{
          fontSize: 13,
          lineHeight: 1.7,
          color: 'var(--t2, #aaa)',
          marginBottom: 28,
        }}>
          {current.body}
        </p>

        {/* Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={dismiss}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--t3, #666)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              padding: '8px 4px',
            }}
          >
            Skip
          </button>
          <button
            onClick={next}
            style={{
              background: 'var(--green)',
              color: '#000',
              border: 'none',
              borderRadius: 10,
              padding: '10px 28px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'opacity 0.15s',
            }}
          >
            {step < STEPS.length - 1 ? 'Next' : 'Get Started'}
          </button>
        </div>
      </div>
    </div>
  );
}
