'use client';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import PaperChart from '@/components/PaperChart';
import { useAuth } from '@/components/AuthContext';
import { useMode } from '@/components/ModeContext';
import { apiRequest } from '@/lib/api';
import { symbolToAddress, genId } from '@/lib/engine';

// Extended position with token address for live price tracking
interface Position {
  id: string;
  symbol: string;
  name: string;
  tokenAddress: string;
  image: string | null;
  entryPrice: number;     // price per token in SOL at entry
  entryPriceUsd: number;  // USD price at entry
  amount: number;         // SOL invested
  tokens: number;         // tokens held
  currentPrice: number;   // current price in SOL
  currentPriceUsd: number;
  pnl: number;            // PnL in SOL
  pnlPercent: number;
  currentValue: number;   // current value in SOL
  isMoonBag: boolean;
  timestamp: number;
}

const FEATURED = ['SOL', 'BONK', 'WIF', 'JUP', 'RAY', 'POPCAT'];

interface LiveTokenData {
  address: string;
  symbol: string;
  name: string;
  priceUsd: number;
  priceSol: number;
  priceChange24h: number;
  volume24h: number;
  liquidity: number;
  marketCap: number;
  image: string | null;
  pairAddress?: string;
  txns?: { m5?: { buys: number; sells: number }; h1?: { buys: number; sells: number }; h24?: { buys: number; sells: number } };
  socials?: { twitter?: string; telegram?: string; website?: string; discord?: string };
}

export default function TerminalPage() {
  return <Suspense fallback={<div style={{ minHeight: '100vh', background: 'var(--bg-0)' }} />}><TerminalInner /></Suspense>;
}

