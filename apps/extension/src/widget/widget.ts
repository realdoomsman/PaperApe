import { QUICK_BUY_AMOUNTS, QUICK_SELL_PERCENTAGES } from '@paperape/shared';
import { formatSol, formatPercent, truncateAddress } from '@paperape/shared';
import type { BaseAdapter } from '../adapters/base.js';
import { getWidgetStyles } from './styles.js';

interface WidgetState {
  tokenAddress: string | null;
  tokenSymbol: string;
  tokenName: string;
  priceUsd: number;
  priceSol: number;
  balance: number;
  positions: Array<{
    id: string;
    tokenSymbol: string;
    amountSol: number;
    tokensRemaining: number;
    currentValue: number;
    pnlPercent: number;
    isMoonBag: boolean;
    isRugged: boolean;
  }>;
  isLoading: boolean;
  notification: { message: string; type: 'success' | 'error' } | null;
}

export function createWidget(adapter: BaseAdapter) {
  // ─── Create Shadow DOM Container ──────────────────────
  const host = document.createElement('div');
  host.id = 'paperape-widget-host';
  host.style.cssText = 'position:fixed;z-index:2147483647;top:80px;right:20px;';
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: 'closed' });

  // ─── Inject Styles ────────────────────────────────────
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
    balance: 100,
    positions: [],
    isLoading: false,
    notification: null,
  };

  // ─── Build Widget DOM ─────────────────────────────────
  const widget = document.createElement('div');
  widget.className = 'pa-widget';

  widget.innerHTML = buildWidgetHTML(state);
  shadow.appendChild(widget);

  // ─── Dragging ─────────────────────────────────────────
  let isDragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;
  let isMinimized = false;

  const header = shadow.querySelector('.pa-header') as HTMLElement;
  header.addEventListener('mousedown', (e: MouseEvent) => {
    isDragging = true;
    dragOffsetX = e.clientX - host.getBoundingClientRect().left;
    dragOffsetY = e.clientY - host.getBoundingClientRect().top;
    host.style.transition = 'none';
  });

  document.addEventListener('mousemove', (e: MouseEvent) => {
    if (!isDragging) return;
    host.style.left = `${e.clientX - dragOffsetX}px`;
    host.style.top = `${e.clientY - dragOffsetY}px`;
    host.style.right = 'auto';
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
    host.style.transition = '';
  });

  // ─── Minimize Toggle ─────────────────────────────────
  const minimizeBtn = shadow.querySelector('.pa-minimize') as HTMLElement;
  minimizeBtn.addEventListener('click', () => {
    isMinimized = !isMinimized;
    const body = shadow.querySelector('.pa-body') as HTMLElement;
    body.style.display = isMinimized ? 'none' : 'block';
    minimizeBtn.textContent = isMinimized ? '▲' : '▼';
  });

  // ─── Buy Buttons ──────────────────────────────────────
  shadow.querySelectorAll('.pa-buy-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const amount = parseFloat((btn as HTMLElement).dataset.amount ?? '0');
      if (!state.tokenAddress || amount <= 0) return;
      await executeBuy(amount);
    });
  });

  // ─── Sell Buttons ─────────────────────────────────────
  shadow.querySelectorAll('.pa-sell-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const pct = parseFloat((btn as HTMLElement).dataset.percentage ?? '0');
      const posId = (btn as HTMLElement).dataset.positionId;
      if (!posId) return;
      await executeSell(posId, pct);
    });
  });

  // ─── Sell Init Button ─────────────────────────────────
  const sellInitBtn = shadow.querySelector('.pa-sell-init-btn');
  if (sellInitBtn) {
    sellInitBtn.addEventListener('click', async () => {
      const posId = (sellInitBtn as HTMLElement).dataset.positionId;
      if (!posId) return;
      await executeSellInit(posId);
    });
  }

  // ─── Token Change ─────────────────────────────────────
  adapter.onTokenChange(async (address) => {
    state.tokenAddress = address;
    state.tokenSymbol = truncateAddress(address);
    state.tokenName = 'Loading...';
    render();

    // Fetch token info
    try {
      const res = await apiRequest('GET', `/trades/positions?status=open`);
      if (res.success && res.data?.positions) {
        state.positions = res.data.positions
          .filter((p: any) => p.token_address === address)
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
      }
    } catch {}

    // Fetch user balance
    try {
      const res = await apiRequest('GET', '/auth/me');
      if (res.success && res.data?.user) {
        state.balance = parseFloat(res.data.user.paper_balance);
      }
    } catch {}

    render();
  });

  // ─── Price Updates ────────────────────────────────────
  adapter.onPriceUpdate((price) => {
    state.priceUsd = price.priceUsd;
    state.priceSol = price.priceSol;
    updatePriceDisplay();
  });

  // ─── API Helper ───────────────────────────────────────
  async function apiRequest(method: string, path: string, body?: any) {
    return new Promise<any>((resolve) => {
      chrome.runtime.sendMessage(
        { type: 'API_REQUEST', method, path, body },
        (response) => resolve(response)
      );
    });
  }

  // ─── Trade Execution ──────────────────────────────────
  async function executeBuy(amountSol: number) {
    if (state.isLoading || !state.tokenAddress) return;
    state.isLoading = true;
    showNotification('Executing buy...', 'success');
    render();

    const res = await apiRequest('POST', '/trades/buy', {
      token_address: state.tokenAddress,
      amount_sol: amountSol,
    });

    state.isLoading = false;
    if (res.success) {
      showNotification(`Bought with ${amountSol} SOL! 🦍`, 'success');
      state.balance -= amountSol;
      // Refresh positions
      const posRes = await apiRequest('GET', `/trades/positions?status=open`);
      if (posRes.success && posRes.data?.positions) {
        state.positions = posRes.data.positions
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
          }));
      }
      // Inject PnL into host
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
    } else {
      showNotification(res.error ?? 'Buy failed', 'error');
    }
    render();
  }

  async function executeSell(positionId: string, percentage: number) {
    if (state.isLoading) return;
    state.isLoading = true;
    showNotification(`Selling ${percentage}%...`, 'success');
    render();

    const res = await apiRequest('POST', '/trades/sell', {
      position_id: positionId,
      percentage,
    });

    state.isLoading = false;
    if (res.success) {
      showNotification(`Sold! +${formatSol(res.data.sol_received)} SOL`, 'success');
      state.balance += res.data.sol_received;
      // Refresh
      const posRes = await apiRequest('GET', `/trades/positions?status=open`);
      if (posRes.success) {
        state.positions = (posRes.data.positions ?? [])
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
          }));
      }
    } else {
      showNotification(res.error ?? 'Sell failed', 'error');
    }
    render();
  }

  async function executeSellInit(positionId: string) {
    if (state.isLoading) return;
    state.isLoading = true;
    showNotification('Executing Sell Init...', 'success');
    render();

    const res = await apiRequest('POST', '/trades/sell-init', {
      position_id: positionId,
    });

    state.isLoading = false;
    if (res.success) {
      showNotification(`Init recovered! Moon bag: ${res.data.moon_bag_tokens.toFixed(2)} tokens 🌙`, 'success');
      state.balance += res.data.sol_received;
      // Refresh
      const posRes = await apiRequest('GET', `/trades/positions?status=open`);
      if (posRes.success) {
        state.positions = (posRes.data.positions ?? [])
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
          }));
      }
    } else {
      showNotification(res.error ?? 'Sell Init failed', 'error');
    }
    render();
  }

  // ─── UI Helpers ───────────────────────────────────────
  function showNotification(message: string, type: 'success' | 'error') {
    state.notification = { message, type };
    setTimeout(() => {
      state.notification = null;
      const notifEl = shadow.querySelector('.pa-notification') as HTMLElement;
      if (notifEl) notifEl.style.display = 'none';
    }, 3000);
  }

  function updatePriceDisplay() {
    const priceEl = shadow.querySelector('.pa-price') as HTMLElement;
    if (priceEl) {
      priceEl.textContent = `$${state.priceUsd.toFixed(8)}`;
    }
    const priceSolEl = shadow.querySelector('.pa-price-sol') as HTMLElement;
    if (priceSolEl) {
      priceSolEl.textContent = `${state.priceSol.toFixed(10)} SOL`;
    }
  }

  function render() {
    widget.innerHTML = buildWidgetHTML(state);
    rebindEvents();
  }

  function rebindEvents() {
    // Re-bind minimize
    const minBtn = shadow.querySelector('.pa-minimize') as HTMLElement;
    if (minBtn) {
      minBtn.addEventListener('click', () => {
        isMinimized = !isMinimized;
        const body = shadow.querySelector('.pa-body') as HTMLElement;
        body.style.display = isMinimized ? 'none' : 'block';
        minBtn.textContent = isMinimized ? '▲' : '▼';
      });
    }

    // Re-bind header drag
    const hdr = shadow.querySelector('.pa-header') as HTMLElement;
    if (hdr) {
      hdr.addEventListener('mousedown', (e: MouseEvent) => {
        isDragging = true;
        dragOffsetX = e.clientX - host.getBoundingClientRect().left;
        dragOffsetY = e.clientY - host.getBoundingClientRect().top;
        host.style.transition = 'none';
      });
    }

    // Re-bind buy buttons
    shadow.querySelectorAll('.pa-buy-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const amount = parseFloat((btn as HTMLElement).dataset.amount ?? '0');
        if (!state.tokenAddress || amount <= 0) return;
        await executeBuy(amount);
      });
    });

    // Re-bind sell buttons
    shadow.querySelectorAll('.pa-sell-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const pct = parseFloat((btn as HTMLElement).dataset.percentage ?? '0');
        const posId = (btn as HTMLElement).dataset.positionId;
        if (!posId) return;
        await executeSell(posId, pct);
      });
    });

    // Re-bind sell init
    shadow.querySelectorAll('.pa-sell-init-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const posId = (btn as HTMLElement).dataset.positionId;
        if (!posId) return;
        await executeSellInit(posId);
      });
    });
  }
}

