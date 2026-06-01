import { useState, useEffect, useCallback } from 'react';
import { api, getAuthStatus, sendMessage } from '../lib/messaging';

interface AuthState {
  isLoggedIn: boolean;
  userName: string;
  balance: number;
  isLoading: boolean;
}

export function useAuth() {
  const [auth, setAuth] = useState<AuthState>({
    isLoggedIn: false,
    userName: 'Paper Trader',
    balance: 0,
    isLoading: true,
  });

  const checkAuth = useCallback(async () => {
    try {
      const authRes = await getAuthStatus();

      if (authRes?.data?.isLoggedIn) {
        const userRes = await api('GET', '/auth/me');
        if (userRes?.success && userRes.data?.user) {
          setAuth({
            isLoggedIn: true,
            userName: userRes.data.user.username ?? 'Paper Trader',
            balance: parseFloat(userRes.data.user.paper_balance ?? 100),
            isLoading: false,
          });
          return;
        }
      }

      // Dev mode auto-login fallback
      const config = await chrome.storage.local.get(['webapp_url']);
      const isDev = !config.webapp_url || config.webapp_url.includes('localhost');
      if (isDev) {
        const loginRes = await sendMessage({
          type: 'LOGIN',
          token: `ext-auto-${Date.now()}`,
          user: { email: 'ext@paperape.io', name: 'Paper Trader' },
        });
        if (loginRes?.success) {
          const userRes = await api('GET', '/auth/me');
          setAuth({
            isLoggedIn: true,
            userName: userRes?.data?.user?.username ?? 'Paper Trader',
            balance: parseFloat(userRes?.data?.user?.paper_balance ?? 100),
            isLoading: false,
          });
          return;
        }
      }

      setAuth((prev) => ({ ...prev, isLoggedIn: false, isLoading: false }));
    } catch {
      setAuth((prev) => ({ ...prev, isLoggedIn: false, isLoading: false }));
    }
  }, []);

  const updateBalance = useCallback((delta: number) => {
    setAuth((prev) => ({ ...prev, balance: prev.balance + delta }));
  }, []);

  const refreshBalance = useCallback(async () => {
    try {
      const res = await api('GET', '/auth/me');
      if (res?.success && res.data?.user) {
        setAuth((prev) => ({
          ...prev,
          balance: parseFloat(res.data.user.paper_balance),
        }));
      }
    } catch {}
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  return { ...auth, updateBalance, refreshBalance };
}
