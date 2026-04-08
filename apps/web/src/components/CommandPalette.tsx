'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface CmdItem {
  id: string;
  label: string;
  desc: string;
  icon: string;
  action: () => void;
  category: string;
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const items: CmdItem[] = [
    // Navigation
    { id: 'nav-dash', label: 'Dashboard', desc: 'Portfolio overview & stats', icon: '📊', action: () => router.push('/dashboard'), category: 'Navigate' },
    { id: 'nav-term', label: 'Terminal', desc: 'Trade tokens', icon: '💹', action: () => router.push('/terminal'), category: 'Navigate' },
    { id: 'nav-disc', label: 'Discover', desc: 'Trending tokens & trenches', icon: '🔍', action: () => router.push('/discover'), category: 'Navigate' },
    { id: 'nav-wall', label: 'Wallets', desc: 'Manage sub-wallets', icon: '💰', action: () => router.push('/wallets'), category: 'Navigate' },
    { id: 'nav-lead', label: 'Leaderboard', desc: 'Top traders rankings', icon: '🏆', action: () => router.push('/leaderboard'), category: 'Navigate' },
    { id: 'nav-hist', label: 'Trade History', desc: 'Past trades & PnL', icon: '📜', action: () => router.push('/history'), category: 'Navigate' },
    { id: 'nav-anal', label: 'Analytics', desc: 'Performance deep dive', icon: '📈', action: () => router.push('/analytics'), category: 'Navigate' },
    { id: 'nav-acad', label: 'Academy', desc: 'Learn trading lessons', icon: '🎓', action: () => router.push('/learn'), category: 'Navigate' },
    { id: 'nav-sett', label: 'Settings', desc: 'Preferences & config', icon: '⚙️', action: () => router.push('/settings'), category: 'Navigate' },
    // Tools
    { id: 'tool-comp', label: 'Token Compare', desc: 'Side-by-side token analysis', icon: '⚔️', action: () => router.push('/compare'), category: 'Tools' },
    { id: 'tool-calc', label: 'Position Calculator', desc: 'Risk & position sizing', icon: '🧮', action: () => router.push('/calculator'), category: 'Tools' },
    // Quick Actions
    { id: 'act-buy', label: 'Quick Buy', desc: 'Open terminal in buy mode', icon: '🟢', action: () => router.push('/terminal?tab=buy'), category: 'Actions' },
    { id: 'act-sell', label: 'Quick Sell', desc: 'Open terminal in sell mode', icon: '🔴', action: () => router.push('/terminal?tab=sell'), category: 'Actions' },
    // Tokens
    { id: 'tok-bonk', label: 'Trade BONK', desc: 'Open BONK in terminal', icon: '🐕', action: () => router.push('/terminal?token=BONK'), category: 'Tokens' },
    { id: 'tok-wif', label: 'Trade WIF', desc: 'Open WIF in terminal', icon: '🎩', action: () => router.push('/terminal?token=WIF'), category: 'Tokens' },
    { id: 'tok-jup', label: 'Trade JUP', desc: 'Open JUP in terminal', icon: '🪐', action: () => router.push('/terminal?token=JUP'), category: 'Tokens' },
    { id: 'tok-ray', label: 'Trade RAY', desc: 'Open RAY in terminal', icon: '☀️', action: () => router.push('/terminal?token=RAY'), category: 'Tokens' },
  ];

  const filtered = query.trim()
    ? items.filter(i => i.label.toLowerCase().includes(query.toLowerCase()) || i.desc.toLowerCase().includes(query.toLowerCase()))
    : items;

  const grouped = filtered.reduce<Record<string, CmdItem[]>>((g, item) => {
    (g[item.category] = g[item.category] || []).push(item);
    return g;
  }, {});

  const handleKey = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setOpen(prev => !prev);
    }
    if (e.key === 'Escape') setOpen(false);
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  useEffect(() => {
    if (open) { setQuery(''); setTimeout(() => inputRef.current?.focus(), 50); }
  }, [open]);

  const run = (item: CmdItem) => {
    setOpen(false);
    item.action();
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div onClick={() => setOpen(false)} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 9998,
        backdropFilter: 'blur(4px)', animation: 'fadeInUp 0.1s ease',
      }} />
      {/* Palette */}
      <div style={{
        position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 520, zIndex: 9999,
        background: 'var(--bg-0)', border: '2px solid var(--border-1)',
        borderRadius: 16, boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
        overflow: 'hidden', animation: 'fadeInUp 0.15s ease',
      }}>
        {/* Search Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '1px solid var(--border-0)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--t2)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search pages, tokens, actions..."
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: 'var(--t0)', fontFamily: 'inherit' }} />
          <kbd style={{ padding: '2px 6px', background: 'var(--bg-2)', borderRadius: 4, fontSize: 9, color: 'var(--t3)', border: '1px solid var(--border-0)' }}>ESC</kbd>
        </div>
        {/* Results */}
        <div style={{ maxHeight: 380, overflowY: 'auto', padding: '4px 0' }}>
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <div style={{ padding: '8px 18px 4px', fontSize: 9, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{cat}</div>
              {items.map(item => (
                <button key={item.id} onClick={() => run(item)} className="haptic"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 18px',
                    background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ fontSize: 16, width: 24, textAlign: 'center' }}>{item.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t0)' }}>{item.label}</div>
                    <div style={{ fontSize: 10, color: 'var(--t3)' }}>{item.desc}</div>
                  </div>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </button>
              ))}
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: '30px 18px', textAlign: 'center', fontSize: 12, color: 'var(--t3)' }}>
              No results for "{query}"
            </div>
          )}
        </div>
        {/* Footer */}
        <div style={{ padding: '8px 18px', borderTop: '1px solid var(--border-0)', display: 'flex', gap: 12, fontSize: 9, color: 'var(--t3)' }}>
          <span><kbd style={{ padding: '1px 4px', background: 'var(--bg-2)', borderRadius: 3, fontSize: 8, border: '1px solid var(--border-0)' }}>↑↓</kbd> Navigate</span>
          <span><kbd style={{ padding: '1px 4px', background: 'var(--bg-2)', borderRadius: 3, fontSize: 8, border: '1px solid var(--border-0)' }}>↵</kbd> Open</span>
          <span><kbd style={{ padding: '1px 4px', background: 'var(--bg-2)', borderRadius: 3, fontSize: 8, border: '1px solid var(--border-0)' }}>⌘K</kbd> Toggle</span>
        </div>
      </div>
    </>
  );
}