// ─── HTML Builder ───────────────────────────────────────
function buildWidgetHTML(state: WidgetState): string {
  const hasPosition = state.positions.length > 0;
  const pos = hasPosition ? state.positions[0] : null;
  const isProfit = pos ? pos.pnlPercent >= 0 : true;

  return `
    <div class="pa-header">
      <div class="pa-logo">
        <span class="pa-logo-icon">🦍</span>
        <span class="pa-logo-text">PaperApe</span>
      </div>
      <div class="pa-header-right">
        <span class="pa-balance">${formatSol(state.balance)} SOL</span>
        <button class="pa-minimize">▼</button>
      </div>
    </div>

    <div class="pa-body">
      ${state.notification ? `
        <div class="pa-notification pa-notification-${state.notification.type}">
          ${state.notification.message}
        </div>
      ` : ''}

      <div class="pa-token-info">
        <div class="pa-token-name">${state.tokenName}</div>
        <div class="pa-token-address">${state.tokenAddress ? truncateAddress(state.tokenAddress) : '---'}</div>
        <div class="pa-price-row">
          <span class="pa-price">$${state.priceUsd.toFixed(8)}</span>
          <span class="pa-price-sol">${state.priceSol.toFixed(10)} SOL</span>
        </div>
      </div>

      <div class="pa-section">
        <div class="pa-section-label">BUY</div>
        <div class="pa-buy-grid">
          ${QUICK_BUY_AMOUNTS.map((amt) => `
            <button class="pa-buy-btn" data-amount="${amt}" ${state.isLoading ? 'disabled' : ''}>
              ${amt} SOL
            </button>
          `).join('')}
        </div>
      </div>

      ${hasPosition && pos ? `
        <div class="pa-position">
          <div class="pa-position-header">
            <span class="pa-position-symbol">${pos.tokenSymbol}</span>
            ${pos.isMoonBag ? '<span class="pa-moon-badge">🌙 MOON BAG</span>' : ''}
            ${pos.isRugged ? '<span class="pa-rug-badge">💀 RUGGED</span>' : ''}
            <span class="pa-pnl ${isProfit ? 'pa-profit' : 'pa-loss'}">
              ${formatPercent(pos.pnlPercent)}
            </span>
          </div>
          <div class="pa-position-details">
            <span>Invested: ${formatSol(pos.amountSol)} SOL</span>
            <span>Value: ${formatSol(pos.currentValue)} SOL</span>
          </div>

          ${!pos.isRugged ? `
            <div class="pa-section">
              <div class="pa-section-label">SELL</div>
              <div class="pa-sell-grid">
                ${QUICK_SELL_PERCENTAGES.map((pct) => `
                  <button class="pa-sell-btn" data-percentage="${pct}" data-position-id="${pos.id}" ${state.isLoading ? 'disabled' : ''}>
                    ${pct}%
                  </button>
                `).join('')}
                <button class="pa-sell-init-btn" data-position-id="${pos.id}" ${state.isLoading ? 'disabled' : ''}>
                  Sell Init
                </button>
              </div>
            </div>
          ` : ''}
        </div>
      ` : ''}

      <div class="pa-footer">
        <span class="pa-watermark">📊 Paper Trading Mode</span>
      </div>
    </div>
  `;
}
