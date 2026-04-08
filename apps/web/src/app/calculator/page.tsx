'use client';
import { useState, useMemo } from 'react';
import AppShell from '@/components/AppShell';

export default function CalculatorPage() {
  const [balance, setBalance] = useState('100');
  const [riskPercent, setRiskPercent] = useState('2');
  const [entryPrice, setEntryPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');

  const calc = useMemo(() => {
    const bal = parseFloat(balance) || 0;
    const risk = parseFloat(riskPercent) || 0;
    const entry = parseFloat(entryPrice) || 0;
    const sl = parseFloat(stopLoss) || 0;
    const tp = parseFloat(takeProfit) || 0;

    const riskAmount = bal * (risk / 100);
    const slDistance = entry > 0 && sl > 0 ? Math.abs(entry - sl) / entry * 100 : 0;
    const tpDistance = entry > 0 && tp > 0 ? Math.abs(tp - entry) / entry * 100 : 0;
    const positionSize = slDistance > 0 ? riskAmount / (slDistance / 100) : 0;
    const rr = slDistance > 0 && tpDistance > 0 ? tpDistance / slDistance : 0;
    const potentialProfit = positionSize * (tpDistance / 100);
    const maxLoss = riskAmount;
    const leverage = bal > 0 && positionSize > 0 ? positionSize / bal : 0;
    const breakEvenWinRate = rr > 0 ? (1 / (1 + rr)) * 100 : 0;

    return { riskAmount, slDistance, tpDistance, positionSize, rr, potentialProfit, maxLoss, leverage, breakEvenWinRate };
  }, [balance, riskPercent, entryPrice, stopLoss, takeProfit]);

  const MetricCard = ({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) => (
    <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border-1)', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
      <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{label}</div>
      <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: color || 'var(--t0)' }}>{value}</div>
      {sub && <div style={{ fontSize: 9, color: 'var(--t3)', marginTop: 2 }}>{sub}</div>}
    </div>
  );

  return (
    <AppShell>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--t0)', margin: 0 }}>Position Calculator</h1>
        <div style={{ fontSize: 12, color: 'var(--t2)', marginTop: 2 }}>Calculate optimal position sizes based on risk management</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 16 }}>
        {/* Input Panel */}
        <div className="card">
          <div className="card-head"><span className="card-title">Parameters</span></div>
          <div className="card-pad" style={{ display: 'grid', gap: 14 }}>
            <div>
              <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--t2)', marginBottom: 4, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>Portfolio Balance (SOL)</label>
              <input className="inp" type="number" value={balance} onChange={e => setBalance(e.target.value)} style={{ width: '100%', fontSize: 13, padding: '10px 12px' }} />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--t2)', marginBottom: 4, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>Risk per Trade (%)</label>
              <input className="inp" type="number" value={riskPercent} onChange={e => setRiskPercent(e.target.value)} style={{ width: '100%', fontSize: 13, padding: '10px 12px' }} />
              <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                {[1, 2, 3, 5, 10].map(v => (
                  <button key={v} className={`preset ${parseFloat(riskPercent) === v ? 'on' : ''}`} onClick={() => setRiskPercent(String(v))} style={{ flex: 1, padding: '4px', fontSize: 10 }}>{v}%</button>
                ))}
              </div>
            </div>
            <div style={{ borderTop: '1px dashed var(--border-0)', paddingTop: 12 }}>
              <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--t2)', marginBottom: 4, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>Entry Price (USD)</label>
              <input className="inp" type="number" value={entryPrice} onChange={e => setEntryPrice(e.target.value)} placeholder="e.g. 0.00001234" style={{ width: '100%', fontSize: 13, padding: '10px 12px' }} />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--red)', marginBottom: 4, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>Stop Loss Price (USD)</label>
              <input className="inp" type="number" value={stopLoss} onChange={e => setStopLoss(e.target.value)} placeholder="Price to cut losses" style={{ width: '100%', fontSize: 13, padding: '10px 12px' }} />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--green)', marginBottom: 4, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>Take Profit Price (USD)</label>
              <input className="inp" type="number" value={takeProfit} onChange={e => setTakeProfit(e.target.value)} placeholder="Target exit price" style={{ width: '100%', fontSize: 13, padding: '10px 12px' }} />
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
            <MetricCard label="Position Size" value={`${calc.positionSize.toFixed(2)} SOL`} sub="Optimal allocation" />
            <MetricCard label="Risk Amount" value={`${calc.riskAmount.toFixed(2)} SOL`} sub={`${riskPercent}% of balance`} color="var(--red)" />
            <MetricCard label="Risk:Reward" value={calc.rr > 0 ? `1:${calc.rr.toFixed(1)}` : '—'} sub="Ratio" color={calc.rr >= 2 ? 'var(--green)' : calc.rr >= 1 ? 'var(--gold)' : 'var(--red)'} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
            <MetricCard label="Max Profit" value={calc.potentialProfit > 0 ? `+${calc.potentialProfit.toFixed(2)} SOL` : '—'} color="var(--green)" />
            <MetricCard label="Max Loss" value={calc.maxLoss > 0 ? `-${calc.maxLoss.toFixed(2)} SOL` : '—'} color="var(--red)" />
            <MetricCard label="Breakeven W/R" value={calc.breakEvenWinRate > 0 ? `${calc.breakEvenWinRate.toFixed(1)}%` : '—'} sub="Min win rate needed" />
          </div>

          {/* Visual Risk Bar */}
          <div className="card">
            <div className="card-head"><span className="card-title">Risk Visualization</span></div>
            <div className="card-pad">
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
                <div style={{ fontSize: 10, color: 'var(--red)', fontWeight: 600 }}>Stop Loss</div>
                <div style={{ flex: 1, height: 1, background: 'var(--border-0)' }} />
                <div style={{ fontSize: 10, color: 'var(--t2)', fontWeight: 600 }}>Entry</div>
                <div style={{ flex: 1, height: 1, background: 'var(--border-0)' }} />
                <div style={{ fontSize: 10, color: 'var(--green)', fontWeight: 600 }}>Take Profit</div>
              </div>
              <div style={{ display: 'flex', height: 24, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border-0)' }}>
                <div style={{ width: `${Math.min(calc.slDistance, 50)}%`, background: 'rgba(220,60,60,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 600, color: 'var(--red)' }}>
                  {calc.slDistance > 5 ? `-${calc.slDistance.toFixed(1)}%` : ''}
                </div>
                <div style={{ width: 2, background: 'var(--t1)' }} />
                <div style={{ flex: 1, background: 'rgba(107,142,35,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 600, color: 'var(--green)' }}>
                  {calc.tpDistance > 5 ? `+${calc.tpDistance.toFixed(1)}%` : ''}
                </div>
              </div>

              {/* R:R Quality Indicator */}
              <div style={{ marginTop: 16, textAlign: 'center' }}>
                {calc.rr >= 3 ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 16px', background: 'rgba(107,142,35,0.08)', borderRadius: 8, border: '1px solid rgba(107,142,35,0.15)' }}>
                    <span style={{ fontSize: 16 }}>🟢</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--green)' }}>Excellent R:R — High conviction setup</span>
                  </div>
                ) : calc.rr >= 2 ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 16px', background: 'rgba(107,142,35,0.05)', borderRadius: 8, border: '1px solid rgba(107,142,35,0.1)' }}>
                    <span style={{ fontSize: 16 }}>🟡</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--gold)' }}>Good R:R — Standard setup</span>
                  </div>
                ) : calc.rr > 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 16px', background: 'rgba(220,60,60,0.05)', borderRadius: 8, border: '1px solid rgba(220,60,60,0.1)' }}>
                    <span style={{ fontSize: 16 }}>🔴</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--red)' }}>Poor R:R — Consider adjusting targets</span>
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: 'var(--t3)' }}>Enter entry, stop loss, and take profit to see risk analysis</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
