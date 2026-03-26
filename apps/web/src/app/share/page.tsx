'use client';
import AppShell from '@/components/AppShell';
import { IconShare, IconDownload, IconCopy, IconImage } from '@/components/Icons';

export default function SharePage() {
  return (
    <AppShell>
      <div className="ptop"><div><h1>Social Export</h1><div className="ptop-desc">Generate branded PnL cards for Twitter</div></div></div>

      <div className="export-card an">
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t3)', letterSpacing: '0.5px', textTransform: 'uppercase' as const }}>Total PnL</div>
          <div className="export-num up">+42.69%</div>
          <div className="export-sub">14 trades / 78.6% win rate</div>
          <div className="export-footer">PaperApe Simulated Trading</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 20 }} className="an an1">
        <button className="btn primary"><IconDownload /> Download PNG</button>
        <button className="btn"><IconCopy /> Copy Text</button>
      </div>
    </AppShell>
  );
}
