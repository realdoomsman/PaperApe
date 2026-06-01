'use client';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { IconActivity, IconChart, IconCheck, IconDownload, IconExtension, IconKey, IconShield, IconTarget } from '@/components/Icons';

const PLATFORMS = ['BullX', 'Axiom', 'Padre', 'Photon', 'GMGN'];

const FEATURES = [
  {
    icon: <IconTarget />,
    tone: 'green',
    title: 'Trade On The Terminal You Already Use',
    body: 'PaperApe detects supported Solana token pages and mounts a draggable paper-trading widget over the host platform.',
  },
  {
    icon: <IconChart />,
    tone: 'gold',
    title: 'Entry And Exit Fills',
    body: 'Buys, sells, and sell-init fills are saved with token price and market cap so your simulator history stays tied to the chart.',
  },
  {
    icon: <IconShield />,
    tone: 'cyan',
    title: 'Isolated Widget',
    body: 'The extension renders inside Shadow DOM, keeping PaperApe styles separate from BullX, Axiom, Padre, Photon, and GMGN.',
  },
];

const STEPS = [
  ['01', 'Build the extension', 'Run npm run build from the repo root. The Chrome-ready extension is emitted to apps/extension/dist.'],
  ['02', 'Open Chrome extensions', 'Go to chrome://extensions and enable Developer mode.'],
  ['03', 'Load unpacked', 'Choose Load unpacked, then select the apps/extension/dist folder.'],
  ['04', 'Sign in once', 'Open PaperApe in the same browser and sign in. The web app syncs your auth token to the extension bridge.'],
  ['05', 'Open a token page', 'Visit BullX, Axiom, Padre, Photon, or GMGN. PaperApe appears when it detects a Solana token address.'],
];

function PlatformCard({ name }: { name: string }) {
  return (
    <div style={{
      padding: '12px 14px',
      border: '2px solid var(--border-1)',
      background: 'var(--bg-1)',
      borderRadius: 8,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      minHeight: 54,
    }}>
      <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--t0)', letterSpacing: 0.4 }}>{name}</span>
      <span className="tag tag-live" style={{ fontSize: 8, padding: '2px 7px' }}>Supported</span>
    </div>
  );
}

export default function ExtensionPage() {
  return (
    <AppShell>
      <div className="page-head an">
        <div>
          <h1>PaperApe Extension</h1>
          <div className="page-head-sub">Paper trade Solana tokens directly on supported trading platforms</div>
        </div>
        <Link href="/terminal" className="btn haptic" style={{ fontSize: 11, padding: '7px 12px' }}>
          <IconTarget /> Open Terminal
        </Link>
      </div>

      <section className="card an an1" style={{ marginBottom: 14, overflow: 'hidden' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 360px',
          gap: 22,
          padding: '28px',
        }} className="extension-hero-grid">
          <div>
            <div className="tag tag-info" style={{ marginBottom: 14 }}>Chrome MV3 Extension</div>
            <h2 style={{ margin: '0 0 12px', fontSize: 26, lineHeight: 1.1, color: 'var(--t0)', letterSpacing: 0, fontWeight: 900 }}>
              Paper trading without leaving the chart.
            </h2>
            <p style={{ margin: '0 0 18px', maxWidth: 620, fontSize: 13, lineHeight: 1.7, color: 'var(--t2)' }}>
              The extension brings the PaperApe simulator to BullX, Axiom, Padre, Photon, and GMGN. It uses your PaperApe account, proxies API calls through the background worker, and keeps all trades simulated.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <a href="#install" className="btn primary lg haptic" style={{ borderRadius: 10, textDecoration: 'none' }}>
                <IconDownload /> Install Locally
              </a>
              <Link href="/login?returnTo=%2Fextension" className="btn lg haptic" style={{ borderRadius: 10, textDecoration: 'none' }}>
                <IconKey /> Sign In To Sync
              </Link>
            </div>
          </div>

          <div style={{
            border: '2px solid var(--border-1)',
            background: 'var(--bg-2)',
            borderRadius: 8,
            padding: 14,
            boxShadow: 'var(--paper-shadow)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--green-bg)', color: 'var(--green)', border: '2px solid var(--green)' }}>
                <IconExtension />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--t0)' }}>PaperApe Widget</div>
                <div style={{ fontSize: 10, color: 'var(--t3)' }}>Draggable / isolated / synced</div>
              </div>
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {[
                ['Mode', 'Paper only'],
                ['API', 'Background proxy'],
                ['Auth', 'Web bridge sync'],
                ['Charts', 'Best-effort fill markers'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 10px', background: 'var(--bg-1)', border: '1px dashed var(--border-1)', borderRadius: 6 }}>
                  <span style={{ fontSize: 10, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{k}</span>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--t1)', fontWeight: 700 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14, marginBottom: 14 }} className="extension-feature-grid an an2">
        {FEATURES.map((feature) => (
          <div key={feature.title} className="feat-card">
            <div className={`feat-icon ${feature.tone}`}>{feature.icon}</div>
            <h3>{feature.title}</h3>
            <p>{feature.body}</p>
          </div>
        ))}
      </section>

      <section className="card an an3" style={{ marginBottom: 14 }}>
        <div className="card-head">
          <span className="card-title">Supported Platforms</span>
          <span style={{ fontSize: 11, color: 'var(--t3)' }}>Solana token pages</span>
        </div>
        <div className="card-pad" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
          {PLATFORMS.map(platform => <PlatformCard key={platform} name={platform} />)}
        </div>
      </section>

      <section id="install" className="card an an4" style={{ marginBottom: 14 }}>
        <div className="card-head">
          <span className="card-title">Install Guide</span>
          <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 800 }}>Unpacked build</span>
        </div>
        <div className="card-pad">
          {STEPS.map(([n, title, body]) => (
            <div key={n} style={{ display: 'flex', gap: 14, padding: '14px 0', borderBottom: '1px dashed var(--border-0)' }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--green-bg)', border: '2px solid var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, color: 'var(--green)', flexShrink: 0 }}>
                {n}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--t0)', marginBottom: 3 }}>{title}</div>
                <div style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.6 }}>{body}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card an an5">
        <div className="card-pad extension-note-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ padding: 14, border: '1px dashed var(--border-1)', borderRadius: 8, background: 'var(--bg-2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 800, color: 'var(--t0)', marginBottom: 6 }}>
              <IconActivity /> What It Does
            </div>
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.7, color: 'var(--t2)' }}>
              Detects token addresses, shows live token data, executes simulated buys/sells, updates PaperApe positions, and draws fill markers when the host chart allows it.
            </p>
          </div>
          <div style={{ padding: 14, border: '1px dashed var(--border-1)', borderRadius: 8, background: 'var(--bg-2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 800, color: 'var(--t0)', marginBottom: 6 }}>
              <IconCheck /> What It Never Does
            </div>
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.7, color: 'var(--t2)' }}>
              It never sends real transactions, never controls your trading wallet, and never trades with real funds. PaperApe stays educational and simulated.
            </p>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
