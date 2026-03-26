'use client';
import { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import { IconTrophy } from '@/components/Icons';
import { apiRequest } from '@/lib/api';

interface LBEntry { rank: number; username: string; total_pnl: number; win_rate: number; total_trades: number; }

export default function LeaderboardPage() {
  const [tab, setTab] = useState<'weekly' | 'monthly'>('weekly');
  const [entries, setEntries] = useState<LBEntry[]>([]);
  useEffect(() => {
    apiRequest('GET', `/leaderboard/${tab}`).then((r) => { if (r.success && r.data?.rankings) setEntries(r.data.rankings); });
  }, [tab]);

  return (
    <AppShell>
      <div className="ptop"><div><h1>Leaderboard</h1><div className="ptop-desc">Top paper traders ranked by PnL</div></div></div>
      <div className="tabs an">
        <button className={`tab ${tab === 'weekly' ? 'on' : ''}`} onClick={() => setTab('weekly')}>Weekly</button>
        <button className={`tab ${tab === 'monthly' ? 'on' : ''}`} onClick={() => setTab('monthly')}>Monthly</button>
      </div>
      <div className="panel an an1">
        <div className="panel-head"><div className="panel-title"><IconTrophy /> Rankings</div><span className="panel-count">{entries.length}</span></div>
        <div className="panel-body">
          {entries.length === 0 ? (
            <div className="panel-empty"><div className="panel-empty-icn"><IconTrophy /></div><h4>No rankings yet</h4><p>Complete trades to appear on the leaderboard</p></div>
          ) : entries.map((e) => {
            const cls = e.rank === 1 ? 'g' : e.rank === 2 ? 's' : e.rank === 3 ? 'b' : '';
            return <div key={e.rank} className="lb-row">
              <div className={`lb-rank ${cls}`}>{e.rank}</div>
              <div className="lb-user"><div className="lb-pfp">{e.username?.slice(0,2).toUpperCase()}</div><div><div className="tk-name">{e.username}</div></div></div>
              <div className={`mono bold ${e.total_pnl >= 0 ? 'up' : 'down'}`}>{e.total_pnl >= 0 ? '+' : ''}{e.total_pnl.toFixed(4)} SOL</div>
              <div className="mono" style={{ color: 'var(--t2)' }}>{e.win_rate.toFixed(1)}%</div>
              <div className="mono" style={{ color: 'var(--t3)' }}>{e.total_trades}</div>
            </div>;
          })}
        </div>
      </div>
    </AppShell>
  );
}