function TerminalInner() {
  const { mode } = useMode();
  const { token: authToken } = useAuth();
  const searchParams = useSearchParams();

  const initToken = searchParams.get('token') || '';
  const initCA = searchParams.get('ca') || '';

  const [selectedToken, setSelectedToken] = useState(initToken || 'BONK');
  const [tokenAddress, setTokenAddress] = useState(initCA || symbolToAddress(initToken || 'BONK'));
  const [liveData, setLiveData] = useState<LiveTokenData | null>(null);
  const [loadingToken, setLoadingToken] = useState(false);
  const [solPrice, setSolPrice] = useState(0);

  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<LiveTokenData[]>([]);
  const [searchFocused, setSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<{ symbol: string; name: string; address: string; image: string | null }[]>([]);
  const [tab, setTab] = useState<'buy' | 'sell' | 'dca'>('buy');
  const [amount, setAmount] = useState('1');
  const [slippage, setSlippage] = useState(15);
  const [balance, setBalance] = useState(100);
  const [positions, setPositions] = useState<Position[]>([]);
  const [toasts, setToasts] = useState<{ id: number; msg: string; type: string; createdAt: number }[]>([]);
  let toastIdRef = 0;
  const [loading, setLoading] = useState(false);
  const [sellPercent, setSellPercent] = useState(100);
  const [priority, setPriority] = useState<'normal' | 'turbo' | 'yolo'>('normal');
  const [congestion, setCongestion] = useState<'low' | 'medium' | 'high'>('low');
  const [activityTab, setActivityTab] = useState<'trades' | 'pnl'>('trades');
  const [showShortcuts, setShowShortcuts] = useState(false);

  // DCA state
  interface DCAOrder { id: string; tokenSymbol: string; amountPerBuy: number; intervalMs: number; totalBuys: number; executedBuys: number; totalSpent: number; status: string; nextBuyAt: number; }
  const [dcaAmount, setDcaAmount] = useState('0.5');
  const [dcaInterval, setDcaInterval] = useState('1h');
  const [dcaTotalBuys, setDcaTotalBuys] = useState('10');
  const [dcaOrders, setDcaOrders] = useState<DCAOrder[]>([]);
  const [dcaLoading, setDcaLoading] = useState(false);

  // Price Alerts state
  interface PriceAlert { id: string; tokenSymbol: string; tokenAddress: string; targetPrice: number; direction: 'above' | 'below'; }
  const [showAlerts, setShowAlerts] = useState(false);
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [alertPrice, setAlertPrice] = useState('');
  const [alertDir, setAlertDir] = useState<'above' | 'below'>('above');

  // Fetch alerts
  useEffect(() => {
    if (!authToken) return;
    apiRequest('GET', '/alerts', undefined, authToken).then(r => {
      if (r.success && r.data?.alerts) setAlerts(r.data.alerts);
    }).catch(() => {});
  }, [authToken]);

  // Fetch DCA orders
  useEffect(() => {
    if (!authToken) return;
    apiRequest('GET', '/trades/dca', undefined, authToken).then(r => {
      if (r.success && r.data?.orders) setDcaOrders(r.data.orders);
    }).catch(() => {});
  }, [authToken]);

  // ─── Load Recent Searches ──────────────────────────────
  useEffect(() => {
    try { const s = localStorage.getItem('pa_recent_tokens'); if (s) setRecentSearches(JSON.parse(s)); } catch {}
  }, []);

  // ─── Fetch Real SOL Price + Network Status ─────────────
  useEffect(() => {
    const fetchStatus = () => {
      apiRequest('GET', '/tokens/sol-price').then(r => {
        if (r.success && r.data?.price) setSolPrice(r.data.price);
      }).catch(() => {});
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/health`)
        .then(r => r.json())
        .then(r => { if (r.network?.congestion) setCongestion(r.network.congestion); })
        .catch(() => {});
    };
    fetchStatus();
    const iv = setInterval(fetchStatus, 30000);
    return () => clearInterval(iv);
  }, []);

  // ─── Fetch Live Token Data from API ──────────────────
  const fetchTokenData = useCallback(async (address: string) => {
    setLoadingToken(true);
    try {
      const res = await apiRequest('GET', `/tokens/${address}`);
      if (res.success && res.data?.token) {
        const t = res.data.token;
        setLiveData({
          address: t.address,
          symbol: t.symbol,
          name: t.name,
          priceUsd: t.priceUsd,
          priceSol: t.priceSol,
          priceChange24h: t.priceChange24h,
          volume24h: t.volume24h,
          liquidity: t.liquidity ?? t.liquidityUsd,
          marketCap: t.marketCap ?? t.market_cap_usd,
          image: t.image,
          pairAddress: t.pairAddress,
          txns: res.data.txns ?? undefined,
          socials: t.socials ?? res.data.metadata ?? undefined,
        });
        setSelectedToken(t.symbol);
      } else {
        setLiveData(null);
      }
    } catch {
      setLiveData(null);
    }
    setLoadingToken(false);
  }, []);

  useEffect(() => {
    if (tokenAddress) fetchTokenData(tokenAddress);
  }, [tokenAddress, fetchTokenData]);

  // ─── WebSocket Real-Time Price Stream ─────────────────
  useEffect(() => {
    if (!tokenAddress) return;

    const wsUrl = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001').replace(/^http/, 'ws') + '/ws';
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let alive = true;

    function connect() {
      if (!alive) return;
      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          // Subscribe to the currently-viewed token
          ws?.send(JSON.stringify({ type: 'subscribe_price', token_address: tokenAddress }));
          // Also subscribe to ALL open position tokens for multi-position PnL
          positions.forEach(p => {
            if (p.tokenAddress && p.tokenAddress !== tokenAddress) {
              ws?.send(JSON.stringify({ type: 'subscribe_price', token_address: p.tokenAddress }));
            }
          });
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'price_update') {
              // Update live data for the currently-viewed token
              if (data.token_address === tokenAddress) {
                setLiveData(prev => {
                  if (!prev) return prev;
                  return {
                    ...prev,
                    priceUsd: data.price_usd ?? prev.priceUsd,
                    priceSol: data.price_sol ?? prev.priceSol,
                  };
                });
              }
              // Update PnL for ALL positions matching this token
              const priceSol = data.price_sol;
              const priceUsd = data.price_usd;
              if (priceSol > 0) {
                setPositions(prev => prev.map(p => {
                  if (p.tokenAddress !== data.token_address) return p;
                  const currentValue = p.tokens * priceSol;
                  const pnl = currentValue - p.amount;
                  const pnlPercent = p.amount > 0 ? (pnl / p.amount) * 100 : 0;
                  return { ...p, currentPrice: priceSol, currentPriceUsd: priceUsd || p.currentPriceUsd, currentValue, pnl, pnlPercent };
                }));
              }
            }
          } catch {}
        };

        ws.onclose = () => {
          if (alive) {
            reconnectTimer = setTimeout(connect, 3000);
          }
        };

        ws.onerror = () => {
          ws?.close();
        };
      } catch {
        if (alive) {
          reconnectTimer = setTimeout(connect, 5000);
        }
      }
    }

    connect();

    // Also do a full data refresh every 30s for volume/mcap/txns
    const fullRefresh = setInterval(() => fetchTokenData(tokenAddress), 30000);

    return () => {
      alive = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) {
        try {
          ws.send(JSON.stringify({ type: 'unsubscribe_price', token_address: tokenAddress }));
          positions.forEach(p => {
            if (p.tokenAddress && p.tokenAddress !== tokenAddress) {
              ws?.send(JSON.stringify({ type: 'unsubscribe_price', token_address: p.tokenAddress }));
            }
          });
        } catch {}
        ws.close();
      }
      clearInterval(fullRefresh);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenAddress, fetchTokenData]);

  // ─── Derived: effective token address ─────────────────
  const effectiveAddress = tokenAddress || symbolToAddress(selectedToken);

  // ─── Live PnL recalculation when price updates ────────
  useEffect(() => {
    if (!liveData) return;
    setPositions(prev => prev.map(p => {
      // Only update position matching current token
      if (p.tokenAddress !== effectiveAddress && p.symbol !== liveData.symbol) return p;
      const newPriceSol = liveData.priceSol || (solPrice > 0 && liveData.priceUsd > 0 ? liveData.priceUsd / solPrice : p.currentPrice);
      const newPriceUsd = liveData.priceUsd || 0;
      if (newPriceSol <= 0) return p;
      const currentValue = p.tokens * newPriceSol;
      const pnl = currentValue - p.amount;
      // Value-based PnL: (currentValue - invested) / invested * 100
      const pnlPercent = p.amount > 0 ? (pnl / p.amount) * 100 : 0;
      return { ...p, currentPrice: newPriceSol, currentPriceUsd: newPriceUsd, currentValue, pnl, pnlPercent };
    }));
  }, [liveData, solPrice, effectiveAddress]);

  // Search handler
  useEffect(() => {
    if (!searchQ.trim()) { setSearchResults([]); return; }
    const isCA = searchQ.length >= 32 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(searchQ);
    if (isCA) { setTokenAddress(searchQ); setSearchQ(''); return; }
    const timeout = setTimeout(() => {
      apiRequest('GET', `/tokens/search?q=${encodeURIComponent(searchQ.trim())}`).then(r => {
        if (r.success && r.data?.tokens?.length > 0) {
          setSearchResults(r.data.tokens.slice(0, 8).map((t: any) => ({
            address: t.address, symbol: t.symbol, name: t.name, priceUsd: t.priceUsd, priceSol: t.priceSol,
            priceChange24h: t.priceChange24h, volume24h: t.volume24h, liquidity: t.liquidity,
            marketCap: t.marketCap ?? t.market_cap_usd, image: t.image,
          })));
        }
      }).catch(() => {});
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchQ]);

  // Fetch balance + restore positions on mount
  useEffect(() => {
    if (!authToken) return;
    apiRequest('GET', '/auth/me', undefined, authToken).then(r => {
      if (r.success && r.data?.user) setBalance(parseFloat(r.data.user.paper_balance ?? 100));
    }).catch(() => {});

    // Hydrate positions from API so they survive page refresh
    apiRequest('GET', '/trades/positions?status=open', undefined, authToken).then(r => {
      if (r.success && r.data?.positions && r.data.positions.length > 0) {
        const hydrated: Position[] = r.data.positions.map((p: any) => {
          const entryPrice = parseFloat(p.entry_price) || 0;
          const currentPrice = parseFloat(p.current_price) || entryPrice;
          const tokens = parseFloat(p.tokens_remaining) || 0;
          const amountSol = parseFloat(p.amount_sol) || 0;
          const currentValue = tokens * currentPrice;
          const pnl = currentValue - amountSol;
          const pnlPercent = amountSol > 0 ? (pnl / amountSol) * 100 : 0;
          return {
            id: p.id,
            symbol: p.token_symbol || '???',
            name: p.token_name || 'Unknown',
            tokenAddress: p.token_address || '',
            image: p.token_image || null,
            entryPrice,
            entryPriceUsd: parseFloat(p.entry_price_usd) || 0,
            amount: amountSol,
            tokens,
            currentPrice,
            currentPriceUsd: parseFloat(p.current_price_usd) || 0,
            currentValue,
            pnl,
            pnlPercent,
            isMoonBag: p.is_moon_bag || false,
            timestamp: new Date(p.opened_at || Date.now()).getTime(),
          };
        });
        setPositions(hydrated);
      }
    }).catch(() => {});
  }, [authToken]);

  const playTradeSound = useCallback((type: string) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.value = 0.08;
      if (type === 'buy') {
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(900, ctx.currentTime + 0.1);
      } else if (type === 'sell') {
        osc.frequency.setValueAtTime(900, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(500, ctx.currentTime + 0.12);
      } else if (type === 'error') {
        osc.frequency.setValueAtTime(200, ctx.currentTime);
      } else {
        osc.frequency.setValueAtTime(700, ctx.currentTime);
      }
      osc.type = 'sine';
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.stop(ctx.currentTime + 0.2);
    } catch {}
  }, []);

  const showToast = useCallback((msg: string, type: string) => {
    const id = ++toastIdRef;
    setToasts(prev => [...prev.slice(-4), { id, msg, type, createdAt: Date.now() }]); // max 5
    playTradeSound(type);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, [playTradeSound]);

  // Copy contract address to clipboard
  const copyCA = useCallback(() => {
    if (!effectiveAddress) return;
    navigator.clipboard.writeText(effectiveAddress).then(() => {
      showToast('Contract address copied!', 'buy');
    }).catch(() => {});
  }, [effectiveAddress, showToast]);

  // ─── Keyboard Shortcuts (Pro Mode) ─────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip if user is typing in an input
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      switch (e.key.toLowerCase()) {
        case 'b': setTab('buy'); break;
        case 's': setTab('sell'); break;
        case 'd': setTab('dca'); break;
        case 'escape': setSearchQ(''); setSearchResults([]); break;
        case '1': setAmount('0.1'); break;
        case '2': setAmount('0.5'); break;
        case '3': setAmount('1'); break;
        case '4': setAmount('2'); break;
        case '5': setAmount('5'); break;
        case '6': setAmount('10'); break;
        case '7': setAmount('25'); break;
        case 'c':
          if (e.shiftKey) copyCA();
          break;
        case '/':
          if (e.shiftKey) setShowShortcuts(p => !p);
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [copyCA]);

  // Display values
  const displaySymbol = liveData?.symbol || selectedToken;
  const displayName = liveData?.name || 'Unknown';
  const displayPrice = liveData?.priceUsd || 0;
  const displayMcap = liveData?.marketCap || 0;
  const displayLiq = liveData?.liquidity || 0;
  const displayChange = liveData?.priceChange24h || 0;
  const displayImage = liveData?.image || null;
  const displayVolume = liveData?.volume24h || 0;
  const displayPriceSol = liveData?.priceSol || (solPrice > 0 && displayPrice > 0 ? displayPrice / solPrice : 0);

  const estTokens = displayPriceSol > 0 ? parseFloat(amount || '0') / displayPriceSol : 0;

  // ─── Trade Execution ─────────────────────────────────
  // Trade confirmation state
  const [showConfirm, setShowConfirm] = useState(false);

  const requestTrade = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    // Require confirmation for large trades (>10 SOL or >10% of balance)
    if (tab === 'buy' && (amt > 10 || amt > balance * 0.1)) {
      setShowConfirm(true);
      return;
    }
    executeTrade();
  };

  const executeTrade = async () => {
    setShowConfirm(false);
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    setLoading(true);
    try {
      if (tab === 'buy') {
        const res = await apiRequest('POST', '/trades/buy', {
          token_address: effectiveAddress, amount_sol: amt, slippage_tolerance: slippage, priority,
        }, authToken || undefined);
        if (!res.success) { showToast(res.error || 'Trade failed', 'error'); setLoading(false); return; }
        const { position: apiPos, trade: apiTrade } = res.data as any;
        apiRequest('GET', '/auth/me', undefined, authToken || undefined).then(r => {
          if (r.success && r.data?.user) setBalance(parseFloat(r.data.user.paper_balance ?? 0));
        });
        const investedSol = parseFloat(apiPos.amount_sol) || amt;
        const tokensHeld = parseFloat(apiPos.tokens_remaining) || 0;
        const currentPriceSol = parseFloat(apiPos.current_price) || displayPriceSol;
        const currentVal = tokensHeld * currentPriceSol;
        const pnlVal = currentVal - investedSol;
        const pnlPct = investedSol > 0 ? (pnlVal / investedSol) * 100 : 0;
        const newPos: Position = {
          id: apiPos.id,
          symbol: apiPos.token_symbol || displaySymbol,
          name: apiPos.token_name || displayName,
          tokenAddress: effectiveAddress,
          image: apiPos.token_image || liveData?.image || null,
          entryPrice: parseFloat(apiPos.entry_price) || displayPriceSol,
          entryPriceUsd: displayPrice,
          amount: investedSol,
          tokens: tokensHeld,
          currentPrice: currentPriceSol,
          currentPriceUsd: displayPrice,
          currentValue: currentVal,
          pnl: pnlVal,
          pnlPercent: pnlPct,
          isMoonBag: apiPos.is_moon_bag || false,
          timestamp: Date.now(),
        };
        setPositions(prev => {
          const existing = prev.findIndex(p => p.id === apiPos.id);
          if (existing >= 0) { const u = [...prev]; u[existing] = newPos; return u; }
          return [...prev, newPos];
        });
        showToast(`Bought ${(apiTrade.amount_tokens || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} ${displaySymbol}`, 'buy');
        window.dispatchEvent(new CustomEvent('pa:notification', { detail: { title: `Bought ${displaySymbol}`, message: `${(apiTrade.amount_tokens || 0).toLocaleString()} tokens for ${amount} SOL`, type: 'trade' } }));
      } else {
        const pos = positions.find(p => p.symbol === displaySymbol || p.tokenAddress === effectiveAddress);
        if (!pos) { showToast('No position to sell', 'error'); setLoading(false); return; }
        const res = await apiRequest('POST', '/trades/sell', {
          position_id: pos.id, percentage: sellPercent,
        }, authToken || undefined);
        if (!res.success) { showToast(res.error || 'Sell failed', 'error'); setLoading(false); return; }
        const { position: apiPos, sol_received } = res.data as any;
        apiRequest('GET', '/auth/me', undefined, authToken || undefined).then(r => {
          if (r.success && r.data?.user) setBalance(parseFloat(r.data.user.paper_balance ?? 0));
        });
        if (apiPos.status === 'closed') {
          setPositions(prev => prev.filter(p => p.id !== pos.id));
        } else {
          setPositions(prev => prev.map(p => p.id === pos.id ? {
            ...p, tokens: apiPos.tokens_remaining, amount: apiPos.amount_sol,
            currentPrice: apiPos.current_price, pnl: apiPos.pnl_sol || 0, pnlPercent: apiPos.pnl_percent || 0,
          } : p));
        }
        showToast(`Sold ${displaySymbol} for ${(sol_received || 0).toFixed(4)} SOL`, 'sell');
        window.dispatchEvent(new CustomEvent('pa:notification', { detail: { title: `Sold ${displaySymbol}`, message: `Received ${(sol_received || 0).toFixed(4)} SOL`, type: 'trade' } }));
      }
    } catch (err: any) {
      showToast(err.message || 'Network error', 'error');
    }
    setLoading(false);
  };

  const doSellInit = async (posId: string) => {
    try {
      const res = await apiRequest('POST', '/trades/sell-init', { position_id: posId }, authToken || undefined);
      if (!res.success) { showToast(res.error || 'Sell Init failed', 'error'); return; }
      const { position: apiPos, sol_received, moon_bag_tokens } = res.data as any;
      apiRequest('GET', '/auth/me', undefined, authToken || undefined).then(r => {
        if (r.success && r.data?.user) setBalance(parseFloat(r.data.user.paper_balance ?? 0));
      });
      setPositions(prev => prev.map(p => p.id === posId ? { ...p, tokens: moon_bag_tokens, isMoonBag: true, amount: 0, currentPrice: apiPos.current_price } : p));
      showToast(`Init recovered: ${(sol_received || 0).toFixed(4)} SOL`, 'buy');
    } catch (err: any) { showToast(err.message || 'Sell Init failed', 'error'); }
  };

  const curPos = positions.find(p => p.tokenAddress === effectiveAddress || p.symbol === displaySymbol);

  // Total portfolio PnL
  const totalPnl = positions.reduce((s, p) => s + p.pnl, 0);
  const totalInvested = positions.reduce((s, p) => s + p.amount, 0);
  const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  const selectFeatured = (sym: string) => { setSelectedToken(sym); setTokenAddress(symbolToAddress(sym)); setSearchQ(''); };
  const selectSearchResult = (t: LiveTokenData) => {
    setTokenAddress(t.address); setLiveData(t); setSelectedToken(t.symbol); setSearchResults([]); setSearchQ('');
    // Save to recent searches
    setRecentSearches(prev => {
      const entry = { symbol: t.symbol, name: t.name, address: t.address, image: t.image };
      const filtered = prev.filter(r => r.address !== t.address);
      const next = [entry, ...filtered].slice(0, 5);
      localStorage.setItem('pa_recent_tokens', JSON.stringify(next));
      return next;
    });
  };

  const PRO_PRESETS = [0.1, 0.5, 1, 2, 5, 10, 25];

  return (
    <AppShell balance={balance}>
      {/* Stackable Toasts */}
      {toasts.length > 0 && (
        <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 340 }}>
          {toasts.map((t, i) => (
            <div key={t.id} className={`toast ${t.type}`} style={{ position: 'relative', overflow: 'hidden', animation: 'fadeInUp 0.2s ease', opacity: 1 - (i * 0.05) }}>
              {t.msg}
              <div style={{ position: 'absolute', bottom: 0, left: 0, height: 2, background: 'currentColor', opacity: 0.3, animation: 'toastProgress 4s linear forwards' }} />
              <button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))} style={{ position: 'absolute', top: 4, right: 8, background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 12, opacity: 0.5 }}>×</button>
            </div>
          ))}
        </div>
      )}

      {/* Keyboard Shortcut Overlay */}
      {showShortcuts && (
        <>
          <div onClick={() => setShowShortcuts(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10000, backdropFilter: 'blur(4px)' }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            background: 'var(--bg-0)', border: '2px solid var(--border-1)', borderRadius: 16,
            padding: '24px 28px', maxWidth: 400, width: '90%', zIndex: 10001,
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)', animation: 'fadeInUp 0.15s ease',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--t0)', margin: 0 }}>Keyboard Shortcuts</h3>
              <button onClick={() => setShowShortcuts(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', fontSize: 16 }}>×</button>
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              {[
                ['B', 'Switch to Buy'],
                ['S', 'Switch to Sell'],
                ['D', 'Switch to DCA'],
                ['1-7', 'Select amount preset'],
                ['Shift+C', 'Copy contract address'],
                ['⌘K', 'Open command palette'],
                ['?', 'Toggle this overlay'],
                ['ESC', 'Clear search / Close'],
              ].map(([key, desc]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed var(--border-0)' }}>
                  <span style={{ fontSize: 12, color: 'var(--t1)' }}>{desc}</span>
                  <kbd style={{ padding: '2px 8px', background: 'var(--bg-2)', borderRadius: 4, fontSize: 10, fontWeight: 600, color: 'var(--t2)', border: '1px solid var(--border-0)', fontFamily: 'monospace' }}>{key}</kbd>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Trade Confirmation Modal */}
      {showConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeInUp 0.15s ease' }}>
          <div style={{ background: 'var(--bg-1)', border: '2px solid var(--border-1)', borderRadius: 16, padding: '28px 32px', maxWidth: 380, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 16 }}>⚠ Confirm Trade</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
              <div style={{ padding: '10px 12px', background: 'var(--bg-2)', borderRadius: 8 }}>
                <div style={{ fontSize: 9, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Type</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: tab === 'buy' ? 'var(--green)' : 'var(--red)' }}>{tab.toUpperCase()}</div>
              </div>
              <div style={{ padding: '10px 12px', background: 'var(--bg-2)', borderRadius: 8 }}>
                <div style={{ fontSize: 9, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Token</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--t0)' }}>{displaySymbol}</div>
              </div>
              <div style={{ padding: '10px 12px', background: 'var(--bg-2)', borderRadius: 8 }}>
                <div style={{ fontSize: 9, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Amount</div>
                <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: 'var(--t0)' }}>{amount} SOL</div>
              </div>
              <div style={{ padding: '10px 12px', background: 'var(--bg-2)', borderRadius: 8 }}>
                <div style={{ fontSize: 9, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Slippage</div>
                <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: 'var(--t0)' }}>{slippage}%</div>
              </div>
            </div>
            <div style={{ padding: '8px 12px', background: 'rgba(255,179,0,0.06)', border: '1px solid var(--gold)', borderRadius: 6, marginBottom: 18, fontSize: 11, color: 'var(--gold)' }}>
              This trade is {parseFloat(amount) > 10 ? `${amount} SOL — a large order` : `${((parseFloat(amount) / balance) * 100).toFixed(0)}% of your balance`}. Please confirm.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn haptic" style={{ flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 12 }} onClick={() => setShowConfirm(false)}>Cancel</button>
              <button className="btn primary haptic" style={{ flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 12, fontWeight: 700, background: tab === 'buy' ? 'var(--green)' : 'var(--red)', color: '#fff', border: 'none' }} onClick={executeTrade}>
                Confirm {tab === 'buy' ? 'Buy' : 'Sell'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Position Banner (always visible when open position) ═══ */}
      {positions.length > 0 && (
        <div className="an" style={{ marginBottom: 12 }}>
          <div className="card" style={{ padding: 0 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', borderBottom: '1px dashed var(--border-0)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--t3)', letterSpacing: 1, textTransform: 'uppercase' }}>Active Positions</span>
                <span className="mono" style={{ fontSize: 10, color: 'var(--t3)' }}>{positions.length}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 9, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Total PnL</div>
                  <div className={`mono ${totalPnlPct >= 0 ? 'up' : 'down'}`} style={{ fontSize: 12, fontWeight: 700 }}>
                    {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(4)} SOL ({totalPnlPct >= 0 ? '+' : ''}{totalPnlPct.toFixed(1)}%)
                  </div>
                </div>
              </div>
            </div>
            {/* Position cards */}
            <div style={{ display: 'flex', gap: 0, overflowX: 'auto' }}>
              {positions.map(p => (
                <button key={p.id} onClick={() => { setTokenAddress(p.tokenAddress); setSelectedToken(p.symbol); }} className="haptic"
                  style={{ flex: '0 0 auto', padding: '8px 14px', borderRight: '1px dashed var(--border-0)', background: p.tokenAddress === effectiveAddress ? (p.pnlPercent >= 0 ? 'var(--green-bg)' : 'var(--red-bg)') : 'transparent', transition: 'background 0.15s', minWidth: 140 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--t0)' }}>{p.symbol}</span>
                    <span className={`mono ${p.pnlPercent >= 0 ? 'up' : 'down'}`} style={{ fontSize: 12, fontWeight: 700 }}>
                      {p.pnlPercent >= 0 ? '+' : ''}{p.pnlPercent.toFixed(1)}%
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--t3)' }}>
                    <span>Entry: {p.entryPriceUsd > 0 ? `$${p.entryPriceUsd < 0.01 ? p.entryPriceUsd.toExponential(1) : p.entryPriceUsd.toFixed(4)}` : `${p.entryPrice.toFixed(6)} SOL`}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--t3)', marginTop: 2 }}>
                    <span className="mono">{p.amount.toFixed(2)} SOL in</span>
                    <span className={`mono ${p.pnl >= 0 ? 'up' : 'down'}`}>{p.pnl >= 0 ? '+' : ''}{p.pnl.toFixed(3)} SOL</span>
                  </div>
                  {p.isMoonBag && <div style={{ fontSize: 8, fontWeight: 700, color: 'var(--gold)', marginTop: 2, textTransform: 'uppercase', letterSpacing: 1 }}>Moon Bag</div>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="page-head an">
        <div>
          <h1>Terminal</h1>
          <div className="page-head-sub">Paper trade any Solana token with advanced mechanics</div>
        </div>
        <div className="nav-bal"><span className="mono" style={{ color: 'var(--green)' }}>{balance.toFixed(4)}</span> SOL</div>
      </div>

      {/* Token Picker */}
      <div className="an an1" style={{ marginBottom: 14 }}>
        <div style={{ position: 'relative' }}>
          <input className="inp" placeholder="Search token name or paste contract address..."
            value={searchQ} onChange={e => setSearchQ(e.target.value)}
            onFocus={() => setSearchFocused(true)} onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
            style={{ marginBottom: 8 }} />
          {/* Recent searches dropdown */}
          {searchFocused && !searchQ && recentSearches.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-1)', border: '2px solid var(--border-1)', borderRadius: 4, zIndex: 50, boxShadow: 'var(--paper-shadow)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 14px', borderBottom: '1px dashed var(--border-0)' }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Recent</span>
                <button onClick={() => { setRecentSearches([]); localStorage.removeItem('pa_recent_tokens'); }} className="haptic" style={{ background: 'none', border: 'none', fontSize: 9, color: 'var(--t3)', cursor: 'pointer' }}>Clear</button>
              </div>
              {recentSearches.map(r => (
                <button key={r.address} onClick={() => { setTokenAddress(r.address); setSelectedToken(r.symbol); setSearchQ(''); setSearchFocused(false); }}
                  className="haptic" style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 14px', borderBottom: '1px solid var(--border-0)', textAlign: 'left' }}>
                  {r.image ? <img src={r.image} alt={r.symbol} style={{ width: 20, height: 20, borderRadius: '50%' }} /> : <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: 'var(--t2)' }}>{r.symbol.slice(0, 2)}</div>}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t0)' }}>{r.symbol}</div>
                    <div style={{ fontSize: 9, color: 'var(--t3)' }}>{r.name}</div>
                  </div>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="2"><path d="M13 17l5-5-5-5M6 17l5-5-5-5"/></svg>
                </button>
              ))}
            </div>
          )}
          {searchQ && searchResults.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-1)', border: '2px solid var(--border-1)', borderRadius: 4, zIndex: 50, maxHeight: 250, overflow: 'auto', boxShadow: 'var(--paper-shadow)' }}>
              {searchResults.map(t => (
                <button key={t.address} onClick={() => selectSearchResult(t)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', borderBottom: '1px solid var(--border-0)', textAlign: 'left' }}
                  className="haptic">
                  {t.image ? (
                    <img src={t.image} alt={t.symbol} style={{ width: 24, height: 24, borderRadius: '50%' }} />
                  ) : (
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: 'var(--t2)' }}>{t.symbol.slice(0, 2)}</div>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t0)' }}>{t.symbol}</div>
                    <div style={{ fontSize: 10, color: 'var(--t3)' }}>{t.name}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="mono" style={{ fontSize: 11, color: 'var(--t1)' }}>{fmtMcap(t.marketCap)}</div>
                    <div className={`mono ${t.priceChange24h >= 0 ? 'up' : 'down'}`} style={{ fontSize: 10 }}>
                      {t.priceChange24h >= 0 ? '+' : ''}{t.priceChange24h.toFixed(1)}%
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {FEATURED.map(sym => (
            <button key={sym} className={`preset haptic ${selectedToken === sym ? 'on' : ''}`} onClick={() => selectFeatured(sym)} style={{ padding: '8px 16px', fontSize: 12 }}>{sym}</button>
          ))}
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 14 }} className="terminal-grid an an2">
        {/* Left column: Chart + Activity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Chart */}
          <div className="card torn-paper">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--border-0)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {displayImage ? (
                  <img src={displayImage} alt={displaySymbol} style={{ width: 32, height: 32, borderRadius: '50%' }} />
                ) : (
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--t2)' }}>{displaySymbol.slice(0, 2)}</div>
                )}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--t0)' }}>{displaySymbol}</span>
                    {effectiveAddress && (
                      <button onClick={copyCA} className="haptic" title="Copy contract address (Shift+C)"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 6px', background: 'var(--bg-2)', border: '1px solid var(--border-1)', borderRadius: 3, fontSize: 9, color: 'var(--t3)', cursor: 'pointer' }}>
                        {effectiveAddress.slice(0, 4)}...{effectiveAddress.slice(-4)}
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--t3)' }}>{displayName}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--t0)' }}>{fmtMcap(displayMcap)}</div>
                <div className="mono" style={{ fontSize: 10, color: 'var(--t3)' }}>MCap</div>
              </div>
            </div>
            {/* Keyboard shortcuts hint */}
            {mode === 'pro' && (
              <div style={{ display: 'flex', gap: 8, padding: '4px 18px', fontSize: 9, color: 'var(--t3)', borderBottom: '1px dashed var(--border-0)' }}>
                <span><kbd style={{ padding: '1px 4px', background: 'var(--bg-2)', borderRadius: 2, fontSize: 8, border: '1px solid var(--border-1)' }}>B</kbd> Buy</span>
                <span><kbd style={{ padding: '1px 4px', background: 'var(--bg-2)', borderRadius: 2, fontSize: 8, border: '1px solid var(--border-1)' }}>S</kbd> Sell</span>
                <span><kbd style={{ padding: '1px 4px', background: 'var(--bg-2)', borderRadius: 2, fontSize: 8, border: '1px solid var(--border-1)' }}>D</kbd> DCA</span>
                <span><kbd style={{ padding: '1px 4px', background: 'var(--bg-2)', borderRadius: 2, fontSize: 8, border: '1px solid var(--border-1)' }}>1-7</kbd> Amount</span>
                <span><kbd style={{ padding: '1px 4px', background: 'var(--bg-2)', borderRadius: 2, fontSize: 8, border: '1px solid var(--border-1)' }}>⇧C</kbd> Copy CA</span>
              </div>
            )}
            {loadingToken ? (
              <div style={{ height: 420, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t3)', fontSize: 13 }}>Loading chart data...</div>
            ) : (
              <div style={{ height: 420 }}>
                <PaperChart tokenAddress={effectiveAddress} pairAddress={liveData?.pairAddress} height={420} />
              </div>
            )}
            <div style={{ display: 'flex', gap: 1, background: 'var(--border-1)', borderTop: '1px dashed var(--border-1)' }}>
              {[
                { l: 'Price', v: displayPrice < 0.01 ? `$${displayPrice.toExponential(2)}` : `$${displayPrice.toFixed(4)}` },
                { l: 'Volume', v: fmtVol(displayVolume) },
                { l: 'Liquidity', v: fmtMcap(displayLiq) },
                { l: '24h', v: `${displayChange >= 0 ? '+' : ''}${displayChange.toFixed(1)}%`, cls: displayChange >= 0 ? 'up' : 'down' },
              ].map(s => (
                <div key={s.l} style={{ flex: 1, padding: '8px 12px', textAlign: 'center', background: 'var(--bg-1)' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--t3)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2 }}>{s.l}</div>
                  <div className={`mono ${(s as any).cls || ''}`} style={{ fontSize: 12, fontWeight: 600, color: (s as any).cls ? undefined : 'var(--t1)' }}>{s.v}</div>
                </div>
              ))}
            </div>

            {/* Socials Row */}
            {liveData && (liveData as any).socials && (
              <div style={{ display: 'flex', gap: 6, padding: '6px 14px', flexWrap: 'wrap' }}>
                {(liveData as any).socials.website && (
                  <a href={(liveData as any).socials.website} target="_blank" rel="noopener noreferrer" className="btn haptic" style={{ fontSize: 9, padding: '3px 10px', gap: 3 }}>
                    🌐 Website
                  </a>
                )}
                {(liveData as any).socials.twitter && (
                  <a href={(liveData as any).socials.twitter} target="_blank" rel="noopener noreferrer" className="btn haptic" style={{ fontSize: 9, padding: '3px 10px', gap: 3 }}>
                    𝕏 Twitter
                  </a>
                )}
                {(liveData as any).socials.telegram && (
                  <a href={(liveData as any).socials.telegram} target="_blank" rel="noopener noreferrer" className="btn haptic" style={{ fontSize: 9, padding: '3px 10px', gap: 3 }}>
                    ✈ Telegram
                  </a>
                )}
                {(liveData as any).socials.discord && (
                  <a href={(liveData as any).socials.discord} target="_blank" rel="noopener noreferrer" className="btn haptic" style={{ fontSize: 9, padding: '3px 10px', gap: 3 }}>
                    💬 Discord
                  </a>
                )}
              </div>
            )}
            {/* Price Alerts */}
            <div style={{ borderTop: '1px dashed var(--border-0)' }}>
              <button onClick={() => setShowAlerts(!showAlerts)} className="haptic" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', fontSize: 10, fontWeight: 600, color: 'var(--t2)', background: 'none', border: 'none', cursor: 'pointer', width: '100%' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                Price Alerts {alerts.filter(a => a.tokenAddress === effectiveAddress).length > 0 && <span style={{ background: 'var(--accent-bg)', color: 'var(--accent-l)', padding: '1px 5px', borderRadius: 8, fontSize: 8, fontWeight: 700 }}>{alerts.filter(a => a.tokenAddress === effectiveAddress).length}</span>}
              </button>
              {showAlerts && (
                <div style={{ padding: '8px 14px 12px', borderTop: '1px solid var(--border-0)' }}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                    <input className="inp" type="number" placeholder={`Price in USD (current: $${displayPrice < 0.01 ? displayPrice.toExponential(2) : displayPrice.toFixed(4)})`}
                      value={alertPrice} onChange={e => setAlertPrice(e.target.value)}
                      style={{ flex: 1, fontSize: 11, padding: '6px 10px' }} />
                    <button onClick={() => setAlertDir(alertDir === 'above' ? 'below' : 'above')} className={`preset on`} style={{ padding: '5px 10px', fontSize: 9, minWidth: 50 }}>
                      {alertDir === 'above' ? '↑ Above' : '↓ Below'}
                    </button>
                    <button className="btn primary haptic" style={{ padding: '5px 12px', fontSize: 9 }} onClick={async () => {
                      if (!alertPrice || !authToken) return;
                      const r = await apiRequest('POST', '/alerts', { tokenAddress: effectiveAddress, tokenSymbol: displaySymbol, targetPrice: alertPrice, direction: alertDir }, authToken);
                      if (r.success && r.data?.alert) {
                        setAlerts(prev => [...prev, r.data.alert]);
                        setAlertPrice('');
                        showToast(`Alert set: ${displaySymbol} ${alertDir} $${alertPrice}`, 'info');
                      }
                    }}>Set</button>
                  </div>
                  {alerts.filter(a => a.tokenAddress === effectiveAddress).length > 0 && (
                    <div style={{ fontSize: 10 }}>
                      {alerts.filter(a => a.tokenAddress === effectiveAddress).map(a => (
                        <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dashed var(--border-0)' }}>
                          <span className="mono" style={{ color: a.direction === 'above' ? 'var(--green)' : 'var(--red)' }}>
                            {a.direction === 'above' ? '↑' : '↓'} ${a.targetPrice < 0.01 ? a.targetPrice.toExponential(2) : a.targetPrice.toFixed(4)}
                          </span>
                          <button onClick={async () => {
                            await apiRequest('DELETE', `/alerts/${a.id}`, undefined, authToken || undefined);
                            setAlerts(prev => prev.filter(x => x.id !== a.id));
                          }} className="haptic" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: 'var(--t3)', padding: 2 }}>×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Collapsible Token Info Panel */}
            {liveData && (
              <details style={{ borderTop: '1px dashed var(--border-0)' }}>
                <summary style={{ padding: '6px 14px', fontSize: 10, fontWeight: 600, color: 'var(--t2)', cursor: 'pointer', userSelect: 'none', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                  Token Details
                </summary>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, padding: '0 0 1px', background: 'var(--border-0)' }}>
                  {[
                    { l: 'Market Cap', v: displayMcap > 0 ? fmtMcap(displayMcap) : '-' },
                    { l: 'Price (SOL)', v: displayPriceSol > 0 ? displayPriceSol.toExponential(3) : '-' },
                    { l: 'Liquidity', v: displayLiq > 0 ? fmtMcap(displayLiq) : '-' },
                    { l: 'Volume 24h', v: displayVolume > 0 ? fmtVol(displayVolume) : '-' },
                    { l: 'Change 24h', v: `${displayChange >= 0 ? '+' : ''}${displayChange.toFixed(1)}%`, cls: displayChange >= 0 ? 'up' : 'down' },
                    { l: 'DEX', v: (liveData as any).dex || 'Raydium' },
                  ].map(s => (
                    <div key={s.l} style={{ padding: '6px 10px', background: 'var(--bg-1)' }}>
                      <div style={{ fontSize: 8, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.l}</div>
                      <div className={`mono ${(s as any).cls || ''}`} style={{ fontSize: 11, fontWeight: 600, color: (s as any).cls ? undefined : 'var(--t1)' }}>{s.v}</div>
                    </div>
                  ))}
                </div>
                {liveData?.txns && (
                  <div style={{ display: 'flex', gap: 1, background: 'var(--border-0)' }}>
                    {Object.entries(liveData.txns).map(([k, v]) => (
                      <div key={k} style={{ flex: 1, padding: '5px 10px', background: 'var(--bg-1)' }}>
                        <div style={{ fontSize: 8, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase' }}>{k}</div>
                        <div style={{ fontSize: 10, display: 'flex', gap: 6 }}>
                          <span className="up mono" style={{ fontWeight: 600 }}>{(v as any)?.buys ?? 0}B</span>
                          <span className="down mono" style={{ fontWeight: 600 }}>{(v as any)?.sells ?? 0}S</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </details>
            )}
          </div>

          {/* ─── Live Activity / PnL Panel ──────────────── */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderBottom: '1px dashed var(--border-1)', gap: 4 }}>
              <button onClick={() => setActivityTab('trades')} className={`preset ${activityTab === 'trades' ? 'on' : ''}`} style={{ padding: '5px 12px', fontSize: 10 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>
                  Activity
                </span>
              </button>
              <button onClick={() => setActivityTab('pnl')} className={`preset ${activityTab === 'pnl' ? 'on' : ''}`} style={{ padding: '5px 12px', fontSize: 10 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                  PnL Flex
                </span>
              </button>
            </div>

            {activityTab === 'trades' ? (
              <div style={{ padding: '12px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--t3)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>Live Buy / Sell Activity</div>
                {liveData?.txns ? (
                  <div>
                    {/* 5m */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span className="mono" style={{ fontSize: 10, color: 'var(--t3)', width: 28 }}>5m</span>
                      <div style={{ flex: 1, display: 'flex', height: 18, borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{
                          width: `${((liveData.txns.m5?.buys ?? 0) / Math.max(1, (liveData.txns.m5?.buys ?? 0) + (liveData.txns.m5?.sells ?? 0))) * 100}%`,
                          background: 'var(--green)', minWidth: 2, transition: 'width 0.3s'
                        }} />
                        <div style={{ flex: 1, background: 'var(--red)' }} />
                      </div>
                      <span className="mono up" style={{ fontSize: 10, width: 40, textAlign: 'right' }}>{liveData.txns.m5?.buys ?? 0}</span>
                      <span className="mono down" style={{ fontSize: 10, width: 40 }}>{liveData.txns.m5?.sells ?? 0}</span>
                    </div>
                    {/* 1h */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span className="mono" style={{ fontSize: 10, color: 'var(--t3)', width: 28 }}>1h</span>
                      <div style={{ flex: 1, display: 'flex', height: 18, borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{
                          width: `${((liveData.txns.h1?.buys ?? 0) / Math.max(1, (liveData.txns.h1?.buys ?? 0) + (liveData.txns.h1?.sells ?? 0))) * 100}%`,
                          background: 'var(--green)', minWidth: 2, transition: 'width 0.3s'
                        }} />
                        <div style={{ flex: 1, background: 'var(--red)' }} />
                      </div>
                      <span className="mono up" style={{ fontSize: 10, width: 40, textAlign: 'right' }}>{liveData.txns.h1?.buys ?? 0}</span>
                      <span className="mono down" style={{ fontSize: 10, width: 40 }}>{liveData.txns.h1?.sells ?? 0}</span>
                    </div>
                    {/* 24h */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="mono" style={{ fontSize: 10, color: 'var(--t3)', width: 28 }}>24h</span>
                      <div style={{ flex: 1, display: 'flex', height: 18, borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{
                          width: `${((liveData.txns.h24?.buys ?? 0) / Math.max(1, (liveData.txns.h24?.buys ?? 0) + (liveData.txns.h24?.sells ?? 0))) * 100}%`,
                          background: 'var(--green)', minWidth: 2, transition: 'width 0.3s'
                        }} />
                        <div style={{ flex: 1, background: 'var(--red)' }} />
                      </div>
                      <span className="mono up" style={{ fontSize: 10, width: 40, textAlign: 'right' }}>{liveData.txns.h24?.buys ?? 0}</span>
                      <span className="mono down" style={{ fontSize: 10, width: 40 }}>{liveData.txns.h24?.sells ?? 0}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6, fontSize: 9, color: 'var(--t3)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><span style={{ width: 6, height: 6, borderRadius: 1, background: 'var(--green)', display: 'inline-block' }}/> Buys</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><span style={{ width: 6, height: 6, borderRadius: 1, background: 'var(--red)', display: 'inline-block' }}/> Sells</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--t3)', fontSize: 11 }}>No activity data available</div>
                )}
              </div>
            ) : (
              /* PnL Flex */
              <div style={{ padding: '14px' }}>
                {curPos ? (
                  <div>
                    <div style={{ textAlign: 'center', marginBottom: 14 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--t3)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Your {displaySymbol} PnL</div>
                      <div className={`mono ${curPos.pnlPercent >= 0 ? 'up' : 'down'}`} style={{ fontSize: 32, fontWeight: 700 }}>
                        {curPos.pnlPercent >= 0 ? '+' : ''}{curPos.pnlPercent.toFixed(1)}%
                      </div>
                      <div className="mono" style={{ fontSize: 13, color: 'var(--t2)', marginTop: 4 }}>
                        {curPos.pnl >= 0 ? '+' : ''}{curPos.pnl.toFixed(4)} SOL
                      </div>
                    </div>
                    {/* Flex card */}
                    <div style={{ padding: '14px', background: curPos.pnlPercent >= 0 ? 'var(--green-bg)' : 'var(--red-bg)', border: `2px dashed ${curPos.pnlPercent >= 0 ? 'var(--green)' : 'var(--red)'}`, borderRadius: 4 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <div>
                          <div style={{ fontSize: 9, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 1 }}>Entry</div>
                          <div className="mono" style={{ fontSize: 11, color: 'var(--t1)' }}>{curPos.entryPrice.toFixed(8)} SOL</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 9, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 1 }}>Current</div>
                          <div className="mono" style={{ fontSize: 11, color: 'var(--t1)' }}>{curPos.currentPrice.toFixed(8)} SOL</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 9, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 1 }}>Invested</div>
                          <div className="mono" style={{ fontSize: 11, color: 'var(--t1)' }}>{curPos.amount.toFixed(4)} SOL</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 9, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 1 }}>Tokens</div>
                          <div className="mono" style={{ fontSize: 11, color: 'var(--t1)' }}>{curPos.tokens.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                        </div>
                      </div>
                      <div style={{ marginTop: 10, textAlign: 'center' }}>
                        <div style={{ fontSize: 9, color: 'var(--t3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>{curPos.isMoonBag ? 'Moon Bag Active' : 'Position Open'}</div>
                        <div style={{ fontSize: 18, fontWeight: 700 }}>
                          <span style={{ background: 'linear-gradient(135deg, var(--t0), var(--green))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            PAPERAPE
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '30px 0' }}>
                    <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 8 }}>No open position in {displaySymbol}</div>
                    <div style={{ fontSize: 10, color: 'var(--t3)' }}>Buy some tokens to see your PnL flex here</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Trade Panel + Positions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card">
            <div className="card-pad">
              <div className="card-title" style={{ marginBottom: 14 }}>{tab === 'buy' ? `Buy ${displaySymbol}` : `Sell ${displaySymbol}`}</div>

              {curPos && (
                <div style={{ padding: '10px 12px', background: curPos.pnlPercent >= 0 ? 'var(--green-bg)' : 'var(--red-bg)', border: `2px dashed ${curPos.pnlPercent >= 0 ? 'var(--green)' : 'var(--red)'}`, borderRadius: 4, marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: curPos.pnlPercent >= 0 ? 'var(--green)' : 'var(--red)', textTransform: 'uppercase', letterSpacing: 1 }}>{curPos.isMoonBag ? 'Moon Bag' : 'Open Position'}</div>
                    <div className={`mono ${curPos.pnlPercent >= 0 ? 'up' : 'down'}`} style={{ fontSize: 16, fontWeight: 700 }}>
                      {curPos.pnlPercent >= 0 ? '+' : ''}{curPos.pnlPercent.toFixed(1)}%
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 10 }}>
                    <div>
                      <div style={{ color: 'var(--t3)', fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 }}>Entry</div>
                      <div className="mono" style={{ color: 'var(--t1)', fontWeight: 600 }}>${curPos.entryPriceUsd < 0.01 ? curPos.entryPriceUsd.toExponential(2) : curPos.entryPriceUsd.toFixed(4)}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--t3)', fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 }}>MCap</div>
                      <div className="mono" style={{ color: 'var(--t1)', fontWeight: 600 }}>{displayMcap ? (displayMcap > 1e9 ? `$${(displayMcap / 1e9).toFixed(1)}B` : displayMcap > 1e6 ? `$${(displayMcap / 1e6).toFixed(1)}M` : `$${(displayMcap / 1e3).toFixed(0)}K`) : '-'}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--t3)', fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 }}>Invested</div>
                      <div className="mono" style={{ color: 'var(--t1)', fontWeight: 600 }}>{curPos.amount.toFixed(4)} SOL</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--t3)', fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 }}>Value</div>
                      <div className={`mono ${curPos.pnl >= 0 ? 'up' : 'down'}`} style={{ fontWeight: 600 }}>{curPos.currentValue.toFixed(4)} SOL</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--t3)', fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 }}>Tokens</div>
                      <div className="mono" style={{ color: 'var(--t1)', fontWeight: 600 }}>{curPos.tokens.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--t3)', fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 }}>PnL</div>
                      <div className={`mono ${curPos.pnl >= 0 ? 'up' : 'down'}`} style={{ fontWeight: 600 }}>{curPos.pnl >= 0 ? '+' : ''}{curPos.pnl.toFixed(4)} SOL</div>
                    </div>
                  </div>
                </div>
              )}

              {/* BUY/SELL */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
                <button className="haptic" onClick={() => setTab('buy')} style={{ flex: 1, padding: '10px 0', fontWeight: 700, fontSize: 13, textAlign: 'center', letterSpacing: 2, transition: 'all 0.15s', background: tab === 'buy' ? 'var(--green)' : 'var(--bg-2)', color: tab === 'buy' ? 'var(--bg-1)' : 'var(--t3)', border: `2px solid ${tab === 'buy' ? 'var(--green)' : 'var(--border-1)'}`, boxShadow: tab === 'buy' ? 'var(--cardboard-shadow)' : 'none' }}>BUY</button>
                <button className="haptic" onClick={() => setTab('sell')} style={{ flex: 1, padding: '10px 0', fontWeight: 700, fontSize: 13, textAlign: 'center', letterSpacing: 2, transition: 'all 0.15s', background: tab === 'sell' ? 'var(--red)' : 'var(--bg-2)', color: tab === 'sell' ? 'var(--bg-1)' : 'var(--t3)', border: `2px solid ${tab === 'sell' ? 'var(--red)' : 'var(--border-1)'}`, boxShadow: tab === 'sell' ? 'var(--cardboard-shadow)' : 'none' }}>SELL</button>
                <button className="haptic" onClick={() => setTab('dca')} style={{ flex: 1, padding: '10px 0', fontWeight: 700, fontSize: 11, textAlign: 'center', letterSpacing: 2, transition: 'all 0.15s', background: tab === 'dca' ? 'var(--cyan)' : 'var(--bg-2)', color: tab === 'dca' ? 'var(--bg-1)' : 'var(--t3)', border: `2px solid ${tab === 'dca' ? 'var(--cyan)' : 'var(--border-1)'}`, boxShadow: tab === 'dca' ? 'var(--cardboard-shadow)' : 'none' }}>DCA</button>
              </div>

              {tab === 'buy' && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase' }}>Amount (SOL)</div>
                  <input className="inp" type="number" step="0.1" placeholder="0.0" value={amount} onChange={e => setAmount(e.target.value)} style={{ marginBottom: 8 }} />
                  <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
                    {PRO_PRESETS.map(v => (
                      <button key={v} className={`preset haptic ${amount === String(v) ? 'on' : ''}`} onClick={() => setAmount(String(v))} style={{ fontSize: 10, padding: '4px 8px' }}>{v}</button>
                    ))}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase' }}>Slippage Tolerance</div>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
                    {[1, 5, 10, 15, 25].map(v => (
                      <button key={v} className={`preset haptic ${slippage === v ? 'on' : ''}`} onClick={() => setSlippage(v)} style={{ fontSize: 10 }}>{v}%</button>
                    ))}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase' }}>Priority Fee</div>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
                    {(['normal', 'turbo', 'yolo'] as const).map(v => (
                      <button key={v} className={`preset haptic ${priority === v ? 'on' : ''}`} onClick={() => setPriority(v)}
                        style={{ flex: 1, fontSize: 10, color: v === 'yolo' ? 'var(--red)' : v === 'turbo' ? 'var(--gold)' : undefined }}>
                        {v === 'normal' ? '⚡ Normal' : v === 'turbo' ? '🔥 Turbo' : '💀 YOLO'}
                      </button>
                    ))}
                  </div>
                  {congestion !== 'low' && (
                    <div style={{ padding: '6px 10px', background: congestion === 'high' ? 'var(--red-bg)' : 'rgba(255,179,0,0.08)', border: `1px solid ${congestion === 'high' ? 'var(--red)' : 'var(--gold)'}`, borderRadius: 4, marginBottom: 10, fontSize: 10, color: congestion === 'high' ? 'var(--red)' : 'var(--gold)', fontWeight: 600 }}>
                      ⚠ Network congestion: {congestion.toUpperCase()} — {congestion === 'high' ? 'Txs may fail. Use Turbo/YOLO.' : 'Slight delays expected.'}
                    </div>
                  )}
                  <div style={{ padding: '10px 12px', background: 'var(--bg-2)', border: '1px dashed var(--border-1)', borderRadius: 4, marginBottom: 14 }}>
                    <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--t3)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 3 }}>Est. Tokens Received</div>
                    <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--t0)' }}>
                      {isFinite(estTokens) && estTokens > 0 ? estTokens.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0'} <span style={{ fontSize: 11, color: 'var(--t3)' }}>{displaySymbol}</span>
                    </div>
                  </div>
                  <button className="btn primary lg haptic" style={{ width: '100%', justifyContent: 'center', borderRadius: 12 }} onClick={requestTrade} disabled={loading}>
                    {loading ? 'Executing...' : `Buy ${displaySymbol}`}
                  </button>
                </>
              )}

              {tab === 'sell' && (
                <>
                  {!curPos ? (
                    <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 12, color: 'var(--t3)' }}>No {displaySymbol} position to sell</div>
                  ) : (
                    <>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t2)', marginBottom: 8 }}>Sell percentage:</div>
                      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                        {[10, 25, 50, 75, 100].map(v => (
                          <button key={v} className={`preset haptic ${sellPercent === v ? 'on' : ''}`} onClick={() => setSellPercent(v)} style={{ flex: 1, fontSize: 11, fontWeight: 700 }}>{v}%</button>
                        ))}
                      </div>
                      <button className="btn danger lg haptic" style={{ width: '100%', justifyContent: 'center', borderRadius: 12, background: 'var(--red)', color: '#fff', border: 'none' }} onClick={requestTrade} disabled={loading}>
                        {loading ? 'Executing...' : `Sell ${displaySymbol}`}
                      </button>
                      {!curPos.isMoonBag && (
                        <button className="btn haptic" style={{ width: '100%', justifyContent: 'center', marginTop: 8, borderRadius: 12, color: 'var(--gold)', background: 'var(--gold-bg)', border: '1px solid var(--gold)' }}
                          onClick={() => doSellInit(curPos.id)}>
                          Sell Init (Recover {curPos.amount.toFixed(2)} SOL)
                        </button>
                      )}

                      {/* TP/SL Quick Set */}
                      <div style={{ marginTop: 14, padding: '12px 14px', background: 'var(--bg-2)', borderRadius: 10, border: '1px solid var(--border-0)' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t1)', marginBottom: 8, letterSpacing: 0.5 }}>AUTO TRIGGERS</div>
                        <div style={{ fontSize: 10, color: 'var(--t3)', marginBottom: 8 }}>Take Profit</div>
                        <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
                          {[50, 100, 200, 500, 1000].map(v => (
                            <button key={v} className="preset haptic" style={{ flex: 1, fontSize: 9, fontWeight: 700, color: 'var(--green)' }}
                              onClick={async () => {
                                const res = await apiRequest('POST', '/trades/auto-orders', {
                                  position_id: curPos.id, type: 'tp', trigger_percent: v,
                                  sell_percent: 100, token_address: curPos.tokenAddress, entry_price: curPos.entryPrice,
                                }, authToken || undefined);
                                if (res.success) showToast(`TP set at +${v}%`, 'buy');
                                else showToast(res.error || 'Failed', 'error');
                              }}>
                              +{v}%
                            </button>
                          ))}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--t3)', marginBottom: 8 }}>Stop Loss</div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {[-10, -25, -50, -75].map(v => (
                            <button key={v} className="preset haptic" style={{ flex: 1, fontSize: 9, fontWeight: 700, color: 'var(--red)' }}
                              onClick={async () => {
                                const res = await apiRequest('POST', '/trades/auto-orders', {
                                  position_id: curPos.id, type: 'sl', trigger_percent: v,
                                  sell_percent: 100, token_address: curPos.tokenAddress, entry_price: curPos.entryPrice,
                                }, authToken || undefined);
                                if (res.success) showToast(`SL set at ${v}%`, 'sell');
                                else showToast(res.error || 'Failed', 'error');
                              }}>
                              {v}%
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}

              {tab === 'dca' && (
                <>
                  <div style={{ fontSize: 10, color: 'var(--t3)', marginBottom: 12, lineHeight: 1.5 }}>
                    Dollar Cost Average — Automatically buy {displaySymbol} at regular intervals.
                  </div>

                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase' }}>Amount Per Buy (SOL)</div>
                  <input className="inp" type="number" step="0.1" min="0.01" placeholder="0.5" value={dcaAmount} onChange={e => setDcaAmount(e.target.value)} style={{ marginBottom: 8 }} />
                  <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
                    {[0.1, 0.25, 0.5, 1, 2].map(v => (
                      <button key={v} className={`preset haptic ${dcaAmount === String(v) ? 'on' : ''}`} onClick={() => setDcaAmount(String(v))} style={{ fontSize: 10, padding: '4px 8px' }}>{v}</button>
                    ))}
                  </div>

                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase' }}>Buy Interval</div>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
                    {[
                      { v: '1m', l: '1 min' }, { v: '5m', l: '5 min' }, { v: '15m', l: '15 min' },
                      { v: '1h', l: '1 hr' }, { v: '4h', l: '4 hr' }, { v: '1d', l: '1 day' },
                    ].map(opt => (
                      <button key={opt.v} className={`preset haptic ${dcaInterval === opt.v ? 'on' : ''}`} onClick={() => setDcaInterval(opt.v)} style={{ flex: 1, fontSize: 9, padding: '5px 4px' }}>{opt.l}</button>
                    ))}
                  </div>

                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase' }}>Total Buys</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <input className="inp" type="range" min="2" max="50" value={dcaTotalBuys} onChange={e => setDcaTotalBuys(e.target.value)} style={{ flex: 1, padding: 0 }} />
                    <span className="mono" style={{ fontSize: 14, fontWeight: 700, color: 'var(--t0)', minWidth: 28, textAlign: 'right' }}>{dcaTotalBuys}</span>
                  </div>

                  {/* Cost Estimate */}
                  <div style={{ padding: '10px 12px', background: 'var(--cyan-bg)', border: '1px dashed var(--cyan)', borderRadius: 4, marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Total Cost</span>
                      <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--t0)' }}>{(parseFloat(dcaAmount || '0') * parseInt(dcaTotalBuys || '0')).toFixed(2)} SOL</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Duration</span>
                      <span className="mono" style={{ fontSize: 11, color: 'var(--t2)' }}>
                        {(() => {
                          const intervals: Record<string, number> = { '1m': 60000, '5m': 300000, '15m': 900000, '1h': 3600000, '4h': 14400000, '1d': 86400000 };
                          const totalMs = (intervals[dcaInterval] || 3600000) * parseInt(dcaTotalBuys || '0');
                          if (totalMs >= 86400000) return `${(totalMs / 86400000).toFixed(1)} days`;
                          if (totalMs >= 3600000) return `${(totalMs / 3600000).toFixed(1)} hours`;
                          return `${(totalMs / 60000).toFixed(0)} mins`;
                        })()}
                      </span>
                    </div>
                  </div>

                  <button className="btn primary lg haptic" disabled={dcaLoading} style={{ width: '100%', justifyContent: 'center', borderRadius: 12, background: 'var(--cyan)', border: 'none', color: '#fff' }}
                    onClick={async () => {
                      setDcaLoading(true);
                      try {
                        const intervals: Record<string, number> = { '1m': 60000, '5m': 300000, '15m': 900000, '1h': 3600000, '4h': 14400000, '1d': 86400000 };
                        const res = await apiRequest('POST', '/trades/dca', {
                          token_address: effectiveAddress, token_symbol: displaySymbol, amount_per_buy: parseFloat(dcaAmount),
                          interval_ms: intervals[dcaInterval] || 3600000, total_buys: parseInt(dcaTotalBuys),
                        }, authToken || undefined);
                        if (res.success) {
                          showToast(`DCA started: ${dcaTotalBuys} buys of ${dcaAmount} SOL`, 'buy');
                          // Refresh DCA orders
                          const r2 = await apiRequest('GET', '/trades/dca', undefined, authToken || undefined);
                          if (r2.success && r2.data?.orders) setDcaOrders(r2.data.orders);
                        } else {
                          showToast(res.error || 'DCA creation failed', 'error');
                        }
                      } catch (err: any) { showToast(err.message || 'DCA failed', 'error'); }
                      setDcaLoading(false);
                    }}>
                    {dcaLoading ? 'Starting...' : `Start DCA — ${displaySymbol}`}
                  </button>

                  {/* Active DCA Orders */}
                  {dcaOrders.length > 0 && (
                    <div style={{ marginTop: 14 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--t3)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Active DCA Orders</div>
                      {dcaOrders.map(order => {
                        const pct = order.totalBuys > 0 ? (order.executedBuys / order.totalBuys) * 100 : 0;
                        return (
                          <div key={order.id} style={{ padding: '10px 12px', background: 'var(--bg-2)', borderRadius: 6, marginBottom: 6, border: '1px solid var(--border-0)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--t0)' }}>{order.tokenSymbol}</span>
                              <span className="mono" style={{ fontSize: 10, color: order.status === 'active' ? 'var(--green)' : 'var(--gold)', fontWeight: 600 }}>
                                {order.status === 'active' ? '● Active' : order.status === 'paused' ? '⏸ Paused' : '✓ Complete'}
                              </span>
                            </div>
                            {/* Progress bar */}
                            <div style={{ height: 4, background: 'var(--border-1)', borderRadius: 2, marginBottom: 6, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: 'var(--cyan)', borderRadius: 2, transition: 'width 0.3s' }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--t3)' }}>
                              <span className="mono">{order.executedBuys}/{order.totalBuys} buys</span>
                              <span className="mono">{order.amountPerBuy} SOL each</span>
                              <span className="mono">{order.totalSpent?.toFixed(2) || '0'} spent</span>
                            </div>
                            {order.status !== 'completed' && (
                              <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                                <button className="preset haptic" style={{ flex: 1, fontSize: 9, color: 'var(--gold)' }}
                                  onClick={async () => {
                                    await apiRequest('POST', `/trades/dca/${order.id}/pause`, undefined, authToken || undefined);
                                    const r2 = await apiRequest('GET', '/trades/dca', undefined, authToken || undefined);
                                    if (r2.success && r2.data?.orders) setDcaOrders(r2.data.orders);
                                    showToast(order.status === 'active' ? 'DCA paused' : 'DCA resumed', 'buy');
                                  }}>
                                  {order.status === 'active' ? '⏸ Pause' : '▶ Resume'}
                                </button>
                                <button className="preset haptic" style={{ flex: 1, fontSize: 9, color: 'var(--red)' }}
                                  onClick={async () => {
                                    await apiRequest('DELETE', `/trades/dca/${order.id}`, undefined, authToken || undefined);
                                    const r2 = await apiRequest('GET', '/trades/dca', undefined, authToken || undefined);
                                    if (r2.success && r2.data?.orders) setDcaOrders(r2.data.orders);
                                    showToast('DCA cancelled', 'sell');
                                  }}>
                                  ✕ Cancel
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              <div style={{ fontSize: 10, color: 'var(--t3)', textAlign: 'center', marginTop: 10 }}>
                Paper trading · Balance: {balance.toFixed(2)} SOL
              </div>
            </div>
          </div>

          {/* All Positions Card */}
          {positions.length > 0 && (
            <div className="card">
              <div className="card-head"><span className="card-title">All Positions</span><span className="mono" style={{ fontSize: 10, color: 'var(--t3)' }}>{positions.length}</span></div>
              {positions.map(p => (
                <div key={p.id} style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-0)', cursor: 'pointer', background: p.tokenAddress === effectiveAddress ? 'rgba(0,0,0,0.02)' : 'transparent' }}
                  onClick={() => { setTokenAddress(p.tokenAddress); setSelectedToken(p.symbol); }} className="haptic">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {p.image ? (
                        <img src={p.image} alt={p.symbol} style={{ width: 18, height: 18, borderRadius: '50%' }} />
                      ) : (
                        <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 700, color: 'var(--t2)' }}>{p.symbol.slice(0, 2)}</div>
                      )}
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t0)' }}>{p.symbol}</div>
                      {p.isMoonBag && <span style={{ fontSize: 8, fontWeight: 700, color: 'var(--gold)', background: 'var(--gold-bg)', padding: '1px 5px', borderRadius: 2 }}>MOON</span>}
                    </div>
                    <div className={`mono ${p.pnlPercent >= 0 ? 'up' : 'down'}`} style={{ fontSize: 13, fontWeight: 700 }}>
                      {p.pnlPercent >= 0 ? '+' : ''}{p.pnlPercent.toFixed(1)}%
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9 }}>
                    <span className="mono" style={{ color: 'var(--t3)' }}>In: {p.amount.toFixed(2)} SOL</span>
                    <span className="mono" style={{ color: 'var(--t3)' }}>Val: {p.currentValue.toFixed(3)} SOL</span>
                    <span className={`mono ${p.pnl >= 0 ? 'up' : 'down'}`}>{p.pnl >= 0 ? '+' : ''}{p.pnl.toFixed(3)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, marginTop: 2 }}>
                    <span className="mono" style={{ color: 'var(--t3)' }}>Entry: ${p.entryPriceUsd < 0.01 ? p.entryPriceUsd.toExponential(1) : p.entryPriceUsd.toFixed(4)}</span>
                    <span className="mono" style={{ color: 'var(--t3)' }}>Now: ${p.currentPriceUsd < 0.01 ? p.currentPriceUsd.toExponential(1) : p.currentPriceUsd.toFixed(4)}</span>
                    <span className="mono" style={{ color: 'var(--t3)' }}>{p.tokens.toLocaleString(undefined, { maximumFractionDigits: 0 })} tkns</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

// helpers
function fmtMcap(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  if (n > 0) return `$${n.toFixed(0)}`;
  return '-';
}
function fmtVol(n: number): string {
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  if (n > 0) return `$${n.toFixed(0)}`;
  return '-';
}
