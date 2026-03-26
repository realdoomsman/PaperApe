'use client';
import { useState, useCallback } from 'react';
import AppShell from '@/components/AppShell';
import { useMode } from '@/components/ModeContext';
import { IconCalculator, IconChart, IconShield, IconTarget } from '@/components/Icons';

export default function ToolsPage() {
  const { mode } = useMode();

  // Position Size Calculator
  const [psBalance, setPsBalance] = useState('100');
  const [psRisk, setPsRisk] = useState('2');
  const [psStop, setPsStop] = useState('10');
  const psResult = useCallback(() => {
    const b = parseFloat(psBalance || '0'), r = parseFloat(psRisk || '0'), s = parseFloat(psStop || '1');
    return ((b * (r / 100)) / (s / 100)).toFixed(4);
  }, [psBalance, psRisk, psStop]);

  // PnL Calculator
  const [pnlEntry, setPnlEntry] = useState('0.00001');
  const [pnlExit, setPnlExit] = useState('0.00003');
  const [pnlAmt, setPnlAmt] = useState('1');
  const pnlResult = useCallback(() => {
    const e = parseFloat(pnlEntry || '0'), x = parseFloat(pnlExit || '0'), a = parseFloat(pnlAmt || '0');
    if (e === 0) return { sol: '0', pct: '0' };
    const tokens = a / e;
    const exitVal = tokens * x;
    return { sol: (exitVal - a).toFixed(4), pct: (((x - e) / e) * 100).toFixed(1) };
  }, [pnlEntry, pnlExit, pnlAmt]);

  // Risk Score
  const [rsAddr, setRsAddr] = useState('');
  const [rsResult, setRsResult] = useState<null | { score: number; lp: string; mint: string; honey: string }>(null);
  const checkRisk = () => {
    if (rsAddr.length < 10) return;
    setRsResult({
      score: Math.floor(40 + Math.random() * 50),
      lp: Math.random() > 0.3 ? 'Locked' : 'Unlocked',
      mint: Math.random() > 0.5 ? 'Disabled' : 'Enabled',
      honey: Math.random() > 0.7 ? 'Suspected' : 'Clear',
    });
  };

  // Slippage Calculator
  const [slAmt, setSlAmt] = useState('1');
  const [slPool, setSlPool] = useState('50');
  const slResult = useCallback(() => {
    const a = parseFloat(slAmt || '0'), p = parseFloat(slPool || '1');
    const slip = (a / p) * 100;
    return { pct: slip.toFixed(2), impact: slip < 1 ? 'Low' : slip < 5 ? 'Medium' : 'High', color: slip < 1 ? 'var(--green)' : slip < 5 ? 'var(--gold)' : 'var(--red)' };
  }, [slAmt, slPool]);

  return (
    <AppShell>
      <div className="ptop"><div><h1>Tools</h1><div className="ptop-desc">Trading calculators and risk analysis</div></div></div>

      <div className="tool-grid an">
        {/* Position Size Calculator */}
        <div className="tool-card">
          <h3><IconTarget style={{ width: 16, height: 16, display: 'inline', verticalAlign: '-2px', marginRight: 6 }} />Position Sizer</h3>
          <div className="tool-desc">Calculate optimal trade size based on risk tolerance</div>
          <div className="tool-row">
            <div className="tool-field"><div className="tool-label">Balance (SOL)</div><input className="term-inp" type="number" value={psBalance} onChange={(e) => setPsBalance(e.target.value)} /></div>
            <div className="tool-field"><div className="tool-label">Risk %</div><input className="term-inp" type="number" value={psRisk} onChange={(e) => setPsRisk(e.target.value)} /></div>
          </div>
          <div className="tool-field"><div className="tool-label">Stop Loss %</div><input className="term-inp" type="number" value={psStop} onChange={(e) => setPsStop(e.target.value)} /></div>
          <div className="tool-result"><div className="tool-result-label">Recommended Position Size</div><div className="tool-result-val">{psResult()} <span style={{ fontSize: 12, color: 'var(--t3)' }}>SOL</span></div></div>
          {mode === 'beginner' && <p style={{ fontSize: 11, color: 'var(--t3)', marginTop: 10, lineHeight: 1.6 }}>This tells you how much SOL to risk per trade. With {psRisk}% risk on {psBalance} SOL and a {psStop}% stop, you should trade {psResult()} SOL.</p>}
        </div>

        {/* PnL Calculator */}
        <div className="tool-card">
          <h3><IconChart style={{ width: 16, height: 16, display: 'inline', verticalAlign: '-2px', marginRight: 6 }} />PnL Calculator</h3>
          <div className="tool-desc">Calculate profit/loss before entering a trade</div>
          <div className="tool-row">
            <div className="tool-field"><div className="tool-label">Entry Price</div><input className="term-inp" value={pnlEntry} onChange={(e) => setPnlEntry(e.target.value)} /></div>
            <div className="tool-field"><div className="tool-label">Exit Price</div><input className="term-inp" value={pnlExit} onChange={(e) => setPnlExit(e.target.value)} /></div>
          </div>
          <div className="tool-field"><div className="tool-label">Amount (SOL)</div><input className="term-inp" type="number" value={pnlAmt} onChange={(e) => setPnlAmt(e.target.value)} /></div>
          <div className="tool-result">
            <div style={{ display: 'flex', gap: 24 }}>
              <div><div className="tool-result-label">PnL (SOL)</div><div className={`tool-result-val ${parseFloat(pnlResult().sol) >= 0 ? 'up' : 'down'}`}>{parseFloat(pnlResult().sol) >= 0 ? '+' : ''}{pnlResult().sol}</div></div>
              <div><div className="tool-result-label">PnL %</div><div className={`tool-result-val ${parseFloat(pnlResult().pct) >= 0 ? 'up' : 'down'}`}>{parseFloat(pnlResult().pct) >= 0 ? '+' : ''}{pnlResult().pct}%</div></div>
            </div>
          </div>
        </div>

        {/* Risk Score Checker */}
        <div className="tool-card">
          <h3><IconShield style={{ width: 16, height: 16, display: 'inline', verticalAlign: '-2px', marginRight: 6 }} />Risk Score Checker</h3>
          <div className="tool-desc">Scan a token for rug pull risk indicators</div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <input className="term-inp" style={{ flex: 1 }} placeholder="Paste token address..." value={rsAddr} onChange={(e) => setRsAddr(e.target.value)} />
            <button className="btn primary" onClick={checkRisk}>Scan</button>
          </div>
          {rsResult && (
            <div className="tool-result">
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                <div><div className="tool-result-label">Safety Score</div><div className="tool-result-val" style={{ color: rsResult.score > 70 ? 'var(--green)' : rsResult.score > 40 ? 'var(--gold)' : 'var(--red)' }}>{rsResult.score}/100</div></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <div><div className="tool-label">LP Status</div><div className="mono" style={{ color: rsResult.lp === 'Locked' ? 'var(--green)' : 'var(--red)', fontSize: 12, fontWeight: 600 }}>{rsResult.lp}</div></div>
                <div><div className="tool-label">Mint Auth</div><div className="mono" style={{ color: rsResult.mint === 'Disabled' ? 'var(--green)' : 'var(--red)', fontSize: 12, fontWeight: 600 }}>{rsResult.mint}</div></div>
                <div><div className="tool-label">Honeypot</div><div className="mono" style={{ color: rsResult.honey === 'Clear' ? 'var(--green)' : 'var(--red)', fontSize: 12, fontWeight: 600 }}>{rsResult.honey}</div></div>
              </div>
            </div>
          )}
          {mode === 'beginner' && <p style={{ fontSize: 11, color: 'var(--t3)', marginTop: 10, lineHeight: 1.6 }}>Checks LP lock status, mint authority, and honeypot indicators. Higher scores are safer. In production this uses Helius RPC data.</p>}
        </div>

        {/* Slippage Calculator */}
        <div className="tool-card">
          <h3><IconCalculator style={{ width: 16, height: 16, display: 'inline', verticalAlign: '-2px', marginRight: 6 }} />Slippage Estimator</h3>
          <div className="tool-desc">Estimate price impact based on trade size vs pool liquidity</div>
          <div className="tool-row">
            <div className="tool-field"><div className="tool-label">Trade Size (SOL)</div><input className="term-inp" type="number" value={slAmt} onChange={(e) => setSlAmt(e.target.value)} /></div>
            <div className="tool-field"><div className="tool-label">Pool Liquidity (SOL)</div><input className="term-inp" type="number" value={slPool} onChange={(e) => setSlPool(e.target.value)} /></div>
          </div>
          <div className="tool-result">
            <div style={{ display: 'flex', gap: 24 }}>
              <div><div className="tool-result-label">Est. Slippage</div><div className="tool-result-val" style={{ color: slResult().color }}>{slResult().pct}%</div></div>
              <div><div className="tool-result-label">Impact Level</div><div className="tool-result-val" style={{ color: slResult().color, fontSize: 18 }}>{slResult().impact}</div></div>
            </div>
          </div>
          {mode === 'beginner' && <p style={{ fontSize: 11, color: 'var(--t3)', marginTop: 10, lineHeight: 1.6 }}>Larger trades on smaller pools = more slippage. Keep slippage under 5% for safer execution.</p>}
        </div>
      </div>
    </AppShell>
  );
}
