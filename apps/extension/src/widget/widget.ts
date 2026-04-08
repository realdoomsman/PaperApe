/**
 * PaperApe Shadow DOM Widget — Complete Trading Terminal
 * Injected into DEX sites. Self-contained CSS via Shadow DOM.
 * Features: Buy/Sell, TP/SL, Sell Init, DCA, congestion alerts.
 */

import type { BaseAdapter } from '../adapters/base.js';
import { getWidgetStyles } from './styles.js';

interface Position {
  id: string;
  tokenSymbol: string;
  amountSol: number;
  tokensRemaining: number;
  currentValue: number;
  pnlPercent: number;
  isMoonBag: boolean;
  isRugged: boolean;
  entryPrice: number;
  tp?: Array<{ triggerPercent: number; sellPercent: number; triggered: boolean }>;
  sl?: { triggerPercent: number; sellPercent: number; triggered: boolean } | null;
  dca?: { amountSol: number; intervalMin: number; totalBuys: number; completedBuys: number; active: boolean } | null;
}

interface WidgetState {
  tokenAddress: string | null;
  tokenSymbol: string;
  tokenName: string;
  priceUsd: number;
  priceSol: number;
  marketCap: number;
  balance: number;
  positions: Position[];
  isLoading: boolean;
  notification: { message: string; type: 'success' | 'error' | 'info' | 'congestion' } | null;
  tab: 'buy' | 'sell';
  selectedAmount: number;
  slippage: number;
  isCongested: boolean;
  showTpSl: boolean;
  showDca: boolean;
  isLoggedIn: boolean;
  userName: string;
}

const QUICK_BUY_AMOUNTS = [0.5, 1, 2, 5, 10];
const QUICK_SELL_PCTS = [25, 50, 100];

