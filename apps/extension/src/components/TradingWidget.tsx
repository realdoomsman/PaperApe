import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTokenData } from '../hooks/useTokenData';
import { usePositions } from '../hooks/usePositions';
import { fmtSol, fmtMcap, fmtUsd, fmtPct } from '../lib/formatters';
import { openDashboard } from '../lib/messaging';
import {
  QUICK_BUY_AMOUNTS,
  QUICK_SELL_PCTS,
  SLIPPAGE_PRESETS,
  TP_PRESETS,
  SL_PRESETS,
} from '../lib/config';
import type { BaseAdapter } from '../content/adapters/base';

interface Props {
  adapter: BaseAdapter;
}

type NotifType = 'success' | 'error' | 'info' | 'congestion';

export default function TradingWidget({ adapter }: Props) {
  const auth = useAuth();
  const { token, setAddress, updatePrice } = useTokenData();
  const {
    positions, isLoading, refreshPositions, updatePrices,
    executeBuy, executeSell, executeSellInit, setTakeProfit, setStopLoss,
  } = usePositions(token.address);

  const [tab, setTab] = useState<'buy' | 'sell'>('buy');
  const [slippage, setSlippage] = useState(15);
  const [showTpSl, setShowTpSl] = useState(false);
  const [isCongested, setIsCongested] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: NotifType } | null>(null);
  const canTrade = auth.isLoggedIn && !!token.address && token.priceSol > 0;

  const notify = useCallback((message: string, type: NotifType) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  // Wire up adapter callbacks
  useEffect(() => {
    adapter.onTokenChange(async (address) => {
      setAddress(address);
      setTimeout(() => refreshPositions(), 500);
    });

    adapter.onPriceUpdate((price) => {
      updatePrice(price.priceUsd, price.priceSol);
    });
  }, [adapter, setAddress, refreshPositions, updatePrice]);

  // Listen for WebSocket price updates from background
  useEffect(() => {
    const handler = (message: any) => {
      if (message.type === 'WS_EVENT' && message.data?.type === 'price_update') {
        const d = message.data;
        if (d.token_address === token.address) {
          updatePrice(d.price_usd ?? token.priceUsd, d.price_sol ?? token.priceSol);
          if (d.price_sol > 0) updatePrices(d.price_sol);
        }
      }
    };
    chrome.runtime.onMessage.addListener(handler);
    return () => chrome.runtime.onMessage.removeListener(handler);
  }, [token.address, token.priceUsd, token.priceSol, updatePrice, updatePrices]);

  // ─── Trade Handlers ─────────────────────────────────────
  const injectFillMarker = useCallback((type: 'buy' | 'sell' | 'sell_init', result: any) => {
    const trade = result?.trade ?? {};
    const position = result?.position ?? positions[0];
    adapter.injectTradeMarker({
      type: trade.trade_type ?? type,
      tokenSymbol: trade.token_symbol ?? position?.tokenSymbol ?? token.symbol,
      priceUsd: Number(trade.price_usd ?? position?.currentPriceUsd ?? token.priceUsd ?? 0),
      marketCapUsd: Number(trade.market_cap_usd ?? position?.marketCapUsd ?? token.marketCap ?? 0),
      amountSol: Number(trade.amount_sol ?? result?.amountSol ?? result?.solReceived ?? 0),
    });
  }, [adapter, positions, token.marketCap, token.priceUsd, token.symbol]);

  const handleBuy = async (amount: number) => {
    if (!auth.isLoggedIn) {
      notify('Sign in from PaperApe to trade here', 'info');
      openDashboard();
      return;
    }
    if (!token.address || token.priceSol <= 0) {
      notify('Token price is not ready yet', 'error');
      return;
    }
    notify('Executing buy...', 'info');
    const result = await executeBuy(amount, slippage);
    if (!result) return;
    if (result.success) {
      notify(`Bought with ${amount} SOL`, 'success');
      auth.updateBalance(-amount);
      injectFillMarker('buy', result);
      if (result.position) {
        adapter.injectPnlRow({
          tokenSymbol: result.position.tokenSymbol,
          entryPrice: result.position.entryPrice,
          currentPrice: result.position.currentPrice,
          pnlPercent: result.position.pnlPercent,
          amountSol: result.position.amountSol,
          isMoonBag: result.position.isMoonBag,
        });
      }
    } else {
      const isCong = result.isCongestion;
      notify(result.error ?? 'Buy failed', isCong ? 'congestion' : 'error');
      if (isCong) setIsCongested(true);
    }
  };

  const handleSell = async (posId: string, pct: number) => {
    if (!auth.isLoggedIn) {
      notify('Sign in from PaperApe to sell here', 'info');
      openDashboard();
      return;
    }
    notify(`Selling ${pct}%...`, 'info');
    const result = await executeSell(posId, pct);
    if (!result) return;
    if (result.success) {
      const solReceived = result.solReceived ?? 0;
      notify(`Sold! +${solReceived.toFixed(4)} SOL`, 'success');
      auth.updateBalance(solReceived);
      injectFillMarker('sell', result);
      if (result.position && result.position.tokensRemaining > 0) {
        adapter.injectPnlRow({
          tokenSymbol: result.position.tokenSymbol,
          entryPrice: result.position.entryPrice,
          currentPrice: result.position.currentPrice,
          pnlPercent: result.position.pnlPercent,
          amountSol: result.position.amountSol,
          isMoonBag: result.position.isMoonBag,
        });
      }
    } else {
      notify(result.error ?? 'Sell failed', 'error');
    }
  };

  const handleSellInit = async (posId: string) => {
    if (!auth.isLoggedIn) {
      notify('Sign in from PaperApe to sell-init here', 'info');
      openDashboard();
      return;
    }
    notify('Selling initial...', 'info');
    const result = await executeSellInit(posId);
    if (!result) return;
    if (result.success) {
      const solReceived = result.solReceived ?? 0;
      notify('Init recovered. Moon bag active', 'success');
      auth.updateBalance(solReceived);
      injectFillMarker('sell_init', result);
      if (result.position) {
        adapter.injectPnlRow({
          tokenSymbol: result.position.tokenSymbol,
          entryPrice: result.position.entryPrice,
          currentPrice: result.position.currentPrice,
          pnlPercent: result.position.pnlPercent,
          amountSol: result.position.amountSol,
          isMoonBag: result.position.isMoonBag,
        });
      }
    } else {
      notify(result.error ?? 'Sell Init failed', 'error');
    }
  };

  const handleTp = async (posId: string, trigger: number, sell: number) => {
    if (!auth.isLoggedIn) {
      notify('Sign in from PaperApe to set TP', 'info');
      openDashboard();
      return;
    }
    await setTakeProfit(posId, trigger, sell);
    notify(`TP: Sell ${sell}% at +${trigger}%`, 'info');
    setShowTpSl(false);
  };

  const handleSl = async (posId: string, trigger: number) => {
    if (!auth.isLoggedIn) {
      notify('Sign in from PaperApe to set SL', 'info');
      openDashboard();
      return;
    }
    await setStopLoss(posId, trigger);
    notify(`SL: Sell 100% at ${trigger}%`, 'info');
    setShowTpSl(false);
  };

  const pos = positions[0] ?? null;
  const hasPos = positions.length > 0;
  const isProfit = pos ? pos.pnlPercent >= 0 : true;
  const estTokens = token.priceSol > 0 ? Math.floor(1 / token.priceSol).toLocaleString() : '...';

  // ─── Notification Styles ──────────────────────────────
  const notifColors: Record<NotifType, string> = {
    success: 'bg-pa-green/10 border-pa-green/25 text-pa-green',
    error: 'bg-pa-red/10 border-pa-red/25 text-pa-red',
    info: 'bg-pa-blue/10 border-pa-blue/25 text-pa-blue',
    congestion: 'bg-pa-gold/10 border-pa-gold/25 text-pa-gold',
  };

  return (
    <div className="font-display w-[300px] bg-pa-paper border-2 border-pa-muted/20 rounded-[5px] shadow-[2px_3px_8px_rgba(60,40,10,0.18),0_1px_2px_rgba(60,40,10,0.12)] text-pa-ink overflow-hidden select-none relative">
      {/* Tape decoration */}
      <div className="absolute -top-1 left-5 w-[60px] h-5 bg-pa-tape -rotate-1 z-10 rounded-sm" />

      {/* ─── Header ───────────────────────────────────── */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-gradient-to-br from-pa-green/[0.04] to-transparent border-b-2 border-dashed border-pa-muted/15 cursor-grab active:cursor-grabbing">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm tracking-wider uppercase text-pa-ink">PaperApe</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] font-bold text-pa-green bg-pa-green/[0.08] px-2 py-0.5 rounded-sm border border-pa-green/15">
            {fmtSol(auth.balance)} SOL
          </span>
        </div>
      </div>

      {/* ─── Body ─────────────────────────────────────── */}
      <div className="px-3.5 py-2.5">
        {/* Notification */}
        {notification && (
          <div className={`px-2.5 py-1.5 rounded-sm text-[10px] font-bold mb-2 border border-dashed animate-slide-in ${notifColors[notification.type]}`}>
            {notification.message}
          </div>
        )}

        {/* Congestion Banner */}
        {isCongested && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm mb-2 bg-pa-gold/[0.08] border border-dashed border-pa-gold/20 text-[9px] font-bold text-pa-gold">
            <span className="w-[5px] h-[5px] rounded-full bg-pa-gold animate-pulse-dot" />
            Network Congestion — Increase slippage above 10%
          </div>
        )}

        {!auth.isLoading && !auth.isLoggedIn && (
          <div className="mb-2 p-2 rounded-sm border border-dashed border-pa-blue/20 bg-pa-blue/[0.06]">
            <div className="text-[9px] font-bold text-pa-blue uppercase tracking-[0.5px] mb-1">
              Sign in required
            </div>
            <div className="text-[10px] text-pa-muted leading-snug mb-2">
              Connect PaperApe once, then simulated buys and sells work on this platform.
            </div>
            <button
              onClick={openDashboard}
              className="w-full py-1.5 text-[10px] font-bold text-pa-paper bg-pa-blue border border-pa-blue rounded-sm uppercase tracking-[0.5px]"
            >
              Open PaperApe
            </button>
          </div>
        )}

        {/* Token Info */}
        <div className="mb-2.5 pb-2 border-b border-dashed border-pa-muted/12">
          <div className="text-[13px] font-bold text-pa-ink mb-px">{token.name}</div>
          <div className="font-mono text-[9px] text-pa-faded mb-1">{token.address ? token.symbol : '---'}</div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-base font-bold text-pa-ink">{fmtMcap(token.marketCap)}</span>
            <span className="font-mono text-[10px] text-pa-muted">{fmtUsd(token.priceUsd)}</span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-0.5 mb-2.5">
          <button
            onClick={() => setTab('buy')}
            className={`flex-1 py-[7px] font-bold text-[11px] text-center cursor-pointer border-2 font-display tracking-wider transition-all ${
              tab === 'buy'
                ? 'bg-pa-green text-pa-paper border-[#1f5530] shadow-[3px_4px_0px_rgba(60,40,10,0.25)]'
                : 'bg-pa-parchment border-pa-muted/15 text-pa-muted hover:text-pa-ink hover:bg-pa-parchment/80'
            }`}
          >
            BUY
          </button>
          <button
            onClick={() => setTab('sell')}
            className={`flex-1 py-[7px] font-bold text-[11px] text-center cursor-pointer border-2 font-display tracking-wider transition-all ${
              tab === 'sell'
                ? 'bg-pa-red text-pa-paper border-[#6d1818] shadow-[3px_4px_0px_rgba(60,40,10,0.25)]'
                : 'bg-pa-parchment border-pa-muted/15 text-pa-muted hover:text-pa-ink hover:bg-pa-parchment/80'
            }`}
          >
            SELL
          </button>
        </div>

        {/* ─── Buy Panel ──────────────────────────────── */}
        {tab === 'buy' && (
          <>
            <div className="mb-2">
              <div className="text-[8px] font-bold text-pa-faded tracking-[1.5px] uppercase mb-1.5">Buy</div>
              <div className="grid grid-cols-5 gap-[3px]">
                {QUICK_BUY_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => handleBuy(amt)}
                    disabled={isLoading || !canTrade}
                    className="bg-pa-green/[0.06] border-2 border-pa-green/15 text-pa-green text-[9px] font-bold font-mono py-1.5 px-0.5 rounded-sm cursor-pointer transition-all hover:bg-pa-green/[0.12] hover:border-pa-green/30 hover:shadow-[2px_2px_0px_rgba(60,40,10,0.15)] hover:-translate-y-px disabled:opacity-35 disabled:cursor-not-allowed"
                  >
                    {amt} SOL
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-2">
              <div className="text-[8px] font-bold text-pa-faded tracking-[1.5px] uppercase mb-1.5">Slippage</div>
              <div className="flex gap-[3px]">
                {SLIPPAGE_PRESETS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSlippage(s)}
                    className={`flex-1 py-1 text-[9px] font-bold text-center cursor-pointer border rounded-sm font-mono transition-all ${
                      slippage === s
                        ? 'bg-pa-green/10 border-pa-green/25 text-pa-green shadow-[inset_0_0_0_1px_rgba(45,107,63,0.1)]'
                        : 'bg-pa-parchment border-pa-muted/15 text-pa-muted hover:border-pa-muted/25 hover:text-pa-ink'
                    }`}
                  >
                    {s}%
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center px-2.5 py-1.5 bg-pa-green/[0.04] border border-dashed border-pa-muted/12 rounded-sm mb-2">
              <span className="text-[9px] text-pa-faded font-bold uppercase tracking-[0.5px]">Est. Tokens</span>
              <span className="font-mono text-[13px] font-bold text-pa-ink">{estTokens}</span>
            </div>
          </>
        )}

        {/* ─── Sell Panel ─────────────────────────────── */}
        {tab === 'sell' && !hasPos && (
          <div className="text-center py-3.5 text-[10px] text-pa-faded italic">
            No position to sell for this token
          </div>
        )}

        {/* ─── Position Card (shown on both tabs if exists) */}
        {hasPos && pos && (tab === 'sell' || tab === 'buy') && (
          <div className="bg-pa-green/[0.04] border-2 border-dashed border-pa-muted/12 rounded p-2 mb-2">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="font-bold text-xs text-pa-ink">{pos.tokenSymbol}</span>
              {pos.isMoonBag && (
                <span className="text-[7px] font-bold px-1.5 py-px rounded-sm uppercase bg-pa-gold/10 text-pa-gold border border-pa-gold/20 tracking-[0.5px]">
                  Moon Bag
                </span>
              )}
              {pos.isRugged && (
                <span className="text-[7px] font-bold px-1.5 py-px rounded-sm uppercase bg-pa-red/10 text-pa-red border border-pa-red/20 tracking-[0.5px]">
                  Rugged
                </span>
              )}
              <span className={`ml-auto font-mono font-bold text-xs ${isProfit ? 'text-pa-green' : 'text-pa-red'}`}>
                {fmtPct(pos.pnlPercent)}
              </span>
            </div>
            <div className="flex justify-between font-mono text-[9px] text-pa-muted mb-1.5">
              <span>Invested: {fmtSol(pos.amountSol)} SOL</span>
              <span>Value: {fmtSol(pos.currentValue)} SOL</span>
            </div>

            {!pos.isRugged && (
              <>
                {(tab === 'sell') && (
                  <div className="mb-1.5">
                    <div className="text-[8px] font-bold text-pa-faded tracking-[1.5px] uppercase mb-1">Sell</div>
                    <div className="grid grid-cols-4 gap-[3px]">
                      {QUICK_SELL_PCTS.map((pct) => (
                        <button
                          key={pct}
                          onClick={() => handleSell(pos.id, pct)}
                          disabled={isLoading || !auth.isLoggedIn}
                          className="bg-pa-red/[0.06] border-2 border-pa-red/15 text-pa-red text-[9px] font-bold font-mono py-[5px] px-0.5 rounded-sm cursor-pointer transition-all hover:bg-pa-red/[0.12] hover:border-pa-red/30 disabled:opacity-35 disabled:cursor-not-allowed"
                        >
                          {pct}%
                        </button>
                      ))}
                      <button
                        onClick={() => handleSellInit(pos.id)}
                        disabled={isLoading || !auth.isLoggedIn}
                        className="bg-pa-gold/[0.06] border-2 border-pa-gold/15 text-pa-gold text-[8px] font-bold font-display py-[5px] px-0.5 rounded-sm cursor-pointer tracking-[0.5px] uppercase transition-all hover:bg-pa-gold/[0.12] hover:border-pa-gold/30 disabled:opacity-35 disabled:cursor-not-allowed"
                      >
                        Sell Init
                      </button>
                    </div>
                  </div>
                )}

                {tab === 'sell' && (
                  <>
                    <button
                      onClick={() => setShowTpSl(!showTpSl)}
                      disabled={isLoading || !auth.isLoggedIn}
                      className="w-full py-[5px] mt-1.5 text-[9px] font-bold text-pa-blue bg-pa-blue/[0.04] border border-dashed border-pa-blue/15 rounded-sm cursor-pointer font-display transition-all uppercase tracking-wider hover:bg-pa-blue/[0.08] disabled:opacity-35"
                    >
                      {showTpSl ? 'Hide TP/SL' : 'Set TP / SL'}
                    </button>

                    {showTpSl && (
                      <div className="mt-1.5 p-2 bg-pa-muted/[0.03] border border-dashed border-pa-muted/12 rounded-sm">
                        <div className="text-[8px] font-bold text-pa-green tracking-[1.5px] uppercase mb-1">Take Profit</div>
                        <div className="grid grid-cols-2 gap-[3px] mb-2">
                          {TP_PRESETS.map((p) => (
                            <button
                              key={p.trigger}
                              onClick={() => handleTp(pos.id, p.trigger, p.sell)}
                              className="py-[5px] px-[3px] text-[8px] font-bold font-mono rounded-sm cursor-pointer transition-all text-center bg-pa-green/[0.04] border border-pa-green/12 text-pa-green hover:bg-pa-green/10"
                            >
                              +{p.trigger}% / {p.sell}%
                            </button>
                          ))}
                        </div>
                        <div className="text-[8px] font-bold text-pa-red tracking-[1.5px] uppercase mb-1">Stop Loss</div>
                        <div className="grid grid-cols-2 gap-[3px]">
                          {SL_PRESETS.map((t) => (
                            <button
                              key={t}
                              onClick={() => handleSl(pos.id, t)}
                              className="py-[5px] px-[3px] text-[8px] font-bold font-mono rounded-sm cursor-pointer transition-all text-center bg-pa-red/[0.04] border border-pa-red/12 text-pa-red hover:bg-pa-red/10"
                            >
                              {t}%
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* ─── Footer ─────────────────────────────────── */}
        <div className="flex items-center justify-between pt-1.5 border-t border-dashed border-pa-muted/12 mt-1">
          <button
            onClick={openDashboard}
            className="text-[9px] font-bold text-pa-blue bg-transparent border-none cursor-pointer font-display underline underline-offset-2 uppercase tracking-[0.5px] hover:text-[#1e4060]"
          >
            Open Dashboard
          </button>
          <span className="text-[7px] text-pa-tan tracking-wider uppercase">Paper Trading Mode</span>
        </div>
      </div>
    </div>
  );
}
