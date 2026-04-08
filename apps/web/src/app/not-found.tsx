'use client';
import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-0)',
      padding: 20,
    }}>
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        <div style={{ fontSize: 80, fontWeight: 900, color: 'var(--accent-l)', lineHeight: 1, opacity: 0.5, marginBottom: 8 }}>404</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--t0)', margin: '0 0 8px' }}>Page Not Found</h1>
        <p style={{ fontSize: 14, color: 'var(--t2)', marginBottom: 24, lineHeight: 1.6 }}>
          This page doesn't exist — maybe it got rugged? Try navigating back to the dashboard.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <Link href="/dashboard" className="btn primary haptic" style={{ padding: '10px 24px', fontSize: 13 }}>
            Go to Dashboard
          </Link>
          <Link href="/terminal" className="btn haptic" style={{ padding: '10px 24px', fontSize: 13, border: '1px solid var(--border-1)' }}>
            Open Terminal
          </Link>
        </div>
        <div style={{ marginTop: 40, fontSize: 11, color: 'var(--t3)' }}>
          PaperApe — Simulate the trenches. Risk nothing.
        </div>
      </div>
    </div>
  );
}
