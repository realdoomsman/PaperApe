'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useMode } from '@/components/ModeContext';
import { useAuth } from '@/components/AuthContext';
import { IconLogo, IconChart, IconTarget, IconUsers, IconWallet, IconGraduationCap, IconActivity, IconTrophy, IconChevronRight } from '@/components/Icons';
import NotificationCenter from '@/components/NotificationCenter';

interface AppShellProps { children: React.ReactNode; balance?: number; }

const PRO_NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: IconChart },
  { href: '/terminal', label: 'Terminal', icon: IconTarget },
  { href: '/discover', label: 'Discover', icon: IconActivity },
  { href: '/wallets', label: 'Wallets', icon: IconWallet },
  { href: '/leaderboard', label: 'Leaderboard', icon: IconTrophy },
  { href: '/history', label: 'History', icon: IconUsers },
  { href: '/learn', label: 'Academy', icon: IconGraduationCap },
];

const BEG_NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: IconChart },
  { href: '/terminal', label: 'Trade', icon: IconTarget },
  { href: '/discover', label: 'Discover', icon: IconActivity },
  { href: '/learn', label: 'Academy', icon: IconGraduationCap },
];

export default function AppShell({ children, balance }: AppShellProps) {
  const pathname = usePathname();
  const { mode, setMode } = useMode();
  const { user, logout, emailVerified } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const navItems = mode === 'beginner' ? BEG_NAV : PRO_NAV;
  const displayBal = balance ?? 100;
  const initials = user?.displayName?.slice(0, 2).toUpperCase() || user?.email?.slice(0, 2).toUpperCase() || 'PA';

  return (
    <div className={`app-layout ${mode}`}>
      {/* Disclaimer */}
      <div className="disclaimer-bar">
        PaperApe is a simulated environment for educational purposes only. No real funds are traded. This is not financial advice.
      </div>

      {/* Floating top nav */}
      <nav className={`topnav ${scrolled ? 'scrolled' : ''}`}>
        <Link href="/dashboard" className="nav-brand">
          <div className="nav-logo"><IconLogo /></div>
          <span className="nav-name">PaperApe</span>
        </Link>

        <div className="nav-center">
          {navItems.map(n => {
            const I = n.icon;
            return (
              <Link key={n.href} href={n.href} className={`nav-link ${pathname === n.href ? 'on' : ''}`}>
                <I />{n.label}
              </Link>
            );
          })}
        </div>

        {/* Cmd+K hint */}
        <button onClick={() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true })); }} className="haptic" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: 'var(--bg-2)', border: '1px solid var(--border-0)', borderRadius: 6, cursor: 'pointer', fontSize: 9, color: 'var(--t3)', marginRight: 8 }} title="Command Palette (⌘K)">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <kbd style={{ fontFamily: 'inherit', fontSize: 9 }}>⌘K</kbd>
        </button>

        <div className="nav-right" ref={menuRef}>
          <NotificationCenter />
          <div className="nav-mode">
            <button className={`nav-mode-btn ${mode === 'beginner' ? 'on' : ''}`} onClick={() => setMode('beginner')}>Beginner</button>
            <button className={`nav-mode-btn ${mode === 'pro' ? 'on' : ''}`} onClick={() => setMode('pro')}>Pro</button>
          </div>

          <div className="nav-bal">
            <span className="mono">{displayBal.toFixed(mode === 'pro' ? 4 : 2)}</span> SOL
          </div>

          <button className="nav-avatar" onClick={() => setMenuOpen(!menuOpen)}>
            {initials}
          </button>

          {menuOpen && (
            <div className="nav-menu">
              <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-0)', marginBottom: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t0)' }}>{user?.displayName || 'Trader'}</div>
                <div style={{ fontSize: 11, color: 'var(--t3)' }}>{user?.email || ''}</div>
              </div>
              <Link href="/wallets" className="nav-menu-item" onClick={() => setMenuOpen(false)}>
                <IconWallet /> Wallets
              </Link>
              <Link href="/history" className="nav-menu-item" onClick={() => setMenuOpen(false)}>
                <IconActivity /> Trade History
              </Link>
              <Link href="/analytics" className="nav-menu-item" onClick={() => setMenuOpen(false)}>
                <IconChart /> Analytics
              </Link>
              <div className="nav-menu-sep" />
              <Link href="/compare" className="nav-menu-item" onClick={() => setMenuOpen(false)}>
                <IconTarget /> Token Compare
              </Link>
              <Link href="/calculator" className="nav-menu-item" onClick={() => setMenuOpen(false)}>
                <IconActivity /> Position Calculator
              </Link>
              <div className="nav-menu-sep" />
              <Link href="/settings" className="nav-menu-item" onClick={() => setMenuOpen(false)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> Settings
              </Link>
              <Link href="/terms" className="nav-menu-item" onClick={() => setMenuOpen(false)}>
                <IconGraduationCap /> Terms & Privacy
              </Link>
              <div className="nav-menu-sep" />
              <button className="nav-menu-item danger" onClick={() => { logout(); setMenuOpen(false); }}>
                <IconChevronRight /> Sign Out
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Email verification */}
      {user && !emailVerified && (
        <div style={{ padding: '12px 24px', paddingTop: 8 }}>
          <div className="verify-bar">
            <span style={{ color: 'var(--gold)', fontWeight: 700 }}>Verify</span>
            <span style={{ color: 'var(--t1)' }}>Please verify your email. Check your inbox.</span>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="app-main">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <div className="mobile-nav">
        <div className="mobile-nav-inner">
          {[
            { href: '/dashboard', label: 'Home', icon: IconChart },
            { href: '/terminal', label: 'Trade', icon: IconTarget },
            { href: '/discover', label: 'Discover', icon: IconActivity },
            { href: '/wallets', label: 'Wallets', icon: IconWallet },
            { href: '/leaderboard', label: 'Ranks', icon: IconTrophy },
          ].map(n => {
            const I = n.icon;
            return (
              <Link key={n.href} href={n.href} className={`mobile-nav-link ${pathname === n.href ? 'on' : ''}`}>
                <I />{n.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
