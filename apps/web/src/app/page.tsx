'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { IconLogo, IconChevronRight, IconZap, IconShield, IconChart, IconTarget, IconUsers, IconDownload, IconShare, IconActivity } from '@/components/Icons';

export default function HomePage() {
  const [ready, setReady] = useState(false);
  useEffect(() => { const t = setTimeout(() => setReady(true), 900); return () => clearTimeout(t); }, []);

  return (
    <>
      <div className={`loader-screen ${ready ? 'done' : ''}`}>
        <div className="loader-orb" />
        <div className="loader-label">PAPERAPE</div>
        <div className="loader-bar"><div className="loader-bar-inner" /></div>
      </div>

      <div className="landing">
        <div className="orb orb-1" /><div className="orb orb-2" /><div className="orb orb-3" />

        <nav className="lnav">
          <div className="lnav-brand">
            <div className="lnav-brand-icon"><IconLogo /></div>
            <span className="lnav-brand-name">PaperApe</span>
          </div>
          <div className="lnav-links">
            <Link href="/dashboard" className="lnav-link">Dashboard</Link>
            <Link href="/terminal" className="lnav-link">Terminal</Link>
            <Link href="/leaderboard" className="lnav-link">Leaderboard</Link>
            <Link href="/learn" className="lnav-link">Academy</Link>
            <Link href="/login" className="lnav-cta">Launch App</Link>
          </div>
        </nav>

        <section className="hero">
          <div className="hero-grid" />
          <div className="hero-chip an"><span className="hero-chip-dot" />Simulated Trading — Zero Real Risk</div>
          <h1 className="hero-h1 an an1">Paper trade Solana<br/>like a <em>degen</em></h1>
          <p className="hero-p an an2">
            The ultimate Solana memecoin trading simulator. Execute simulated buys and sells
            with live prices, realistic slippage, and on-chain fee modeling. Track your PnL,
            learn the trenches, and compete risk-free.
          </p>
          <div className="hero-btns an an3">
            <Link href="/dashboard" className="h-btn-primary">Launch Dashboard <IconChevronRight /></Link>
            <Link href="/learn" className="h-btn-secondary"><IconActivity /> Academy</Link>
          </div>
          <div className="hero-stats an an4">
            <div className="hero-stat"><div className="hero-stat-v">100</div><div className="hero-stat-l">Starting SOL</div></div>
            <div className="hero-stat"><div className="hero-stat-v">50+</div><div className="hero-stat-l">Lessons</div></div>
            <div className="hero-stat"><div className="hero-stat-v">&lt;2s</div><div className="hero-stat-l">Price Sync</div></div>
            <div className="hero-stat"><div className="hero-stat-v">$0</div><div className="hero-stat-l">Real Risk</div></div>
          </div>
        </section>

        <section className="plats">
          <div className="plats-label">Works inside your favorite terminal</div>
          <div className="plats-row">
            <div className="plat-tag">BullX</div><div className="plat-tag">Photon</div>
            <div className="plat-tag">Padre</div><div className="plat-tag">Axiom</div>
          </div>
        </section>

        {/* How it Works */}
        <section style={{ maxWidth: 900, margin: '0 auto', padding: '60px 20px 40px' }}>
          <h2 style={{ textAlign: 'center', fontSize: 24, fontWeight: 800, marginBottom: 40, color: 'var(--t0)' }}>How it Works</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {[
              { step: '01', title: 'Sign Up Free', desc: 'Create an account in seconds. No KYC, no deposits, no credit card required.', color: 'var(--green)' },
              { step: '02', title: 'Get 100 Paper SOL', desc: 'Start with 100 simulated SOL. Trade any Solana token with live prices.', color: 'var(--cyan)' },
              { step: '03', title: 'Trade & Compete', desc: 'Execute buys & sells, track PnL, and climb the leaderboard. Risk nothing.', color: 'var(--gold)' },
            ].map(s => (
              <div key={s.step} style={{ textAlign: 'center', padding: '28px 20px', background: 'var(--bg-1)', border: '1px solid var(--border-1)', borderRadius: 16, position: 'relative' }}>
                <div style={{ fontSize: 32, fontWeight: 900, color: s.color, opacity: 0.15, position: 'absolute', top: 12, right: 16 }}>{s.step}</div>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: `color-mix(in srgb, ${s.color} 10%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 20, fontWeight: 800, color: s.color }}>{s.step}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--t0)', marginBottom: 8 }}>{s.title}</div>
                <div style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.6 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Social Proof */}
        <section style={{ maxWidth: 900, margin: '0 auto', padding: '0 20px 60px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {[
              { quote: 'Finally a way to practice trading memecoins without losing my rent money.', author: 'FreshApe420', tier: 'Diamond Hands' },
              { quote: 'The slippage simulation is surprisingly realistic. Taught me more than any YouTube video.', author: 'SolanaShark', tier: 'HIMOTHY' },
              { quote: 'Been using PaperApe for 2 weeks. My real trades are actually profitable now.', author: 'CryptoNova', tier: 'Paper Veteran' },
            ].map(t => (
              <div key={t.author} style={{ padding: '20px', background: 'var(--bg-1)', border: '1px solid var(--border-1)', borderRadius: 12 }}>
                <div style={{ fontSize: 12, color: 'var(--t1)', lineHeight: 1.7, marginBottom: 12, fontStyle: 'italic' }}>"{t.quote}"</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: 'var(--t1)' }}>{t.author.slice(0, 2).toUpperCase()}</div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t0)' }}>{t.author}</div>
                    <div style={{ fontSize: 9, color: 'var(--accent-l)' }}>{t.tier}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="feat-section">
          <div className="feat-header"><h2>Built for the trenches</h2><p>Every feature designed to simulate real on-chain trading as accurately as possible.</p></div>
          <div className="feat-grid">
            {[
              { icon: <IconZap />, cls: 'green', t: 'Live Price Streaming', d: 'Real-time prices from DexScreener API. No DOM scraping, no stale data.' },
              { icon: <IconChart />, cls: 'cyan', t: 'Realistic Execution', d: 'Slippage curves modeled on pool liquidity. Priority fees factored into every trade.' },
              { icon: <IconTarget />, cls: 'gold', t: 'Sell Init / Moon Bags', d: 'Recover your initial SOL and ride remaining tokens risk-free.' },
              { icon: <IconShield />, cls: 'red', t: 'Scam Detection Academy', d: '50+ interactive lessons on honeypots, rug pulls, and phishing scams.' },
              { icon: <IconUsers />, cls: 'purple', t: 'HIMOTHY Leaderboard', d: 'Weekly and monthly rankings. Prove your alpha risk-free.' },
              { icon: <IconShare />, cls: 'green', t: 'Beginner + Pro Modes', d: 'Simplified interface for beginners. Full terminal for experienced traders.' },
            ].map((f) => (
              <div key={f.t} className="feat-card">
                <div className={`feat-icon ${f.cls}`}>{f.icon}</div>
                <h3>{f.t}</h3><p>{f.d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="cta-section">
          <div className="cta-box">
            <h2>Start trading in 30 seconds</h2>
            <p>No credit card, no KYC, no real money needed. Create an account and start paper trading immediately.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', position: 'relative' }}>
              <Link href="/login" className="h-btn-primary" style={{ position: 'relative' }}>Create Free Account</Link>
            </div>
          </div>
        </section>

        <footer className="landing-footer">
          <div style={{ marginBottom: 8, fontSize: 10, color: 'var(--red)', fontWeight: 600 }}>
            PaperApe is a simulated environment for educational purposes only. No real funds are traded. This is not financial advice.
          </div>
          PaperApe — Simulate the trenches. Risk nothing.
        </footer>
      </div>
    </>
  );
}
