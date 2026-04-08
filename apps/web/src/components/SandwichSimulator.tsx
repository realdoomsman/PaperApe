'use client';
import { useState, useCallback } from 'react';

/**
 * SANDWICH ATTACK SIMULATOR
 * Visual order-block UI showing how MEV bots exploit high-slippage trades.
 * - User submits a trade with slippage
 * - Animate the MEV bot front-running and back-running
 * - Show the exact SOL extracted by the bot
 */

type Phase = 'setup' | 'submitting' | 'sandwiched' | 'result';

interface OrderBlock {
  type: 'user' | 'bot-front' | 'bot-back';
  action: 'BUY' | 'SELL';
  amount: string;
  price: string;
  label: string;
  color: string;
}

export default function SandwichSimulator({ onComplete }: { onComplete?: () => void }) {
  const [phase, setPhase] = useState<Phase>('setup');
  const [slippage, setSlippage] = useState(20);
  const [tradeAmount, setTradeAmount] = useState(2);
  const [orders, setOrders] = useState<OrderBlock[]>([]);
  const [lostToMev, setLostToMev] = useState(0);

  const basePrice = 0.00234; // SOL price of token

  const simulateSandwich = useCallback(() => {
    setPhase('submitting');

    // Phase 1: Show user's pending transaction
    setTimeout(() => {
      const userBuyPrice = basePrice;
      const botFrontRunSize = tradeAmount * 0.4;
      const priceAfterFrontRun = basePrice * (1 + slippage / 100 * 0.6);
      const userExecutionPrice = basePrice * (1 + slippage / 100 * 0.85);
      const botSellPrice = userExecutionPrice * 1.01;
      const mevProfit = (botSellPrice - priceAfterFrontRun) * (botFrontRunSize / priceAfterFrontRun);
      const userLoss = (userExecutionPrice - basePrice) * (tradeAmount / userExecutionPrice);

      setLostToMev(userLoss);
      setOrders([
        {
          type: 'bot-front',
          action: 'BUY',
          amount: `${botFrontRunSize.toFixed(2)} SOL`,
          price: `${priceAfterFrontRun.toExponential(4)}`,
          label: '🤖 MEV Bot Front-Run',
          color: 'var(--red)',
        },
      ]);

      // Phase 2: User's tx gets included
      setTimeout(() => {
        setOrders(prev => [...prev, {
          type: 'user',
          action: 'BUY',
          amount: `${tradeAmount} SOL`,
          price: `${userExecutionPrice.toExponential(4)}`,
          label: '👤 Your Transaction',
          color: 'var(--accent-l)',
        }]);

        // Phase 3: Bot sells
        setTimeout(() => {
          setOrders(prev => [...prev, {
            type: 'bot-back',
            action: 'SELL',
            amount: `${botFrontRunSize.toFixed(2)} SOL`,
            price: `${botSellPrice.toExponential(4)}`,
            label: '🤖 MEV Bot Back-Run',
            color: 'var(--red)',
          }]);

          setTimeout(() => setPhase('result'), 800);
        }, 800);
      }, 800);

      setPhase('sandwiched');
    }, 1200);
  }, [slippage, tradeAmount]);

  return (
    <div style={{ background: 'var(--bg-2)', borderRadius: 12, border: '1px solid var(--border-1)', overflow: 'hidden', marginTop: 20 }}>
      {/* Header */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-0)' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--t0)' }}>🥪 Sandwich Attack Simulator</div>
        <div style={{ fontSize: 11, color: 'var(--t3)' }}>See how MEV bots exploit your high-slippage trades</div>
      </div>

      {/* Setup phase */}
      {phase === 'setup' && (
        <div style={{ padding: 18 }}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--t2)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Trade Amount</label>
            <div style={{ display: 'flex', gap: 4 }}>
              {[1, 2, 5, 10].map(a => (
                <button key={a} onClick={() => setTradeAmount(a)} className={`preset ${tradeAmount === a ? 'on' : ''}`} style={{ flex: 1, justifyContent: 'center', padding: '8px 0', fontSize: 12 }}>{a} SOL</button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--t2)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Slippage Tolerance</label>
            <div style={{ display: 'flex', gap: 4 }}>
              {[5, 10, 20, 50].map(s => (
                <button key={s} onClick={() => setSlippage(s)} className={`preset ${slippage === s ? 'on' : ''}`} style={{ flex: 1, justifyContent: 'center', padding: '8px 0', fontSize: 12 }}>{s}%</button>
              ))}
            </div>
            {slippage >= 20 && (
              <div style={{ marginTop: 6, fontSize: 10, color: 'var(--red)', fontWeight: 600 }}>
                ⚠️ High slippage makes you a prime target for sandwich attacks
              </div>
            )}
          </div>

          <div style={{ padding: '12px 14px', background: 'var(--bg-3)', borderRadius: 8, marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--t2)', marginBottom: 4 }}>
              <span>Token</span><span className="mono">MEME / SOL</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--t2)', marginBottom: 4 }}>
              <span>Current Price</span><span className="mono">{basePrice.toExponential(4)} SOL</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--t2)' }}>
              <span>Max Price (with slippage)</span><span className="mono">{(basePrice * (1 + slippage / 100)).toExponential(4)} SOL</span>
            </div>
          </div>

          <button onClick={simulateSandwich} className="btn buy haptic" style={{ width: '100%', justifyContent: 'center', padding: '14px 0', fontSize: 14, fontWeight: 700 }}>
            SUBMIT TRADE
          </button>
        </div>
      )}

      {/* Submitting */}
      {phase === 'submitting' && (
        <div style={{ padding: '40px 18px', textAlign: 'center' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>Submitting transaction to mempool...</div>
          <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4 }}>MEV bots are scanning for profitable opportunities</div>
        </div>
      )}

      {/* Order blocks visualization */}
      {(phase === 'sandwiched' || phase === 'result') && (
        <div style={{ padding: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t0)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Transaction Order (Block #{Math.floor(Math.random() * 900000 + 100000)})</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {orders.map((order, i) => (
              <div key={i} style={{
                padding: '12px 16px',
                background: order.type === 'user' ? 'var(--accent-bg)' : 'var(--red-bg)',
                border: `1px solid ${order.type === 'user' ? 'var(--accent-glow)' : 'rgba(255,59,92,0.15)'}`,
                borderRadius: 10,
                animation: 'fadeIn 0.5s ease',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: order.color }}>{order.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: order.action === 'BUY' ? 'var(--green)' : 'var(--red)' }}>{order.action}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--t2)' }}>
                  <span>Amount: <span className="mono">{order.amount}</span></span>
                  <span>Price: <span className="mono">{order.price}</span></span>
                </div>
              </div>
            ))}
          </div>

          {/* Arrow indicators */}
          {orders.length >= 2 && (
            <div style={{ textAlign: 'center', padding: '8px 0', fontSize: 10, color: 'var(--t3)' }}>
              ↑ Bot buys first, raising the price ↓ Bot sells after you, pocketing the difference
            </div>
          )}
        </div>
      )}

      {/* Result */}
      {phase === 'result' && (
        <div style={{ margin: '0 18px 18px' }}>
          {/* Loss breakdown */}
          <div style={{ padding: '14px 16px', background: 'var(--red-bg)', border: '1px solid rgba(255,59,92,0.15)', borderRadius: 10, marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--red)', marginBottom: 8 }}>💸 MEV Extraction Summary</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 600 }}>YOU PAID EXTRA</div>
                <div className="mono down" style={{ fontSize: 16, fontWeight: 800 }}>{lostToMev.toFixed(4)} SOL</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 600 }}>BOT PROFIT</div>
                <div className="mono down" style={{ fontSize: 16, fontWeight: 800 }}>{(lostToMev * 0.95).toFixed(4)} SOL</div>
              </div>
            </div>
          </div>

          {/* Educational debrief */}
          <div style={{ padding: '14px 16px', background: 'rgba(45,107,63,0.08)', border: '1px solid rgba(45,107,63,0.15)', borderRadius: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)', marginBottom: 8 }}>🧠 What You Learned</div>
            <div style={{ fontSize: 12, color: 'var(--t1)', lineHeight: 1.7 }}>
              <strong>MEV bots</strong> monitor the mempool for large pending trades with high slippage tolerance.
              They insert a buy order <em>before</em> yours (front-run) and a sell order <em>after</em> (back-run), pocketing the price difference.
            </div>
            <div style={{ fontSize: 12, color: 'var(--t2)', marginTop: 8, lineHeight: 1.7 }}>
              <strong>How to protect yourself:</strong> Use lower slippage (1-5%), use Jito bundles for MEV protection,
              or use private RPCs that don't broadcast to the public mempool.
            </div>
            {onComplete && (
              <button onClick={onComplete} className="btn primary haptic" style={{ marginTop: 12, fontSize: 12, padding: '8px 18px' }}>
                ✅ Complete Lesson — Claim Reward
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
