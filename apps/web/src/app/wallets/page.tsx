'use client';
import { useState, useCallback } from 'react';
import AppShell from '@/components/AppShell';
import { IconWallet, IconPlus, IconCopy, IconKey, IconCoins, IconStar, IconTrash } from '@/components/Icons';

interface PaperWallet { id: string; name: string; address: string; balance: number; pnl: number; isPrimary: boolean; }

function genAddr(): string { const c = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'; let a = ''; for (let i = 0; i < 44; i++) a += c[Math.floor(Math.random() * c.length)]; return a; }

export default function WalletsPage() {
  const [wallets, setWallets] = useState<PaperWallet[]>([{ id: '1', name: 'Main Wallet', address: genAddr(), balance: 100, pnl: 0, isPrimary: true }]);
  const [copied, setCopied] = useState<string | null>(null);
  const create = useCallback(() => { if (wallets.length >= 5) return; setWallets((p) => [...p, { id: Date.now().toString(), name: `Wallet ${p.length + 1}`, address: genAddr(), balance: 0, pnl: 0, isPrimary: false }]); }, [wallets.length]);
  const fund = useCallback((id: string, amt: number) => setWallets((p) => p.map((w) => w.id === id ? { ...w, balance: w.balance + amt } : w)), []);
  const del = useCallback((id: string) => setWallets((p) => p.filter((w) => w.id !== id || w.isPrimary)), []);
  const setPri = useCallback((id: string) => setWallets((p) => p.map((w) => ({ ...w, isPrimary: w.id === id }))), []);
  const copy = useCallback((a: string) => { navigator.clipboard.writeText(a); setCopied(a); setTimeout(() => setCopied(null), 1500); }, []);
  const total = wallets.reduce((s, w) => s + w.balance, 0);

  return (
    <AppShell balance={total}>
      <div className="ptop"><div><h1>Wallet Manager</h1><div className="ptop-desc">Create and manage up to 5 paper wallets. Fund with fake SOL.</div></div>
        <div className="ptop-right"><div className="chip"><IconWallet style={{ width: 12, height: 12 }} /> {wallets.length}/5</div></div></div>

      <div className="stats an" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <div className="stat"><div className="stat-label"><IconCoins /> Total Balance</div><div className="stat-val">{total.toFixed(4)}</div><div className="stat-sub">SOL across all wallets</div></div>
        <div className="stat"><div className="stat-label"><IconWallet /> Active Wallets</div><div className="stat-val">{wallets.length}</div><div className="stat-sub">of 5 maximum</div></div>
        <div className="stat"><div className="stat-label"><IconStar /> Primary</div><div className="stat-val" style={{ fontSize: 18 }}>{wallets.find((w) => w.isPrimary)?.name}</div><div className="stat-sub">active wallet</div></div>
      </div>

      <div className="w-grid an an1">
        {wallets.map((w) => (
          <div key={w.id} className={`w-card ${w.isPrimary ? 'pri' : ''}`}>
            <div className="w-top">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span className="w-name">{w.name}</span>{w.isPrimary && <span className="tag tag-p">PRIMARY</span>}</div>
              <div className="w-acts">
                {!w.isPrimary && <button title="Set primary" onClick={() => setPri(w.id)}><IconStar /></button>}
                <button title="Copy" onClick={() => copy(w.address)}><IconCopy /></button>
                {!w.isPrimary && <button title="Delete" onClick={() => del(w.id)}><IconTrash /></button>}
              </div>
            </div>
            <div className="w-addr" title={w.address}>{copied === w.address ? 'Copied!' : w.address}</div>
            <div className="w-bals">
              <div style={{ flex: 1 }}><div className="w-b-label">Balance</div><div className="w-b-val">{w.balance.toFixed(4)}<span style={{ fontSize: 11, color: 'var(--t3)', marginLeft: 4 }}>SOL</span></div></div>
              <div style={{ flex: 1 }}><div className="w-b-label">PnL</div><div className={`w-b-val ${w.pnl >= 0 ? 'up' : 'down'}`} style={{ fontSize: 16 }}>{w.pnl >= 0 ? '+' : ''}{w.pnl.toFixed(4)}</div></div>
            </div>
            <div className="w-fund">
              <button className="fund-btn" onClick={() => fund(w.id, 10)}>+10 SOL</button>
              <button className="fund-btn" onClick={() => fund(w.id, 50)}>+50 SOL</button>
              <button className="fund-btn" onClick={() => fund(w.id, 100)}>+100 SOL</button>
            </div>
          </div>
        ))}
        {wallets.length < 5 && <div className="w-new" onClick={create}><IconPlus /><span>Create New Wallet</span></div>}
      </div>

      <div className="panel an an2">
        <div className="panel-head"><div className="panel-title"><IconKey /> How Paper Wallets Work</div></div>
        <div className="panel-pad">
          <div className="steps">
            {[
              { n: '01', t: 'No real keys, no risk', d: 'Paper wallets are simulated. Nothing touches the Solana blockchain.' },
              { n: '02', t: 'Fund instantly', d: 'Click any button to add fake SOL. No faucet delay.' },
              { n: '03', t: 'Test in isolation', d: 'Use separate wallets to A/B test strategies. Compare PnL to find your edge.' },
              { n: '04', t: 'Set primary', d: 'Your primary wallet is used by the Extension and Terminal for trade execution.' },
            ].map((s) => <div key={s.n} className="step"><div className="step-n">{s.n}</div><div><h4>{s.t}</h4><p>{s.d}</p></div></div>)}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
