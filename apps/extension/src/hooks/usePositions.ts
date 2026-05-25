import { useState, useCallback } from 'react';
import { api } from '../lib/messaging';

export interface Position {
  id: string;
  tokenSymbol: string;
  amountSol: number;
  tokensRemaining: number;
  currentValue: number;
  pnlPercent: number;
  isMoonBag: boolean;
  isRugged: boolean;
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
          .map((p: any) => ({
            id: p.id,
            tokenSymbol: p.token_symbol,
            amountSol: parseFloat(p.amount_sol),
            tokensRemaining: parseFloat(p.tokens_remaining),
            currentValue: parseFloat(p.current_value),
            pnlPercent: parseFloat(p.pnl_percent),
            isMoonBag: p.is_moon_bag,
            isRugged: p.is_rugged,
          }));
        setPositions(filtered);
      }
    } catch {}
  }, [tokenAddress]);

  const updatePrices = useCallback((priceSol: number) => {
    setPositions((prev) =>
      prev.map((p) => {
        const currentValue = p.tokensRemaining * priceSol;
        const pnlPercent = p.amountSol > 0 ? ((currentValue - p.amountSol) / p.amountSol) * 100 : 0;
        return { ...p, currentValue, pnlPercent };
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
        return { success: true, amountSol };
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
        return { success: true, solReceived: res.data?.sol_received ?? 0 };
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
        return { success: true, solReceived: res.data?.sol_received ?? 0 };
      }
      return { success: false, error: res?.error ?? 'Sell Init failed' };
    } catch (err: any) {
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, refreshPositions]);

  const setTakeProfit = useCallback(async (positionId: string, triggerPct: number, sellPct: number) => {
    await api('POST', '/trades/auto-orders', {
      position_id: positionId,
      type: 'tp',
      trigger_percent: triggerPct,
      sell_percent: sellPct,
      token_address: tokenAddress,
      entry_price: positions[0]?.amountSol ?? 0,
    });
  }, [tokenAddress, positions]);

  const setStopLoss = useCallback(async (positionId: string, triggerPct: number) => {
    await api('POST', '/trades/auto-orders', {
      position_id: positionId,
      type: 'sl',
      trigger_percent: Math.abs(triggerPct),
      sell_percent: 100,
      token_address: tokenAddress,
      entry_price: positions[0]?.amountSol ?? 0,
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
