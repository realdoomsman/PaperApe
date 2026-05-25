'use client';
import AppShell from '@/components/AppShell';
import { IconDownload, IconZap, IconShield } from '@/components/Icons';

export default function ExtensionPage() {
  return (
    <AppShell>
      <div style={{ marginBottom: 20 }} className="an">
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--t0)', letterSpacing: 1, textTransform: 'uppercase' }}>Chrome Extension</h1>
        <div style={{ fontSize: 12, color: 'var(--t2)', marginTop: 4 }}>Paper trade directly inside your favorite DEX terminal</div>
      </div>

      {/* Hero Card */}
      <div className="card an an1" style={{ borderColor: 'var(--border-glow)', marginBottom: 14 }}>
        <div style={{ textAlign: 'center', padding: '48px 32px' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🦍</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--t0)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
            Trade Without Switching Tabs
          </h2>
          <p style={{ fontSize: 13, color: 'var(--t2)', maxWidth: 440, margin: '0 auto 24px', lineHeight: 1.7 }}>
            PaperApe injects a draggable trading widget directly into BullX, Axiom, Photon, Padre, and GMGN.
            Full Shadow DOM isolation — zero CSS conflicts with host platforms.
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 28, flexWrap: 'wrap' }}>
            {['BullX', 'Photon', 'Padre', 'Axiom', 'GMGN'].map(p => (
              <span key={p} style={{ padding: '8px 20px', borderRadius: 2, background: 'var(--bg-2)', border: '2px solid var(--border-1)', fontWeight: 700, fontSize: 13, color: 'var(--t1)' }}>{p}</span>
            ))}
          </div>
          <button className="btn primary lg haptic"
            onClick={() => { alert('Extension source is in apps/extension/\n\n1. Go to chrome://extensions\n2. Enable Developer Mode\n3. Click Load Unpacked\n4. Select the apps/extension/dist folder'); }}>
            <IconDownload /> Install Extension
          </button>
        </div>
      </div>

      {/* Feature Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }} className="an an2">
        {[
          { icon: <IconZap />, cls: 'green', title: 'Auto-Detect', desc: 'Detects your platform automatically via URL matching and injects the widget in under 100ms.' },
          { icon: <IconShield />, cls: 'cyan', title: 'Shadow DOM Isolation', desc: 'Full CSS/JS encapsulation. Zero conflicts between PaperApe and the host terminal.' },
          { icon: <IconDownload />, cls: 'gold', title: 'Synced with Dashboard', desc: 'Your balance, positions, and trades sync in real-time between the extension and web app.' },
        ].map(f => (
          <div key={f.title} className="feat-card">
            <div className={`feat-icon ${f.cls}`}>{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </div>

      {/* Installation Guide */}
      <div className="card an an3">
        <div className="card-head">
          <span className="card-title">Installation Guide</span>
          <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 700 }}>~2 minutes</span>
        </div>
        <div className="card-pad">
          {[
            { n: '01', t: 'Download the Extension', d: 'Click the Install button above to get the extension files, or clone the repo and navigate to apps/extension/dist.' },
            { n: '02', t: 'Open Chrome Extensions', d: 'Navigate to chrome://extensions in your browser address bar.' },
            { n: '03', t: 'Enable Developer Mode', d: 'Toggle the "Developer mode" switch in the top-right corner of the extensions page.' },
            { n: '04', t: 'Load Unpacked', d: 'Click "Load unpacked" and select the apps/extension/dist folder from the project.' },
            { n: '05', t: 'Navigate to a DEX', d: 'Open BullX, Axiom, Photon, Padre, or GMGN. The PaperApe widget appears automatically on any token chart.' },
          ].map(s => (
            <div key={s.n} style={{ display: 'flex', gap: 14, padding: '14px 0', borderBottom: '1px dashed var(--border-0)' }}>
              <div style={{ width: 36, height: 36, borderRadius: 2, background: 'var(--green-bg)', border: '2px solid var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: 'var(--green)', flexShrink: 0 }}>
                {s.n}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t0)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.t}</div>
                <div style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.6 }}>{s.d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
