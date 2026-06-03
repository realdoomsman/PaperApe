'use client';
import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('[PaperApe Error]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div style={{
          padding: '40px 20px', textAlign: 'center', maxWidth: 480, margin: '40px auto',
          background: 'var(--bg-1)', border: '2px solid rgba(255,77,77,0.15)', borderRadius: 16,
        }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>💥</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--t0)', margin: '0 0 8px' }}>Something went wrong</h2>
          <p style={{ fontSize: 12, color: 'var(--t2)', marginBottom: 16, lineHeight: 1.6 }}>
            An unexpected error occurred. This might be a temporary issue.
          </p>
          <div style={{ background: 'var(--bg-2)', padding: '10px 14px', borderRadius: 8, fontSize: 10, color: 'var(--red)', fontFamily: 'monospace', marginBottom: 16, textAlign: 'left', wordBreak: 'break-all', maxHeight: 80, overflow: 'auto' }}>
            {this.state.error?.message || 'Unknown error'}
          </div>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); }}
            className="btn primary haptic"
            style={{ padding: '8px 20px', fontSize: 12 }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export function PageErrorBoundary({ children, pageName }: { children: React.ReactNode; pageName?: string }) {
  return (
    <ErrorBoundary
      fallback={
        <div style={{
          padding: '40px 20px', textAlign: 'center', maxWidth: 480, margin: '40px auto',
          background: 'var(--bg-1)', border: '2px solid rgba(255,77,77,0.15)', borderRadius: 16,
        }}>
          <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--t0)', margin: '0 0 8px' }}>
            Something went wrong{pageName ? ` on ${pageName}` : ''}
          </h2>
          <p style={{ fontSize: 12, color: 'var(--t2)', marginBottom: 16, lineHeight: 1.6 }}>
            An unexpected error occurred. Please try reloading the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn primary haptic"
            style={{ padding: '8px 20px', fontSize: 12 }}
          >
            Reload page
          </button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
