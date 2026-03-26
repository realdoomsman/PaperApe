'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMode } from './ModeContext';
import {
  IconGrid, IconTrophy, IconClock, IconShare, IconExtension, IconLogo,
  IconWallet, IconTerminal, IconGraduationCap, IconX, IconChevronRight, IconStar,
  IconCompass, IconCalculator, IconSettings,
} from './Icons';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: IconGrid, group: 'TRADE' },
  { href: '/terminal', label: 'Terminal', icon: IconTerminal, group: 'TRADE' },
  { href: '/discover', label: 'Discover', icon: IconCompass, group: 'DISCOVER' },
  { href: '/wallets', label: 'Wallets', icon: IconWallet, group: 'MANAGE' },
  { href: '/leaderboard', label: 'Leaderboard', icon: IconTrophy, group: 'COMPETE' },
  { href: '/history', label: 'History', icon: IconClock, group: 'COMPETE' },
  { href: '/learn', label: 'Academy', icon: IconGraduationCap, group: 'LEARN' },
  { href: '/tools', label: 'Tools', icon: IconCalculator, group: 'TOOLS' },
  { href: '/share', label: 'Export', icon: IconShare, group: 'TOOLS' },
  { href: '/extension', label: 'Extension', icon: IconExtension, group: 'TOOLS' },
];

const ONBOARD = [
  { title: 'Welcome to PaperApe', desc: 'Simulate real Solana trades with zero risk. You start with 100 SOL of paper money.', hl: 'No real funds. No wallet needed. Just skill.' },
  { title: 'Two Ways to Trade', desc: 'Use the built-in Terminal or inject into BullX, Photon, Padre, or Axiom via the Chrome Extension.', hl: 'Terminal or Extension — pick your style.' },
  { title: 'Multi-Wallet Strategies', desc: 'Create up to 5 paper wallets. Fund them with fake SOL. Compare strategies in isolation.', hl: 'Isolate and A/B test trading approaches.' },
  { title: 'Compete and Learn', desc: 'Climb leaderboards, complete Academy lessons, and generate branded PnL cards for social sharing.', hl: 'Prove your alpha. Risk nothing.' },
];

function Modal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [s, setS] = useState(0);
  if (!open) return null;
  const data = ONBOARD[s];
  const last = s === ONBOARD.length - 1;
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-x" onClick={onClose}><IconX /></button>
        <div className="modal-dots">{ONBOARD.map((_, i) => <div key={i} className={`modal-dot ${i === s ? 'on' : i < s ? 'ok' : ''}`} />)}</div>
        <div className="modal-step">Step {s + 1} of {ONBOARD.length}</div>
        <h2>{data.title}</h2>
        <p className="modal-desc">{data.desc}</p>
        <div className="modal-hl"><IconStar /><span>{data.hl}</span></div>
        <div className="modal-foot">
          {s > 0 && <button className="btn" onClick={() => setS(s - 1)}>Back</button>}
          {last ? <button className="btn primary" onClick={onClose}>Get Started <IconChevronRight /></button>
            : <button className="btn primary" onClick={() => setS(s + 1)}>Next <IconChevronRight /></button>}
        </div>
      </div>
    </div>
  );
}

export default function AppShell({ children, balance = 100 }: { children: React.ReactNode; balance?: number }) {
  const pathname = usePathname();
  const { mode, setMode } = useMode();
  const [showModal, setShowModal] = useState(false);
  let lastGroup = '';

  useEffect(() => {
    if (!localStorage.getItem('pa-seen')) setShowModal(true);
  }, []);

  return (
    <div className={`app-layout ${mode}`}>
      <Modal open={showModal} onClose={() => { setShowModal(false); localStorage.setItem('pa-seen', '1'); }} />
      <aside className="sidebar">
        <div className="sb-top">
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="sb-icon"><IconLogo /></div>
            <span className="sb-name">PaperApe</span>
          </Link>
        </div>

        {/* Mode Toggle */}
        <div className="mode-toggle">
          <button className={`mode-btn ${mode === 'beginner' ? 'on' : ''}`} onClick={() => setMode('beginner')}>Beginner</button>
          <button className={`mode-btn ${mode === 'pro' ? 'on' : ''}`} onClick={() => setMode('pro')}>Pro</button>
        </div>

        <nav className="sb-nav">
          {NAV.map((item) => {
            const show = item.group !== lastGroup;
            if (show) lastGroup = item.group;
            const I = item.icon;
            return <div key={item.href}>
              {show && <div className="sb-group">{item.group}</div>}
              <Link href={item.href} className={`sb-item ${pathname === item.href ? 'on' : ''}`}><I />{item.label}</Link>
            </div>;
          })}
        </nav>
        <div className="sb-foot">
          <div className="sb-bal">
            <div className="sb-bal-label">Paper Balance</div>
            <div className="sb-bal-val">{balance.toFixed(4)}<span className="sb-bal-unit">SOL</span></div>
          </div>
          <button className="btn" style={{ width: '100%', justifyContent: 'center', marginTop: 8, fontSize: 11 }}
            onClick={() => { localStorage.removeItem('pa-seen'); setShowModal(true); }}>
            <IconGraduationCap /> Quick Tour
          </button>
        </div>
      </aside>
      <div className="main">
        <div className="gradient-bar" />
        <div className="main-inner">{children}</div>
      </div>
    </div>
  );
}
