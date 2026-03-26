'use client';
import { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import { IconClock, IconBox, IconFilter } from '@/components/Icons';
import { apiRequest } from '@/lib/api';
import { formatSol, formatPercent, truncateAddress } from '@paperape/shared';
import type { Position } from '@paperape/shared';

const FILTERS = ['All', 'Open', 'Closed', 'Rugged'];

export default function HistoryPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [filter, setFilter] = useState('All');
  useEffect(() => { apiRequest('GET', '/trades/positions', undefined, 'mock-dev-token').then((r) => { if (r.success && r.data?.positions) setPositions(r.data.positions); }); }, []);

  const filtered = filter === 'All' ? positions : filter === 'Open' ? positions.filter((p) => p.status === 'open') : filter === 'Closed' ? positions.filter((p) => p.status === 'closed') : positions.filter((p) => p.is_rugged);

  return (
    <AppShell>
      <div className="ptop"><div><h1>Trade History</h1><div className="ptop-desc">Full record of all simulated trades</div></div></div>
      <div className="tabs an">
        {FILTERS.map((f) => <button key={f} className={`tab ${filter === f ? 'on' : ''}`} onClick={() => setFilter(f)}>{f}</button>)}
      </div>
      <div className="panel an an1">
        <div className="panel-head"><div className="panel-title"><IconClock /> Records</div><span className="panel-count">{filtered.length}</span></div>
        <div className="panel-body">
          {filtered.length === 0 ? (
            <div className="panel-empty"><div className="panel-empty-icn"><IconBox /></div><h4>No records</h4><p>Complete trades to see them here</p></div>
          ) : (
            <table className="tbl"><thead><tr><th>Token</th><th>Side</th><th>Amount</th><th>PnL</th><th>Status</th></tr></thead>
              <tbody>{filtered.map((pos) => { const pnl = parseFloat(String(pos.pnl_percent));
                return <tr key={pos.id}>
                  <td><div className="tk"><div className="tk-img">{pos.token_symbol?.slice(0,2)}</div><div><div className="tk-name">{pos.token_symbol}</div><div className="tk-addr">{truncateAddress(pos.token_address)}</div></div></div></td>
                  <td className="mono">BUY</td>
                  <td className="mono">{formatSol(parseFloat(String(pos.amount_sol)))} SOL</td>
                  <td className={`mono bold ${pnl >= 0 ? 'up' : 'down'}`}>{formatPercent(pnl)}</td>
                  <td>{pos.is_rugged ? <span className="tag tag-rug">RUGGED</span> : pos.status === 'open' ? <span className="tag tag-live">OPEN</span> : <span className="tag tag-closed">CLOSED</span>}</td>
                </tr>; })}</tbody></table>
          )}
        </div>
      </div>
    </AppShell>
  );
}
