import type { TokenChangeCallback, PriceUpdateCallback, HostStyles } from './types';

interface TradeFillMarker {
  type: 'buy' | 'sell' | 'sell_init';
  tokenSymbol: string;
  priceUsd: number;
  marketCapUsd?: number;
  amountSol?: number;
}

function formatUsd(price: number) {
  if (!Number.isFinite(price) || price <= 0) return '-';
  if (price < 0.01) return `$${price.toExponential(3)}`;
  if (price < 1) return `$${price.toFixed(5)}`;
  return `$${price.toFixed(4)}`;
}

function formatMcap(value?: number) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 'MC n/a';
  if (n >= 1_000_000_000) return `MC $${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `MC $${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `MC $${(n / 1_000).toFixed(1)}K`;
  return `MC $${n.toFixed(0)}`;
}

/**
 * BaseAdapter — handles SPA navigation detection, token change notifications,
 * WebSocket event forwarding, and PnL row injection.
 */
export abstract class BaseAdapter {
  private observer: MutationObserver | null = null;
  private currentTokenAddress: string | null = null;
  private onTokenChangeCallbacks: TokenChangeCallback[] = [];
  private onPriceUpdateCallbacks: PriceUpdateCallback[] = [];

  abstract readonly platformName: string;
  abstract extractTokenAddress(): string | null;
  abstract getPositionTableSelector(): string;
  abstract getHostStyles(): HostStyles;

  /** Initialize adapter — extract initial token and start watching for SPA navigation */
  init() {
    const addr = this.extractTokenAddress();
    if (addr) this.setToken(addr);
    this.observeNavigation();
  }

