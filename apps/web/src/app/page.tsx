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
        <div className="loader-label">PaperApe</div>
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
            <Link href="/extension" className="lnav-link">Extension</Link>
            <Link href="/dashboard" className="lnav-cta">Launch App</Link>
          </div>
        </nav>

        <section className="hero">
          <div className="hero-grid" />
          <div className="hero-chip an"><span className="hero-chip-dot" />Simulated Trading — Zero Real Risk</div>
          <h1 className="hero-h1 an an1">Paper trade Solana<br/>like a <em>degen</em></h1>
          <p className="hero-p an an2">
            Inject a full trading terminal into BullX, Photon, Padre, or Axiom.
            Execute simulated buys and sells with live prices, realistic slippage,
            and on-chain fee modeling. Track your PnL and compete.
          </p>
          <div className="hero-btns an an3">
            <Link href="/dashboard" className="h-btn-primary">Launch Dashboard <IconChevronRight /></Link>
            <Link href="/extension" className="h-btn-secondary"><IconDownload /> Install Extension</Link>
          </div>
          <div className="hero-stats an an4">
            <div className="hero-stat"><div className="hero-stat-v">100</div><div className="hero-stat-l">Starting SOL</div></div>
            <div className="hero-stat"><div className="hero-stat-v">4</div><div className="hero-stat-l">Platforms</div></div>
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

        <section className="feat-section">
          <div className="feat-header"><h2>Built for the trenches</h2><p>Every feature designed to simulate real on-chain trading as accurately as possible.</p></div>
          <div className="feat-grid">
            {[
              { icon: <IconZap />, cls: 'purple', t: 'Live Price Streaming', d: 'Real-time prices from Birdeye API via WebSocket. No DOM scraping, no stale data, no delays.' },
              { icon: <IconChart />, cls: 'green', t: 'Realistic Execution', d: 'Slippage curves modeled on pool liquidity depth. Priority fees and spread factored into every trade.' },
              { icon: <IconTarget />, cls: 'gold', t: 'Sell Init / Moon Bags', d: 'Recover your initial SOL and ride remaining tokens risk-free. Same mechanic as real on-chain.' },
              { icon: <IconShield />, cls: 'red', t: 'Rug Detection', d: 'Monitors liquidity via Helius RPC. Position flagged at -100% when pool is drained.' },
              { icon: <IconUsers />, cls: 'cyan', t: 'Competitive Leaderboard', d: 'Weekly and monthly rankings. Prove your alpha without risking a single lamport.' },
              { icon: <IconShare />, cls: 'purple', t: 'Social PnL Cards', d: 'Generate branded performance cards for Twitter. One-click PNG export.' },
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
            <h2>Ghost-inject into any terminal</h2>
            <p>Shadow DOM isolation injects a fully functional trading widget into DEX platforms — invisible to the host, zero CSS conflicts.</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 32, position: 'relative' }}>
              <span className="plat-tag">BullX</span><span className="plat-tag">Photon</span>
              <span className="plat-tag">Padre</span><span className="plat-tag">Axiom</span>
            </div>
            <Link href="/extension" className="h-btn-primary" style={{ position: 'relative' }}><IconDownload /> Download Extension</Link>
          </div>
        </section>

        <footer className="landing-footer">PaperApe — Simulate the trenches. Risk nothing.</footer>
      </div>
    </>
  );
}
