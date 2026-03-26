'use client';
import AppShell from '@/components/AppShell';
import Link from 'next/link';
import { IconExtension, IconDownload, IconZap, IconShield, IconChevronRight } from '@/components/Icons';

export default function ExtensionPage() {
  return (
    <AppShell>
      <div className="ptop"><div><h1>Chrome Extension</h1><div className="ptop-desc">Inject PaperApe into any supported DEX terminal</div></div></div>

      <div className="panel glass glass-glow an" style={{ borderColor: 'var(--border-glow)' }}>
        <div className="panel-pad" style={{ textAlign: 'center', padding: '48px 32px' }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--t0)', marginBottom: 12 }}>Shadow DOM Injection</h2>
          <p style={{ fontSize: 14, color: 'var(--t2)', maxWidth: 420, margin: '0 auto 28px', lineHeight: 1.7 }}>
            Full CSS isolation. Zero conflicts with host platforms. Drag the widget anywhere. Trade without switching tabs.
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 28, flexWrap: 'wrap' }}>
            {['BullX', 'Photon', 'Padre', 'Axiom'].map((p) => <span key={p} className="plat-tag">{p}</span>)}
          </div>
          <button className="btn primary" style={{ fontSize: 14, padding: '13px 32px' }}><IconDownload /> Download Extension</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, margin: '18px 0' }} className="an an1">
        <div className="feat-card">
          <div className="feat-icon purple"><IconZap /></div>
          <h3>Instant Injection</h3>
          <p>Detects supported platforms automatically via MutationObserver and injects the widget in under 100ms.</p>
        </div>
        <div className="feat-card">
          <div className="feat-icon green"><IconShield /></div>
          <h3>Full Isolation</h3>
          <p>Shadow DOM encapsulation prevents any CSS or JS conflicts between PaperApe and the host terminal.</p>
        </div>
      </div>

      <div className="panel an an2">
        <div className="panel-head"><div className="panel-title">Installation Guide</div></div>
        <div className="panel-pad">
          <div className="steps">
            {[
              { n: '01', t: 'Download the extension', d: 'Click the download button above or grab it from the Chrome Web Store.' },
              { n: '02', t: 'Enable Developer Mode', d: 'Go to chrome://extensions and toggle Developer mode in the top right.' },
              { n: '03', t: 'Load Unpacked', d: 'Click Load Unpacked and select the extracted extension folder.' },
              { n: '04', t: 'Navigate to your terminal', d: 'Open BullX, Photon, Padre, or Axiom. PaperApe injects automatically.' },
            ].map((s) => <div key={s.n} className="step"><div className="step-n">{s.n}</div><div><h4>{s.t}</h4><p>{s.d}</p></div></div>)}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
