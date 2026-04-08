'use client';
import { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import { useMode } from '@/components/ModeContext';
import { useAuth } from '@/components/AuthContext';

interface Settings {
  soundEnabled: boolean;
  tradeConfirmation: boolean;
  autoRefreshDiscover: string;
  defaultSlippage: number;
  defaultPriority: string;
  showKeyboardShortcuts: boolean;
  theme: string;
}

const DEFAULTS: Settings = {
  soundEnabled: true,
  tradeConfirmation: true,
  autoRefreshDiscover: 'off',
  defaultSlippage: 15,
  defaultPriority: 'normal',
  showKeyboardShortcuts: true,
  theme: 'dark',
};

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} style={{
      width: 38, height: 20, borderRadius: 10, padding: 2, border: 'none', cursor: 'pointer',
      background: on ? 'var(--green)' : 'var(--bg-3)', transition: 'all 0.2s',
    }}>
      <div style={{
        width: 16, height: 16, borderRadius: '50%', background: '#fff',
        transform: on ? 'translateX(18px)' : 'translateX(0)', transition: 'transform 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </button>
  );
}

export default function SettingsPage() {
  const { mode, setMode } = useMode();
  const { user } = useAuth();
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const s = localStorage.getItem('paperape_settings');
      if (s) setSettings({ ...DEFAULTS, ...JSON.parse(s) });
    } catch {}
  }, []);

  const update = (key: keyof Settings, value: any) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value };
      localStorage.setItem('paperape_settings', JSON.stringify(next));
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      return next;
    });
  };

  const sections = [
    {
      title: '🎮 Trading',
      items: [
        { label: 'Trade Confirmation', desc: 'Show confirmation modal for large trades (>10 SOL)', type: 'toggle' as const, key: 'tradeConfirmation' as keyof Settings },
        { label: 'Default Slippage', desc: 'Default slippage tolerance for new trades', type: 'select' as const, key: 'defaultSlippage' as keyof Settings, options: [{ v: 1, l: '1%' }, { v: 5, l: '5%' }, { v: 10, l: '10%' }, { v: 15, l: '15%' }, { v: 25, l: '25%' }] },
        { label: 'Priority Fee', desc: 'Default priority fee for trade execution', type: 'select' as const, key: 'defaultPriority' as keyof Settings, options: [{ v: 'normal', l: 'Normal' }, { v: 'turbo', l: 'Turbo' }, { v: 'yolo', l: 'YOLO' }] },
      ],
    },
    {
      title: '🔔 Notifications',
      items: [
        { label: 'Sound Effects', desc: 'Play sounds on buy/sell execution', type: 'toggle' as const, key: 'soundEnabled' as keyof Settings },
        { label: 'Keyboard Shortcuts', desc: 'Show shortcut hints bar in terminal', type: 'toggle' as const, key: 'showKeyboardShortcuts' as keyof Settings },
      ],
    },
    {
      title: '📊 Discover',
      items: [
        { label: 'Auto-Refresh', desc: 'Automatically refresh token data on Discover page', type: 'select' as const, key: 'autoRefreshDiscover' as keyof Settings, options: [{ v: 'off', l: 'Off' }, { v: '10', l: '10s' }, { v: '30', l: '30s' }] },
      ],
    },
  ];

  return (
    <AppShell>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--t0)', margin: 0 }}>Settings</h1>
            <div style={{ fontSize: 12, color: 'var(--t2)', marginTop: 2 }}>Customize your trading experience</div>
          </div>
          {saved && <div style={{ padding: '4px 12px', background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.15)', borderRadius: 8, fontSize: 11, fontWeight: 600, color: 'var(--green)', animation: 'fadeInUp 0.15s ease' }}>✓ Saved</div>}
        </div>

        {/* Profile Card */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-pad" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: 'var(--t1)' }}>
              {(user?.displayName || user?.email || 'PA').slice(0, 2).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--t0)' }}>{user?.displayName || 'Trader'}</div>
              <div style={{ fontSize: 11, color: 'var(--t3)' }}>{user?.email || 'Not signed in'}</div>
            </div>
            <div>
              <div className="nav-mode" style={{ display: 'flex', gap: 0 }}>
                <button className={`nav-mode-btn ${mode === 'beginner' ? 'on' : ''}`} onClick={() => setMode('beginner')} style={{ padding: '5px 12px', fontSize: 11 }}>Beginner</button>
                <button className={`nav-mode-btn ${mode === 'pro' ? 'on' : ''}`} onClick={() => setMode('pro')} style={{ padding: '5px 12px', fontSize: 11 }}>Pro</button>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Sections */}
        {sections.map(section => (
          <div key={section.title} className="card" style={{ marginBottom: 12 }}>
            <div className="card-head">
              <span className="card-title">{section.title}</span>
            </div>
            <div className="card-pad" style={{ padding: 0 }}>
              {section.items.map((item, i) => (
                <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: i < section.items.length - 1 ? '1px solid var(--border-0)' : 'none' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t0)' }}>{item.label}</div>
                    <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 1 }}>{item.desc}</div>
                  </div>
                  {item.type === 'toggle' && (
                    <Toggle on={settings[item.key] as boolean} onChange={(v) => update(item.key, v)} />
                  )}
                  {item.type === 'select' && (
                    <div style={{ display: 'flex', gap: 2 }}>
                      {(item as any).options.map((opt: any) => (
                        <button key={opt.v} className={`preset haptic ${settings[item.key] === opt.v ? 'on' : ''}`}
                          onClick={() => update(item.key, opt.v)}
                          style={{ padding: '4px 10px', fontSize: 10 }}>
                          {opt.l}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Danger Zone */}
        <div className="card" style={{ borderColor: 'rgba(255,77,77,0.1)' }}>
          <div className="card-head">
            <span className="card-title" style={{ color: 'var(--red)' }}>⚠ Danger Zone</span>
          </div>
          <div className="card-pad">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t0)' }}>Reset All Settings</div>
                <div style={{ fontSize: 10, color: 'var(--t3)' }}>Restore all settings to defaults</div>
              </div>
              <button className="btn haptic" onClick={() => {
                if (!confirm('Reset all settings to defaults?')) return;
                localStorage.removeItem('paperape_settings');
                setSettings(DEFAULTS);
                setSaved(true);
                setTimeout(() => setSaved(false), 1500);
              }} style={{ padding: '5px 14px', fontSize: 11, color: 'var(--red)', border: '1px solid rgba(255,77,77,0.15)' }}>
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Version */}
        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 10, color: 'var(--t3)' }}>
          PaperApe v1.0.0 · Built for the trenches
        </div>
      </div>
    </AppShell>
  );
}
