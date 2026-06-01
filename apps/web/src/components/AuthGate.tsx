'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconShield } from '@/components/Icons';

interface AuthRequiredPanelProps {
  title: string;
  body: string;
  actionLabel?: string;
}

export function useLoginHref() {
  const pathname = usePathname();
  return `/login?returnTo=${encodeURIComponent(pathname || '/dashboard')}`;
}

export function AuthRequiredPanel({ title, body, actionLabel = 'Sign in to use this' }: AuthRequiredPanelProps) {
  const href = useLoginHref();

  return (
    <div className="card" style={{ padding: 28, textAlign: 'center', borderStyle: 'dashed' }}>
      <div style={{
        width: 42,
        height: 42,
        borderRadius: 8,
        margin: '0 auto 12px',
        display: 'grid',
        placeItems: 'center',
        background: 'var(--accent-bg)',
        color: 'var(--accent-l)',
      }}>
        <IconShield style={{ width: 22, height: 22 }} />
      </div>
      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--t0)', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.6, maxWidth: 460, margin: '0 auto 16px' }}>{body}</div>
      <Link href={href} className="btn primary haptic" style={{ display: 'inline-flex', padding: '9px 18px', fontSize: 12, fontWeight: 700 }}>
        {actionLabel}
      </Link>
    </div>
  );
}
