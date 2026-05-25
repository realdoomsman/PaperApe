import type { TokenChangeCallback, PriceUpdateCallback, HostStyles } from './types';

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

  destroy() {
    this.observer?.disconnect();
    if (this.currentTokenAddress) {
      chrome.runtime.sendMessage({ type: 'UNSUBSCRIBE_PRICE', tokenAddress: this.currentTokenAddress });
    }
  }
}