export function createWidget(adapter: BaseAdapter) {
  // ─── Shadow DOM Host ──────────────────────────────────
  const host = document.createElement('div');
  host.id = 'paperape-widget-host';
  host.style.cssText = 'position:fixed;z-index:2147483647;top:80px;right:20px;';
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: 'closed' });
  const styleEl = document.createElement('style');
  styleEl.textContent = getWidgetStyles();
  shadow.appendChild(styleEl);

  // ─── State ────────────────────────────────────────────
  const state: WidgetState = {
    tokenAddress: null,
    tokenSymbol: '---',
    tokenName: 'Waiting for token...',
    priceUsd: 0,
    priceSol: 0,
    marketCap: 0,
    balance: 0,
    positions: [],
    isLoading: false,
    notification: null,
    tab: 'buy',
    selectedAmount: 1,
    slippage: 15,
    isCongested: false,
    showTpSl: false,
    showDca: false,
    isLoggedIn: false,
    userName: 'Ape',
  };

  // ─── Widget Container ────────────────────────────────
  const widget = document.createElement('div');
  widget.className = 'pa-widget';
  shadow.appendChild(widget);

  // ─── Dragging ─────────────────────────────────────────
  let isDragging = false;
  let dragX = 0, dragY = 0;
  let isMinimized = false;

  function initDrag() {
    const header = shadow.querySelector('.pa-header') as HTMLElement;
    if (!header) return;
    header.addEventListener('mousedown', (e: MouseEvent) => {
      isDragging = true;
      dragX = e.clientX - host.getBoundingClientRect().left;
      dragY = e.clientY - host.getBoundingClientRect().top;
      host.style.transition = 'none';
    });
  }

  document.addEventListener('mousemove', (e: MouseEvent) => {
    if (!isDragging) return;
    host.style.left = `${e.clientX - dragX}px`;
    host.style.top = `${e.clientY - dragY}px`;
    host.style.right = 'auto';
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
    host.style.transition = '';
  });

  // ─── API Helper ───────────────────────────────────────
  function api(method: string, path: string, body?: any): Promise<any> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: 'API_REQUEST', method, path, body },
        (response) => resolve(response ?? { success: false, error: 'No response from background' })
      );
    });
  }

  // ─── Fetch Token Data from DexScreener via API ──────
  async function fetchTokenData(address: string) {
    try {
      const res = await api('GET', `/tokens/${address}`);
      if (res?.success && res.data?.token) {
        const t = res.data.token;
        state.tokenSymbol = t.symbol ?? address.slice(0, 4) + '...' + address.slice(-4);
        state.tokenName = t.name ?? 'Unknown Token';
        state.priceUsd = parseFloat(t.priceUsd) || 0;
        state.priceSol = parseFloat(t.priceSol) || 0;
        state.marketCap = parseFloat(t.marketCap) || 0;
      } else {
        state.tokenSymbol = address.slice(0, 6) + '...' + address.slice(-4);
        state.tokenName = 'Token not found';
      }
    } catch {
      state.tokenSymbol = address.slice(0, 6) + '...' + address.slice(-4);
      state.tokenName = 'Error loading token';
    }
    render();
  }

  // ─── Check Auth & Load User ──────────────────────────
  async function checkAuthAndLoad() {
    try {
      const authRes = await new Promise<any>((resolve) => {
        chrome.runtime.sendMessage({ type: 'GET_AUTH' }, (r) => resolve(r));
      });

      if (authRes?.data?.isLoggedIn) {
        state.isLoggedIn = true;
        // Fetch user balance
        const userRes = await api('GET', '/auth/me');
        if (userRes?.success && userRes.data?.user) {
          state.balance = parseFloat(userRes.data.user.paper_balance ?? 100);
          state.userName = userRes.data.user.username ?? 'Ape';
        }
      } else {
        // Auto-login with mock token for dev mode
        const loginRes = await new Promise<any>((resolve) => {
          chrome.runtime.sendMessage({
            type: 'LOGIN',
            token: `ext-auto-${Date.now()}`,
            user: { email: 'ext@paperape.io', name: 'Extension Ape' },
          }, (r) => resolve(r));
        });
        if (loginRes?.success) {
          state.isLoggedIn = true;
          // Now fetch balance
          const userRes = await api('GET', '/auth/me');
          if (userRes?.success && userRes.data?.user) {
            state.balance = parseFloat(userRes.data.user.paper_balance ?? 100);
            state.userName = userRes.data.user.username ?? 'Ape';
          }
        }
      }
    } catch (err) {
      console.error('[PaperApe] Auth check failed:', err);
    }
    render();
  }

  // ─── Trade Execution ──────────────────────────────────
  async function executeBuy(amountSol: number) {
    if (state.isLoading || !state.tokenAddress) return;
    state.isLoading = true;
    notify('Executing buy...', 'info');
    render();

    const res = await api('POST', '/trades/buy', {
      token_address: state.tokenAddress,
      amount_sol: amountSol,
      slippage_tolerance: state.slippage,
    });

    state.isLoading = false;
    if (res?.success) {
      notify(`Bought with ${amountSol} SOL`, 'success');
      state.balance -= amountSol;
      await refreshPositions();
      injectPnl();
    } else {
      const isCong = res?.error?.includes('congestion') || res?.error?.includes('Reverted');
      notify(res?.error ?? 'Buy failed', isCong ? 'congestion' : 'error');
      if (isCong) state.isCongested = true;
    }
    render();
  }

  async function executeSell(posId: string, pct: number) {
    if (state.isLoading) return;
    state.isLoading = true;
    notify(`Selling ${pct}%...`, 'info');
    render();

    const res = await api('POST', '/trades/sell', { position_id: posId, percentage: pct });
    state.isLoading = false;
    if (res?.success) {
      const solBack = res.data?.sol_received ?? 0;
      notify(`Sold! +${solBack.toFixed(4)} SOL`, 'success');
      state.balance += solBack;
      await refreshPositions();
    } else {
      notify(res?.error ?? 'Sell failed', 'error');
    }
    render();
  }

  async function executeSellInit(posId: string) {
    if (state.isLoading) return;
    state.isLoading = true;
    notify('Selling initial...', 'info');
    render();

    const res = await api('POST', '/trades/sell-init', { position_id: posId });
    state.isLoading = false;
    if (res?.success) {
      notify(`Init recovered! Moon bag active`, 'success');
      state.balance += res.data?.sol_received ?? 0;
      await refreshPositions();
    } else {
      notify(res?.error ?? 'Sell Init failed', 'error');
    }
    render();
  }

  async function setTakeProfitApi(posId: string, triggerPct: number, sellPct: number) {
    const pos = state.positions.find(p => p.id === posId);
    await api('POST', '/trades/auto-orders', {
      position_id: posId,
      type: 'tp',
      trigger_percent: triggerPct,
      sell_percent: sellPct,
      token_address: state.tokenAddress,
      entry_price: pos?.entryPrice ?? state.priceSol,
    });
    notify(`TP: Sell ${sellPct}% at +${triggerPct}%`, 'info');
    state.showTpSl = false;
    render();
  }

  async function setStopLossApi(posId: string, triggerPct: number, sellPct: number) {
    const pos = state.positions.find(p => p.id === posId);
    await api('POST', '/trades/auto-orders', {
      position_id: posId,
      type: 'sl',
      trigger_percent: triggerPct,
      sell_percent: sellPct,
      token_address: state.tokenAddress,
      entry_price: pos?.entryPrice ?? state.priceSol,
    });
    notify(`SL: Sell ${sellPct}% at ${triggerPct}%`, 'info');
    state.showTpSl = false;
    render();
  }

  async function refreshPositions() {
    try {
      const res = await api('GET', '/trades/positions?status=open');
      if (res?.success && res.data?.positions) {
        state.positions = res.data.positions
          .filter((p: any) => p.token_address === state.tokenAddress)
          .map((p: any) => ({
            id: p.id,
            tokenSymbol: p.token_symbol,
            amountSol: parseFloat(p.amount_sol),
            tokensRemaining: parseFloat(p.tokens_remaining),
            currentValue: parseFloat(p.current_value),
            pnlPercent: parseFloat(p.pnl_percent),
            isMoonBag: p.is_moon_bag,
            isRugged: p.is_rugged,
            entryPrice: parseFloat(p.entry_price ?? '0'),
          }));
      }
    } catch {}
    // Refresh balance too
    try {
      const res = await api('GET', '/auth/me');
      if (res?.success && res.data?.user) {
        state.balance = parseFloat(res.data.user.paper_balance);
      }
    } catch {}
  }

  function injectPnl() {
    if (state.positions.length > 0) {
      const pos = state.positions[0];
      adapter.injectPnlRow({
        tokenSymbol: pos.tokenSymbol,
        entryPrice: pos.amountSol,
        currentPrice: pos.currentValue,
        pnlPercent: pos.pnlPercent,
        amountSol: pos.amountSol,
        isMoonBag: pos.isMoonBag,
      });
    }
  }

  // ─── Notifications ────────────────────────────────────
  function notify(message: string, type: 'success' | 'error' | 'info' | 'congestion') {
    state.notification = { message, type };
    setTimeout(() => { state.notification = null; render(); }, 4000);
  }

  function updatePriceDisplay() {
    const el = shadow.querySelector('.pa-price') as HTMLElement;
    if (el) el.textContent = fmtMcap(state.marketCap);
    const solEl = shadow.querySelector('.pa-price-sol') as HTMLElement;
    if (solEl) solEl.textContent = `$${state.priceUsd > 0 ? (state.priceUsd < 0.01 ? state.priceUsd.toExponential(2) : state.priceUsd.toFixed(4)) : '0.00'}`;
  }

  // ─── WebSocket Price Stream via Background ────────────
  // Listen for WS_EVENT messages from background service worker
  chrome.runtime.onMessage.addListener((message: any) => {
    if (message.type === 'WS_EVENT' && message.data?.type === 'price_update') {
      const d = message.data;
      if (d.token_address === state.tokenAddress) {
        state.priceUsd = d.price_usd ?? state.priceUsd;
        state.priceSol = d.price_sol ?? state.priceSol;

        // Live PnL recalculation for positions
        if (state.positions.length > 0 && state.priceSol > 0) {
          state.positions = state.positions.map(p => {
            const currentValue = p.tokensRemaining * state.priceSol;
            const pnlPercent = p.amountSol > 0 ? ((currentValue - p.amountSol) / p.amountSol) * 100 : 0;
            return { ...p, currentValue, pnlPercent };
          });
        }

        updatePriceDisplay();
        // Update PnL display without full re-render (faster)
        updatePnlDisplay();
      }
    }
  });

  function updatePnlDisplay() {
    if (state.positions.length === 0) return;
    const pos = state.positions[0];
    const pnlEl = shadow.querySelector('.pa-pnl') as HTMLElement;
    if (pnlEl) {
      const isProfit = pos.pnlPercent >= 0;
      pnlEl.textContent = `${isProfit ? '+' : ''}${pos.pnlPercent.toFixed(2)}%`;
      pnlEl.className = `pa-pnl ${isProfit ? 'pa-profit' : 'pa-loss'}`;
    }
    const valEl = shadow.querySelector('.pa-pos-val') as HTMLElement;
    if (valEl) valEl.textContent = `Value: ${pos.currentValue.toFixed(4)} SOL`;
  }

  function subscribeToPriceWs(address: string) {
    chrome.runtime.sendMessage({ type: 'SUBSCRIBE_PRICE', tokenAddress: address });
  }

  function unsubscribeFromPriceWs(address: string) {
    chrome.runtime.sendMessage({ type: 'UNSUBSCRIBE_PRICE', tokenAddress: address });
  }

  // ─── Full data refresh every 30s (volume, mcap, etc) ──
  let fullRefreshInterval: ReturnType<typeof setInterval> | null = null;

  function startFullRefresh() {
    if (fullRefreshInterval) clearInterval(fullRefreshInterval);
    fullRefreshInterval = setInterval(async () => {
      if (state.tokenAddress) {
        await fetchTokenData(state.tokenAddress);
        await refreshPositions();
      }
    }, 30000);
  }

  // ─── Token Change Handler ─────────────────────────────
  let previousToken: string | null = null;

  adapter.onTokenChange(async (address) => {
    // Unsubscribe from previous token
    if (previousToken) unsubscribeFromPriceWs(previousToken);
    previousToken = address;

    state.tokenAddress = address;
    state.tokenSymbol = address.slice(0, 6) + '...' + address.slice(-4);
    state.tokenName = 'Loading...';
    render();

    // Fetch real token data from API
    await fetchTokenData(address);
    await refreshPositions();
    injectPnl();

    // Subscribe to real-time price updates via WS
    subscribeToPriceWs(address);
    startFullRefresh();
    render();
  });

  adapter.onPriceUpdate((price) => {
    state.priceUsd = price.priceUsd;
    state.priceSol = price.priceSol;
    updatePriceDisplay();
  });

  // ─── Render Engine ────────────────────────────────────
  function render() {
    widget.innerHTML = buildHTML(state);
    bindEvents();
    initDrag();
  }

  function bindEvents() {
    // Minimize
    const minBtn = shadow.querySelector('.pa-minimize') as HTMLElement;
    if (minBtn) {
      minBtn.addEventListener('click', () => {
        isMinimized = !isMinimized;
        const body = shadow.querySelector('.pa-body') as HTMLElement;
        if (body) body.style.display = isMinimized ? 'none' : 'block';
        minBtn.textContent = isMinimized ? '+' : '-';
      });
    }

    // Tab switch
    shadow.querySelectorAll('.pa-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.tab = (btn as HTMLElement).dataset.tab as 'buy' | 'sell';
        render();
      });
    });

    // Buy
    shadow.querySelectorAll('.pa-buy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const amt = parseFloat((btn as HTMLElement).dataset.amount ?? '0');
        if (amt > 0) executeBuy(amt);
      });
    });

    // Sell
    shadow.querySelectorAll('.pa-sell-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const pct = parseFloat((btn as HTMLElement).dataset.percentage ?? '0');
        const posId = (btn as HTMLElement).dataset.positionId!;
        if (posId) executeSell(posId, pct);
      });
    });

    // Sell Init
    shadow.querySelectorAll('.pa-sell-init-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const posId = (btn as HTMLElement).dataset.positionId!;
        if (posId) executeSellInit(posId);
      });
    });

    // Slippage
    shadow.querySelectorAll('.pa-slip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.slippage = parseInt((btn as HTMLElement).dataset.slip ?? '15');
        render();
      });
    });

    // TP/SL toggle
    const tpslBtn = shadow.querySelector('.pa-tpsl-toggle');
    if (tpslBtn) {
      tpslBtn.addEventListener('click', () => { state.showTpSl = !state.showTpSl; render(); });
    }

    // TP presets
    shadow.querySelectorAll('.pa-tp-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        const trigger = parseInt((btn as HTMLElement).dataset.trigger ?? '200');
        const sell = parseInt((btn as HTMLElement).dataset.sell ?? '50');
        const posId = (btn as HTMLElement).dataset.positionId!;
        if (posId) setTakeProfitApi(posId, trigger, sell);
      });
    });

    // SL presets
    shadow.querySelectorAll('.pa-sl-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        const trigger = parseInt((btn as HTMLElement).dataset.trigger ?? '-20');
        const posId = (btn as HTMLElement).dataset.positionId!;
        if (posId) setStopLossApi(posId, trigger, 100);
      });
    });

    // Dashboard link
    const dashBtn = shadow.querySelector('.pa-open-dash');
    if (dashBtn) {
      dashBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: 'OPEN_DASHBOARD' });
      });
    }
  }

  // ─── Initialize: check auth then render ───────────────
  checkAuthAndLoad();
  render();
}

