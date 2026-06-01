import React, { useState, useEffect, useCallback } from 'react';
import { sendMessage, api } from '../lib/messaging';
import { fmtSol } from '../lib/formatters';
import { getConfig } from '../lib/config';

type View = 'auth' | 'dashboard';

interface UserData {
  name: string;
  balance: number;
  openPositions: number;
  totalPnl: number;
  winRate: number;
  apeRank: string;
}

function getApeRank(trades: number, winRate: number, pnl: number): string {
  if (trades === 0) return 'Baby Ape';
  if (pnl < 0) return 'Paper Hands';
  if (winRate >= 70 && trades >= 20) return 'Silverback';
  if (winRate >= 60 && trades >= 10) return 'Alpha Ape';
  if (winRate >= 50) return 'Rising Primate';
  return 'Baby Ape';
}

export default function PopupApp() {
  const [view, setView] = useState<View>('auth');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [statusText, setStatusText] = useState('Ready');
  const [statusOk, setStatusOk] = useState(true);
  const [user, setUser] = useState<UserData>({
    name: '@sardooms',
    balance: 100,
    openPositions: 0,
    totalPnl: 0,
    winRate: 0,
    apeRank: 'Baby Ape',
  });

  // ─── Settings ──────────────────────────────────────────
  const [defaultBuy, setDefaultBuy] = useState('1');
  const [maxSlippage, setMaxSlippage] = useState('15');

  // ─── Init ──────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const res = await sendMessage({ type: 'GET_AUTH' });
      if (res?.data?.isLoggedIn) {
        await loadDashboard();
      } else {
        setView('auth');
        setStatusText('Not signed in');
        setStatusOk(false);
      }
      const settings = await chrome.storage.local.get(['default_buy', 'max_slippage']);
      if (settings.default_buy) setDefaultBuy(settings.default_buy);
      if (settings.max_slippage) setMaxSlippage(settings.max_slippage);
    })();
  }, []);

  // React to auth changes from other contexts
  useEffect(() => {
    const handler = (changes: Record<string, chrome.storage.StorageChange>) => {
      if (changes.paperape_auth_token) {
        if (changes.paperape_auth_token.newValue) loadDashboard();
        else {
          setView('auth');
          setStatusText('Not signed in');
          setStatusOk(false);
        }
      }
    };
    chrome.storage.onChanged.addListener(handler);
    return () => chrome.storage.onChanged.removeListener(handler);
  }, []);

  const loadDashboard = useCallback(async () => {
    setView('dashboard');
    setStatusText('Connected');
    setStatusOk(true);

    const userRes = await api('GET', '/auth/me');
    if (userRes?.success && userRes.data?.user) {
      const u = userRes.data.user;
      setUser((prev) => ({
        ...prev,
        name: u.username ?? u.email?.split('@')[0] ?? '@sardooms',
        balance: parseFloat(u.paper_balance ?? 100),
      }));
    }

    const posRes = await api('GET', '/trades/positions');
    if (posRes?.success && posRes.data?.positions) {
      const positions = posRes.data.positions;
      const openPos = positions.filter((p: any) => p.status === 'open');
      const totalPnlValue = positions.reduce((sum: number, p: any) => sum + parseFloat(p.pnl_sol || 0), 0);
      const wins = positions.filter((p: any) => parseFloat(p.pnl_sol || 0) > 0).length;
      const wr = positions.length > 0 ? Math.round((wins / positions.length) * 100) : 0;

      setUser((prev) => ({
        ...prev,
        openPositions: openPos.length,
        totalPnl: totalPnlValue,
        winRate: wr,
        apeRank: getApeRank(positions.length, wr, totalPnlValue),
      }));
    }
  }, []);

  // ─── Login Handler ─────────────────────────────────────
  const handleEmailLogin = async () => {
    setAuthError('');
    if (!email || !password) { setAuthError('Enter email and password'); return; }
    if (isRegisterMode && password.length < 6) { setAuthError('Password must be 6+ characters'); return; }

    setIsLoggingIn(true);
    try {
      // Dev mode: mock token. Production: Firebase Auth REST API
      const config = await getConfig();
      const isDev = config.WEBAPP_URL.includes('localhost');
      let token: string;
      let userName = email.split('@')[0];

      if (isDev) {
        token = `mock-${Date.now()}-${email.replace(/[^a-z0-9]/gi, '')}`;
      } else {
        const apiKey = (await chrome.storage.local.get(['firebase_api_key'])).firebase_api_key;
        if (!apiKey) throw new Error('Firebase API key not configured. Sign in via the dashboard.');

        const endpoint = isRegisterMode
          ? `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`
          : `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;

        const authRes = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, returnSecureToken: true }),
        });
        const authData = await authRes.json();
        if (authData.error) throw new Error(authData.error.message ?? 'Auth failed');
        token = authData.idToken;
        userName = authData.displayName ?? email.split('@')[0];
      }

      const loginRes = await sendMessage({ type: 'LOGIN', token, user: { email, name: userName } });
      if (loginRes?.success) { await loadDashboard(); return; }
      throw new Error(loginRes?.error ?? 'Login failed');
    } catch (err: any) {
      setAuthError(err.message ?? 'Login failed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await sendMessage({ type: 'LOGOUT' });
    setView('auth');
    setStatusText('Not signed in');
    setStatusOk(false);
  };

  const openPage = async (path: string) => {
    const config = await getConfig();
    chrome.tabs.create({ url: `${config.WEBAPP_URL}${path}` });
  };

  return (
    <div className="font-display bg-pa-parchment text-pa-ink w-[380px] min-h-[480px]">
      {/* ─── Header ─────────────────────────────────────── */}
      <div className="relative text-center py-5 bg-gradient-to-br from-pa-green/[0.06] to-pa-green/[0.02] border-b-2 border-dashed border-pa-muted/15">
        <div className="absolute -top-[3px] left-[30px] w-20 h-[18px] bg-pa-tape -rotate-[1.5deg] rounded-sm" />
        <div className="text-[22px] font-bold tracking-[2px] uppercase text-pa-ink">PaperApe</div>
        <div className="text-[11px] text-pa-faded mt-1 tracking-[0.5px]">Simulate the trenches. Risk nothing.</div>
      </div>

      {/* ─── Auth View ──────────────────────────────────── */}
      {view === 'auth' && (
        <div className="px-6 py-6 text-center">
          <div className="text-base font-bold mb-1.5 text-pa-ink">Welcome, Ape</div>
          <div className="text-xs text-pa-muted mb-5 leading-relaxed">
            Sign in to sync your trades with the PaperApe dashboard.
          </div>

          <button
            onClick={() => openPage('/login?ext=1')}
            className="w-full py-3 px-4 bg-pa-green text-pa-paper border-2 border-[#1f5530] rounded font-display text-[13px] font-bold cursor-pointer flex items-center justify-center gap-2.5 mb-2 tracking-wider shadow-[3px_4px_0px_rgba(60,40,10,0.25)] hover:-translate-y-px hover:shadow-[4px_5px_0px_rgba(60,40,10,0.3)] transition-all"
          >
            Sign In via Dashboard
          </button>

          <div className="flex items-center gap-3 my-3.5 text-[9px] text-pa-faded uppercase tracking-[2px]">
            <span className="flex-1 h-px border-t border-dashed border-pa-muted/20" />
            or use email
            <span className="flex-1 h-px border-t border-dashed border-pa-muted/20" />
          </div>

          <div className="text-left mb-2.5">
            <div className="text-[9px] font-bold text-pa-faded tracking-[1.5px] uppercase mb-1">Email</div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ape@paperape.fun"
              className="w-full px-3 py-2.5 bg-pa-paper border-2 border-pa-muted/15 rounded-sm text-pa-ink font-mono text-[13px] focus:outline-none focus:border-pa-green/40 transition-colors placeholder:text-pa-tan"
            />
          </div>
          <div className="text-left mb-2.5">
            <div className="text-[9px] font-bold text-pa-faded tracking-[1.5px] uppercase mb-1">Password</div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2.5 bg-pa-paper border-2 border-pa-muted/15 rounded-sm text-pa-ink font-mono text-[13px] focus:outline-none focus:border-pa-green/40 transition-colors placeholder:text-pa-tan"
            />
          </div>
          <button
            onClick={handleEmailLogin}
            disabled={isLoggingIn}
            className="w-full py-3 px-4 bg-pa-parchment border-2 border-pa-muted/20 rounded font-display text-[13px] font-bold cursor-pointer text-pa-ink tracking-wider hover:bg-pa-parchment/80 transition-all disabled:opacity-50"
          >
            {isLoggingIn ? 'Connecting...' : isRegisterMode ? 'Create Account' : 'Sign In'}
          </button>

          {authError && <div className="text-[11px] text-pa-red mt-1.5">{authError}</div>}

          <div className="text-[11px] text-pa-muted mt-3.5">
            <span>{isRegisterMode ? 'Already have an account?' : "Don't have an account?"} </span>
            <button
              onClick={() => { setIsRegisterMode(!isRegisterMode); setAuthError(''); }}
              className="bg-transparent border-none text-pa-blue text-[11px] cursor-pointer underline font-bold font-display"
            >
              {isRegisterMode ? 'Sign in' : 'Sign up'}
            </button>
          </div>
        </div>
      )}

      {/* ─── Dashboard View ─────────────────────────────── */}
      {view === 'dashboard' && (
        <div className="px-3.5 py-3.5">
          {/* User Card */}
          <div className="relative bg-pa-paper border-2 border-dashed border-pa-muted/15 rounded p-3.5 mb-2.5 shadow-[2px_3px_8px_rgba(60,40,10,0.1)]">
            <div className="absolute -top-[3px] right-[15px] w-[50px] h-3.5 bg-pa-tape rotate-1 rounded-sm" />
            <div className="text-[11px] text-pa-faded">gm,</div>
            <div className="text-base font-bold text-pa-ink mt-0.5">{user.name}</div>
            <div className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-sm bg-pa-green/[0.06] border border-dashed border-pa-green/15 text-pa-green mt-1.5 tracking-[0.5px]">
              {user.apeRank}
            </div>
            <div className="text-[8px] text-pa-faded tracking-[1.5px] uppercase mt-2.5">Paper Balance</div>
            <div className="text-[26px] font-bold text-pa-green mt-0.5 leading-tight font-mono">
              {fmtSol(user.balance)} SOL
            </div>
          </div>

          {/* Stat Grid */}
          <div className="grid grid-cols-3 gap-1.5 mb-2.5">
            {[
              { value: user.openPositions.toString(), label: 'Positions' },
              {
                value: `${user.totalPnl >= 0 ? '+' : ''}${user.totalPnl.toFixed(4)}`,
                label: 'PnL (SOL)',
                className: user.totalPnl >= 0 ? 'text-pa-green' : 'text-pa-red',
              },
              { value: `${user.winRate}%`, label: 'Win Rate' },
            ].map((stat) => (
              <div key={stat.label} className="bg-pa-paper border border-pa-muted/12 rounded-sm p-2.5 text-center">
                <div className={`text-[15px] font-bold font-mono ${stat.className ?? 'text-pa-ink'}`}>
                  {stat.value}
                </div>
                <div className="text-[7px] text-pa-faded tracking-[1.5px] mt-0.5 uppercase">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Quick Links */}
          <div className="mb-2.5">
            {[
              { icon: '📊', label: 'Open Dashboard', desc: 'Full trading view', path: '/dashboard', color: 'gold' },
              { icon: '➕', label: 'Open Terminal', desc: 'Ape into a token', path: '/terminal', color: 'green' },
              { icon: '🔍', label: 'Discover', desc: 'Find trending tokens', path: '/discover', color: 'blue' },
            ].map((link) => (
              <button
                key={link.path}
                onClick={() => openPage(link.path)}
                className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-sm cursor-pointer text-left bg-transparent border-none font-display hover:bg-pa-green/[0.04] transition-all"
              >
                <div className={`w-[30px] h-[30px] rounded-sm flex items-center justify-center text-sm shrink-0 border border-dashed ${
                  link.color === 'gold' ? 'bg-pa-gold/[0.06] border-pa-gold/15' :
                  link.color === 'green' ? 'bg-pa-green/[0.06] border-pa-green/15' :
                  'bg-pa-blue/[0.06] border-pa-blue/15'
                }`}>
                  {link.icon}
                </div>
                <div className="flex-1">
                  <div className="text-xs font-bold text-pa-ink">{link.label}</div>
                  <div className="text-[9px] text-pa-faded">{link.desc}</div>
                </div>
                <span className="text-[11px] text-pa-faded">→</span>
              </button>
            ))}
          </div>

          {/* Settings */}
          <div className="px-3.5 pb-2">
            <div className="flex justify-between items-center py-[7px] border-b border-dashed border-pa-muted/10">
              <span className="text-[10px] text-pa-muted">Default Buy Amount</span>
              <select
                value={defaultBuy}
                onChange={(e) => { setDefaultBuy(e.target.value); chrome.storage.local.set({ default_buy: e.target.value }); }}
                className="bg-pa-paper border border-pa-muted/20 rounded-sm px-1.5 py-0.5 text-pa-ink font-mono text-[11px] w-20 text-right"
              >
                {[0.5, 1, 2, 5, 10].map((v) => <option key={v} value={v}>{v} SOL</option>)}
              </select>
            </div>
            <div className="flex justify-between items-center py-[7px] border-b border-dashed border-pa-muted/10">
              <span className="text-[10px] text-pa-muted">Max Slippage</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={maxSlippage}
                  onChange={(e) => { setMaxSlippage(e.target.value); chrome.storage.local.set({ max_slippage: e.target.value }); }}
                  min={1} max={50}
                  className="bg-pa-paper border border-pa-muted/20 rounded-sm px-1.5 py-0.5 text-pa-ink font-mono text-[11px] w-12 text-right"
                />
                <span className="text-[11px] text-pa-muted">%</span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full py-2 mt-2 bg-pa-red/[0.06] border-2 border-dashed border-pa-red/15 rounded-sm text-pa-red font-display text-[10px] font-bold cursor-pointer uppercase tracking-wider hover:bg-pa-red/10 transition-all"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* ─── Status Bar ─────────────────────────────────── */}
      <div className="flex items-center gap-1.5 text-[9px] text-pa-faded px-3.5 py-2 border-t-2 border-dashed border-pa-muted/12 tracking-[0.5px]">
        <span className={`w-[5px] h-[5px] rounded-full ${statusOk ? 'bg-pa-green animate-pulse-dot' : 'bg-pa-red'}`} />
        <span>{statusText}</span>
      </div>
    </div>
  );
}