  /** Dual-strategy SPA navigation detection: URL polling + MutationObserver */
  private observeNavigation() {
    let lastUrl = window.location.href;

    // Poll URL every 500ms (catches pushState/replaceState)
    setInterval(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        const addr = this.extractTokenAddress();
        if (addr && addr !== this.currentTokenAddress) this.setToken(addr);
      }
    }, 500);

    // MutationObserver catches React re-renders that don't change URL
    this.observer = new MutationObserver(() => {
      const addr = this.extractTokenAddress();
      if (addr && addr !== this.currentTokenAddress) this.setToken(addr);
    });
    this.observer.observe(document.body, { childList: true, subtree: true });
  }

  /** Set the active token and notify all listeners */
  private setToken(address: string) {
    this.currentTokenAddress = address;
    console.log(`[PaperApe] Token detected: ${address}`);
    chrome.runtime.sendMessage({ type: 'SUBSCRIBE_PRICE', tokenAddress: address });
    for (const cb of this.onTokenChangeCallbacks) cb(address);
  }

  getTokenAddress() { return this.currentTokenAddress; }

  onTokenChange(callback: TokenChangeCallback) {
    this.onTokenChangeCallbacks.push(callback);
    if (this.currentTokenAddress) callback(this.currentTokenAddress);
  }

  onPriceUpdate(callback: PriceUpdateCallback) {
    this.onPriceUpdateCallbacks.push(callback);
  }

  /** Handle forwarded WebSocket events from the background */
  handleWsEvent(event: any) {
    if (event.type === 'price_update' && event.token_address === this.currentTokenAddress) {
      for (const cb of this.onPriceUpdateCallbacks) {
        cb({ priceUsd: event.price_usd, priceSol: event.price_sol });
      }
    }
  }

  /** Inject a PnL row styled to match the host platform's position table */
  injectPnlRow(position: {
    tokenSymbol: string;
    entryPrice: number;
    currentPrice: number;
    pnlPercent: number;
    amountSol: number;
    isMoonBag: boolean;
  }) {
    const tableSelector = this.getPositionTableSelector();
    const table = document.querySelector(tableSelector);
    if (!table) return;

    const styles = this.getHostStyles();
    const isProfit = position.pnlPercent >= 0;

    // Remove existing PaperApe row for this token
    const existing = table.querySelector(`[data-paperape-token="${position.tokenSymbol}"]`);
    if (existing) existing.remove();

    const row = document.createElement('div');
    row.setAttribute('data-paperape-token', position.tokenSymbol);
    row.style.cssText = `
      display:flex;align-items:center;justify-content:space-between;
      padding:8px 12px;font-family:${styles.fontFamily};font-size:${styles.fontSize};
      color:${styles.color};background:${styles.backgroundColor};
      border-left:3px solid ${isProfit ? '#00ff88' : '#ff4444'};
      position:relative;opacity:0.95;
    `;
    row.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="font-weight:600;">${position.tokenSymbol}</span>
        ${position.isMoonBag ? '<span style="font-size:7px;background:rgba(139,105,20,0.1);color:#8b6914;padding:1px 5px;border-radius:2px;border:1px solid rgba(139,105,20,0.2);font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">MOON BAG</span>' : ''}
        <span style="font-size:9px;opacity:0.5;letter-spacing:0.5px;">PAPER</span>
      </div>
      <div style="display:flex;align-items:center;gap:16px;">
        <span>${position.amountSol.toFixed(3)} SOL</span>
        <span style="color:${isProfit ? '#00ff88' : '#ff4444'};font-weight:600;">
          ${isProfit ? '+' : ''}${position.pnlPercent.toFixed(2)}%
        </span>
      </div>
    `;
    table.firstChild ? table.insertBefore(row, table.firstChild) : table.appendChild(row);
  }

  /** Add a best-effort paper fill marker to host TradingView/lightweight chart surfaces. */
  injectTradeMarker(marker: TradeFillMarker) {
    const isBuy = marker.type === 'buy';
    const color = isBuy ? '#10b981' : marker.type === 'sell_init' ? '#d49b26' : '#ef4444';
    const labelType = marker.type === 'sell_init' ? 'SELL INIT' : isBuy ? 'BUY' : 'SELL';
    const label = `PaperApe ${labelType} ${marker.tokenSymbol} ${formatMcap(marker.marketCapUsd)} @ ${formatUsd(marker.priceUsd)}`;

    if (this.tryTradingViewMarker(marker.priceUsd, label, color)) return;
    this.injectFallbackChartLine(label, color);
  }

  private tryTradingViewMarker(priceUsd: number, label: string, color: string) {
    const w = window as any;
    const candidates = [
      w.tvWidget,
      w.tradingViewWidget,
      w.chartWidget,
      w.widget,
      w.TradingView?.widget,
    ].filter(Boolean);

    for (const candidate of candidates) {
      try {
        const chart = typeof candidate.activeChart === 'function'
          ? candidate.activeChart()
          : typeof candidate.chart === 'function'
            ? candidate.chart()
            : candidate;
        if (typeof chart?.createShape !== 'function') continue;
        chart.createShape(
          { price: priceUsd, time: Math.floor(Date.now() / 1000) },
          {
            shape: 'horizontal_line',
            text: label,
            lock: true,
            disableSelection: true,
            overrides: {
              linecolor: color,
              textcolor: color,
              linewidth: 2,
              linestyle: 2,
            },
          },
        );
        return true;
      } catch {}
    }

    return false;
  }

  private injectFallbackChartLine(label: string, color: string) {
    const chartNode = document.querySelector<HTMLElement>([
      '.tv-lightweight-charts',
      '[class*="tradingview"]',
      '[class*="TradingView"]',
      '[class*="chart"]',
      '[id*="chart"]',
      'iframe[src*="tradingview"]',
      'iframe[src*="dexscreener"]',
    ].join(','));
    const host = (chartNode instanceof HTMLIFrameElement ? chartNode.parentElement : chartNode) ?? document.body;
    const computed = window.getComputedStyle(host);
    if (computed.position === 'static') host.style.position = 'relative';

    let overlay = host.querySelector<HTMLElement>('[data-paperape-fill-overlay="true"]');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.dataset.paperapeFillOverlay = 'true';
      overlay.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:2147483646;overflow:hidden;';
      host.appendChild(overlay);
    }

    const count = overlay.querySelectorAll('[data-paperape-fill-line="true"]').length;
    const top = 28 + ((count * 13) % 52);
    const line = document.createElement('div');
    line.dataset.paperapeFillLine = 'true';
    line.style.cssText = `position:absolute;left:0;right:0;top:${top}%;border-top:2px dashed ${color};opacity:0.9;`;

    const pill = document.createElement('div');
    pill.textContent = label;
    pill.style.cssText = `position:absolute;left:8px;top:-24px;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;background:rgba(26,22,18,0.94);color:#fff;border:1px solid ${color};border-left:5px solid ${color};border-radius:5px;padding:4px 7px;font:700 10px/1.1 monospace;box-shadow:0 4px 14px rgba(0,0,0,0.25);`;
    line.appendChild(pill);
    overlay.appendChild(line);
  }

  destroy() {
    this.observer?.disconnect();
    if (this.currentTokenAddress) {
      chrome.runtime.sendMessage({ type: 'UNSUBSCRIBE_PRICE', tokenAddress: this.currentTokenAddress });
    }
  }
}
