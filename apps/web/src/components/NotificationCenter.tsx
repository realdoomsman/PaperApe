'use client';
import { useState, useEffect, useRef } from 'react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'trade' | 'alert' | 'system' | 'achievement';
  timestamp: number;
  read: boolean;
}

const ICONS: Record<string, string> = {
  trade: '💹',
  alert: '🔔',
  system: '⚙️',
  achievement: '🏆',
};

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('pa_notifications');
      if (stored) setNotifications(JSON.parse(stored));
    } catch {}
  }, []);

  useEffect(() => {
    const handler = (e: CustomEvent<{ title: string; message: string; type: string }>) => {
      const n: Notification = {
        id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        title: e.detail.title,
        message: e.detail.message,
        type: e.detail.type as Notification['type'],
        timestamp: Date.now(),
        read: false,
      };
      setNotifications(prev => {
        const next = [n, ...prev].slice(0, 50);
        localStorage.setItem('pa_notifications', JSON.stringify(next));
        return next;
      });
    };
    window.addEventListener('pa:notification' as any, handler);
    return () => window.removeEventListener('pa:notification' as any, handler);
  }, []);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const unread = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    setNotifications(prev => {
      const next = prev.map(n => ({ ...n, read: true }));
      localStorage.setItem('pa_notifications', JSON.stringify(next));
      return next;
    });
  };

  const clearAll = () => {
    setNotifications([]);
    localStorage.removeItem('pa_notifications');
  };

  const timeAgo = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)} className="haptic" style={{
        position: 'relative', background: 'none', border: 'none', cursor: 'pointer',
        padding: '6px 8px', color: 'var(--t2)', display: 'flex', alignItems: 'center',
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2, width: 14, height: 14,
            background: 'var(--red)', borderRadius: '50%', fontSize: 8, fontWeight: 700,
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--bg-0)',
          }}>{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, width: 340, maxHeight: 420,
          background: 'var(--bg-0)', border: '2px solid var(--border-1)', borderRadius: 12,
          boxShadow: '0 12px 32px rgba(0,0,0,0.2)', zIndex: 9999, overflow: 'hidden',
          animation: 'fadeInUp 0.15s ease',
        }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-0)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t0)' }}>Notifications</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {unread > 0 && <button onClick={markAllRead} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 9, color: 'var(--accent-l)' }}>Mark all read</button>}
              {notifications.length > 0 && <button onClick={clearAll} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 9, color: 'var(--t3)' }}>Clear all</button>}
            </div>
          </div>
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>🔕</div>
                <div style={{ fontSize: 12, color: 'var(--t3)' }}>No notifications yet</div>
                <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 4 }}>Trade activity and alerts will appear here</div>
              </div>
            ) : (
              notifications.map(n => (
                <div key={n.id} onClick={() => {
                  setNotifications(prev => {
                    const next = prev.map(x => x.id === n.id ? { ...x, read: true } : x);
                    localStorage.setItem('pa_notifications', JSON.stringify(next));
                    return next;
                  });
                }} style={{
                  padding: '10px 14px', borderBottom: '1px solid var(--border-0)',
                  cursor: 'pointer', background: n.read ? 'transparent' : 'rgba(107,142,35,0.04)',
                  transition: 'background 0.1s',
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = n.read ? 'transparent' : 'rgba(107,142,35,0.04)')}
                >
                  <span style={{ fontSize: 16, marginTop: 1 }}>{ICONS[n.type]}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--t0)' }}>{n.title}</span>
                      {!n.read && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-l)', flexShrink: 0 }} />}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--t2)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.message}</div>
                    <div style={{ fontSize: 9, color: 'var(--t3)', marginTop: 3 }}>{timeAgo(n.timestamp)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
