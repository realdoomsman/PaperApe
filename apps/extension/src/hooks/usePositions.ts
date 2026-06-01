import { useState, useCallback } from 'react';
import { api } from '../lib/messaging';

export interface Position {
  id: string;
  tokenAddress: string;
  tokenSymbol: string;
  tokenName: string;
  amountSol: number;
  tokensRemaining: number;
  entryPrice: number;
  entryPriceUsd: number;
  currentPrice: number;
  currentPriceUsd: number;
  currentValue: number;
  pnlPercent: number;
  marketCapUsd: number;
  isMoonBag: boolean;
  isRugged: boolean;
}

function toNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function mapPosition(p: any): Position {
  return {
    id: String(p.id),
    tokenAddress: p.token_address ?? '',
    tokenSymbol: p.token_symbol ?? '???',
    tokenName: p.token_name ?? 'Unknown',
    amountSol: toNumber(p.amount_sol),
    tokensRemaining: toNumber(p.tokens_remaining),
    entryPrice: toNumber(p.entry_price),
    entryPriceUsd: toNumber(p.entry_price_usd),
    currentPrice: toNumber(p.current_price),
    currentPriceUsd: toNumber(p.current_price_usd),
    currentValue: toNumber(p.current_value),
    pnlPercent: toNumber(p.pnl_percent),
    marketCapUsd: toNumber(p.market_cap_usd),
    isMoonBag: !!p.is_moon_bag,
    isRugged: !!p.is_rugged,
  };
}

export function usePositions(tokenAddress: string | null) {
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refreshPositions = useCallback(async () => {
    if (!tokenAddress) return;
    try {
      const res = await api('GET', '/trades/positions?status=open');
      if (res?.success && res.data?.positions) {
        const filtered = res.data.positions
          .filter((p: any) => p.token_address === tokenAddress)
          .map(mapPosition);
        setPositions(filtered);
      }
    } catch {}
  }, [tokenAddress]);

  const updatePrices = useCallback((priceSol: number) => {
    setPositions((prev) =>
      prev.map((p) => {
        const currentValue = p.tokensRemaining * priceSol;
        const pnlPercent = p.amountSol > 0 ? ((currentValue - p.amountSol) / p.amountSol) * 100 : (currentValue > 0 ? 999 : 0);
        return { ...p, currentPrice: priceSol, currentValue, pnlPercent };
      })
    );
  }, []);

  const executeBuy = useCallback(async (amountSol: number, slippage: number) => {
    if (isLoading || !tokenAddress) return null;
    setIsLoading(true);
    try {
      const res = await api('POST', '/trades/buy', {
        token_address: tokenAddress,
        amount_sol: amountSol,
        slippage_tolerance: slippage,
      });
      if (res?.success) {
        await refreshPositions();
        return {
          success: true,
          amountSol,
          position: res.data?.position ? mapPosition(res.data.position) : null,
          trade: res.data?.trade ?? null,
          congestion: res.data?.congestion,
        };
      }
      return { success: false, error: res?.error ?? 'Buy failed', isCongestion: res?.error?.includes('congestion') };
    } catch (err: any) {
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, tokenAddress, refreshPositions]);

  const executeSell = useCallback(async (positionId: string, percentage: number) => {
    if (isLoading) return null;
    setIsLoading(true);
    try {
      const res = await api('POST', '/trades/sell', { position_id: positionId, percentage });
      if (res?.success) {
        await refreshPositions();
        return {
          success: true,
          solReceived: toNumber(res.data?.sol_received),
          position: res.data?.position ? mapPosition(res.data.position) : null,
          trade: res.data?.trade ?? null,
        };
      }
      return { success: false, error: res?.error ?? 'Sell failed' };
    } catch (err: any) {
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, refreshPositions]);

  const executeSellInit = useCallback(async (positionId: string) => {
    if (isLoading) return null;
    setIsLoading(true);
    try {
      const res = await api('POST', '/trades/sell-init', { position_id: positionId });
      if (res?.success) {
        await refreshPositions();
        return {
          success: true,
          solReceived: toNumber(res.data?.sol_received),
          moonBagTokens: toNumber(res.data?.moon_bag_tokens),
          position: res.data?.position ? mapPosition(res.data.position) : null,
          trade: res.data?.trade ?? null,
        };
      }
      return { success: false, error: res?.error ?? 'Sell Init failed' };
    } catch (err: any) {
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, refreshPositions]);

  const setTakeProfit = useCallback(async (positionId: string, triggerPct: number, sellPct: number) => {
    const pos = positions.find(p => p.id === positionId) ?? positions[0];
    await api('POST', '/trades/auto-orders', {
      position_id: positionId,
      type: 'tp',
      trigger_percent: triggerPct,
      sell_percent: sellPct,
      token_address: tokenAddress,
      entry_price: pos?.entryPrice ?? 0,
    });
  }, [tokenAddress, positions]);

  const setStopLoss = useCallback(async (positionId: string, triggerPct: number) => {
    const pos = positions.find(p => p.id === positionId) ?? positions[0];
    await api('POST', '/trades/auto-orders', {
      position_id: positionId,
      type: 'sl',
      trigger_percent: Math.abs(triggerPct),
      sell_percent: 100,
      token_address: tokenAddress,
      entry_price: pos?.entryPrice ?? 0,
    });
  }, [tokenAddress, positions]);

  return {
    positions,
    isLoading,
    refreshPositions,
    updatePrices,
    executeBuy,
    executeSell,
    executeSellInit,
    setTakeProfit,
    setStopLoss,
  };
}