// ─── HTML Builder ───────────────────────────────────────
function buildHTML(state: WidgetState): string {
  const hasPos = state.positions.length > 0;
  const pos = hasPos ? state.positions[0] : null;
  const isProfit = pos ? pos.pnlPercent >= 0 : true;

  const fmtSol = (n: number) => n.toFixed(4);
  const fmtPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;

  const notification = state.notification ? `
    <div class="pa-notif pa-notif-${state.notification.type}">${state.notification.message}</div>
  ` : '';

  const congestionBanner = state.isCongested ? `
    <div class="pa-congestion">
      <span class="pa-cong-dot"></span>
      Network Congestion — Increase slippage above 10%
    </div>
  ` : '';

  const buyPanel = `
    <div class="pa-section">
      <div class="pa-section-label">BUY</div>
      <div class="pa-buy-grid">
        ${QUICK_BUY_AMOUNTS.map(amt => `
          <button class="pa-buy-btn" data-amount="${amt}" ${state.isLoading ? 'disabled' : ''}>
            ${amt} SOL
          </button>
        `).join('')}
      </div>
    </div>
    <div class="pa-section">
      <div class="pa-section-label">SLIPPAGE</div>
      <div class="pa-slip-grid">
        ${[1, 5, 10, 15, 25].map(s => `
          <button class="pa-slip-btn ${state.slippage === s ? 'active' : ''}" data-slip="${s}" ${state.isLoading ? 'disabled' : ''}>
            ${s}%
          </button>
        `).join('')}
      </div>
    </div>
    <div class="pa-est">
      <span class="pa-est-label">Est. Tokens</span>
      <span class="pa-est-val">${state.priceSol > 0 ? Math.floor(state.selectedAmount / state.priceSol).toLocaleString() : '...'}</span>
    </div>
  `;

  const positionBlock = hasPos && pos ? `
    <div class="pa-position">
      <div class="pa-pos-head">
        <span class="pa-pos-sym">${pos.tokenSymbol}</span>
        ${pos.isMoonBag ? '<span class="pa-badge pa-badge-moon">MOON BAG</span>' : ''}
        ${pos.isRugged ? '<span class="pa-badge pa-badge-rug">RUGGED</span>' : ''}
        <span class="pa-pnl ${isProfit ? 'pa-profit' : 'pa-loss'}">${fmtPct(pos.pnlPercent)}</span>
      </div>
      <div class="pa-pos-info">
        <span>Invested: ${fmtSol(pos.amountSol)} SOL</span>
        <span class="pa-pos-val">Value: ${fmtSol(pos.currentValue)} SOL</span>
      </div>
      ${!pos.isRugged ? `
        <div class="pa-section">
          <div class="pa-section-label">SELL</div>
          <div class="pa-sell-grid">
            ${QUICK_SELL_PCTS.map(pct => `
              <button class="pa-sell-btn" data-percentage="${pct}" data-position-id="${pos.id}" ${state.isLoading ? 'disabled' : ''}>
                ${pct}%
              </button>
            `).join('')}
            <button class="pa-sell-init-btn" data-position-id="${pos.id}" ${state.isLoading ? 'disabled' : ''}>
              Sell Init
            </button>
          </div>
        </div>
        <button class="pa-tpsl-toggle" ${state.isLoading ? 'disabled' : ''}>
          ${state.showTpSl ? 'Hide TP/SL' : 'Set TP / SL'}
        </button>
        ${state.showTpSl ? `
          <div class="pa-tpsl-panel">
            <div class="pa-section-label" style="color:#2d6b3f">TAKE PROFIT</div>
            <div class="pa-tp-grid">
              ${[
                { t: 100, s: 50 }, { t: 200, s: 50 }, { t: 500, s: 75 }, { t: 1000, s: 100 }
              ].map(p => `
                <button class="pa-tp-preset" data-trigger="${p.t}" data-sell="${p.s}" data-position-id="${pos.id}">
                  +${p.t}% / ${p.s}%
                </button>
              `).join('')}
            </div>
            <div class="pa-section-label" style="color:#8b2020;margin-top:8px">STOP LOSS</div>
            <div class="pa-sl-grid">
              ${[-10, -20, -30, -50].map(t => `
                <button class="pa-sl-preset" data-trigger="${t}" data-position-id="${pos.id}">
                  ${t}%
                </button>
              `).join('')}
            </div>
          </div>
        ` : ''}
      ` : ''}
    </div>
  ` : '';

  const sellPanel = !hasPos ? `
    <div class="pa-empty">No position to sell for this token</div>
  ` : positionBlock;

  return `
    <div class="pa-header">
      <div class="pa-logo">
        <span class="pa-logo-text">PaperApe</span>
      </div>
      <div class="pa-header-right">
        <span class="pa-balance">${fmtSol(state.balance)} SOL</span>
        <button class="pa-minimize">-</button>
      </div>
    </div>
    <div class="pa-body">
      ${notification}
      ${congestionBanner}
      <div class="pa-token-info">
        <div class="pa-token-name">${state.tokenName}</div>
        <div class="pa-token-address">${state.tokenAddress ? state.tokenSymbol : '---'}</div>
        <div class="pa-price-row">
          <span class="pa-price">${fmtMcap(state.marketCap)}</span>
          <span class="pa-price-sol">$${state.priceUsd > 0 ? (state.priceUsd < 0.01 ? state.priceUsd.toExponential(2) : state.priceUsd.toFixed(4)) : '0.00'}</span>
        </div>
      </div>
      <div class="pa-tabs">
        <button class="pa-tab-btn ${state.tab === 'buy' ? 'pa-tab-active-buy' : ''}" data-tab="buy">BUY</button>
        <button class="pa-tab-btn ${state.tab === 'sell' ? 'pa-tab-active-sell' : ''}" data-tab="sell">SELL</button>
      </div>
      ${state.tab === 'buy' ? buyPanel : sellPanel}
      ${state.tab === 'buy' && hasPos ? positionBlock : ''}
      <div class="pa-footer">
        <button class="pa-open-dash">Open Dashboard</button>
        <span class="pa-watermark">Paper Trading Mode</span>
      </div>
    </div>
  `;
}

function fmtMcap(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  if (n > 0) return `$${n.toFixed(0)}`;
  return 'MCap N/A';
}
