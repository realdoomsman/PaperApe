import { useState, useEffect, useCallback, useRef } from 'react';
import { api, subscribePriceWs, unsubscribePriceWs } from '../lib/messaging';

interface TokenData {
  address: string | null;
  symbol: string;
  name: string;
  priceUsd: number;
  priceSol: number;
  marketCap: number;
}

export function useTokenData() {
  const [token, setToken] = useState<TokenData>({
    address: null,
    symbol: '---',
    name: 'Waiting for token...',
    priceUsd: 0,
    priceSol: 0,
    marketCap: 0,
  });

  const prevAddressRef = useRef<string | null>(null);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchTokenData = useCallback(async (address: string) => {
    try {
      const res = await api('GET', `/tokens/${address}`);
      if (res?.success && res.data?.token) {
        const t = res.data.token;
        setToken({
          address,
          symbol: t.symbol ?? `${address.slice(0, 4)}...${address.slice(-4)}`,
          name: t.name ?? 'Unknown Token',
          priceUsd: parseFloat(t.priceUsd) || 0,
          priceSol: parseFloat(t.priceSol) || 0,
          marketCap: parseFloat(t.marketCap) || 0,
        });
      } else {
        setToken((prev) => ({
          ...prev,
          address,
          symbol: `${address.slice(0, 6)}...${address.slice(-4)}`,
          name: 'Token not found',
        }));
      }
    } catch {
      setToken((prev) => ({
        ...prev,
        address,
        symbol: `${address.slice(0, 6)}...${address.slice(-4)}`,
        name: 'Error loading token',
      }));
    }
  }, []);

  const setAddress = useCallback((address: string) => {
    // Unsubscribe from previous
    if (prevAddressRef.current) unsubscribePriceWs(prevAddressRef.current);
    prevAddressRef.current = address;

    setToken((prev) => ({
      ...prev,
      address,
      symbol: `${address.slice(0, 6)}...${address.slice(-4)}`,
      name: 'Loading...',
    }));

    fetchTokenData(address);
    subscribePriceWs(address);

    // Refresh every 30 seconds
    if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    refreshIntervalRef.current = setInterval(() => fetchTokenData(address), 30_000);
  }, [fetchTokenData]);

  const updatePrice = useCallback((priceUsd: number, priceSol: number) => {
    setToken((prev) => ({ ...prev, priceUsd, priceSol }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (prevAddressRef.current) unsubscribePriceWs(prevAddressRef.current);
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, []);

  return { token, setAddress, updatePrice, refetch: fetchTokenData };
}
