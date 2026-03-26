import type { WsServerEvent } from '@paperape/shared';

/**
 * Abstract base adapter for DEX platform integration.
 * Each platform (BullX, Padre, etc.) extends this with specific DOM selectors.
 */
export abstract class BaseAdapter {
  protected observer: MutationObserver | null = null;
  protected currentTokenAddress: string | null = null;
  private onTokenChangeCallbacks: Array<(address: string) => void> = [];
  private onPriceUpdateCallbacks: Array<(data: { priceUsd: number; priceSol: number }) => void> = [];

  /** Platform display name */
  abstract readonly platformName: string;

  /** Extract token address from current page URL or DOM */
  abstract extractTokenAddress(): string | null;

  /** Get CSS selector for the host platform's positions/portfolio table */
  abstract getPositionTableSelector(): string | null;

  /** Get the host platform's font styling for PnL row mimicry */
  abstract getHostStyles(): {
    fontFamily: string;
    fontSize: string;
    color: string;
    backgroundColor: string;
  };

  /** Initialize the adapter */
  init() {
    // Initial token detection
    const addr = this.extractTokenAddress();
    if (addr) {
      this.setToken(addr);
    }

    // Watch for SPA navigation changes
    this.observeNavigation();
  }

  /** Watch for URL/DOM changes in the SPA */
  protected observeNavigation() {
    // URL change detection via polling (SPAs don't fire popstate reliably)
    let lastUrl = window.location.href;
    setInterval(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        const addr = this.extractTokenAddress();
        if (addr && addr !== this.currentTokenAddress) {
          this.setToken(addr);
        }
      }
    }, 500);

    // Also observe DOM for dynamic content loads
    this.observer = new MutationObserver(() => {
      const addr = this.extractTokenAddress();
      if (addr && addr !== this.currentTokenAddress) {
        this.setToken(addr);
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  /** Set the active token and notify listeners */
  private setToken(address: string) {
    this.currentTokenAddress = address;
    console.log(`[PaperApe] Token detected: ${address}`);

    // Subscribe to price updates via background
    chrome.runtime.sendMessage({ type: 'SUBSCRIBE_PRICE', tokenAddress: address });

    for (const cb of this.onTokenChangeCallbacks) {
      cb(address);
    }
  }

  /** Get current token address */
  getTokenAddress(): string | null {
    return this.currentTokenAddress;
  }

  /** Register callback for token changes */
  onTokenChange(callback: (address: string) => void) {
    this.onTokenChangeCallbacks.push(callback);
    // Fire immediately if we already have a token
    if (this.currentTokenAddress) {
      callback(this.currentTokenAddress);
    }
  }

  /** Register callback for price updates */
  onPriceUpdate(callback: (data: { priceUsd: number; priceSol: number }) => void) {
    this.onPriceUpdateCallbacks.push(callback);
  }

  /** Handle WebSocket events from background */
  handleWsEvent(event: WsServerEvent) {
    if (event.type === 'price_update' && event.token_address === this.currentTokenAddress) {
      for (const cb of this.onPriceUpdateCallbacks) {
        cb({ priceUsd: event.price_usd, priceSol: event.price_sol });
      }
    }
  }

  /**
   * Inject a PnL row into the host platform's position table.
   * Mimics the host's styling with a subtle PaperApe watermark.
   */
  injectPnlRow(position: {
    tokenSymbol: string;
    entryPrice: number;
    currentPrice: number;
    pnlPercent: number;
    amountSol: number;
    isMoonBag: boolean;
  }) {
    const tableSelector = this.getPositionTableSelector();
    if (!tableSelector) return;

    const table = document.querySelector(tableSelector);
    if (!table) return;

    const styles = this.getHostStyles();
    const isProfit = position.pnlPercent >= 0;

    // Remove existing PaperApe row for this token if present
    const existingRow = table.querySelector(`[data-paperape-token="${position.tokenSymbol}"]`);
    if (existingRow) existingRow.remove();

    const row = document.createElement('div');
    row.setAttribute('data-paperape-token', position.tokenSymbol);
    row.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      font-family: ${styles.fontFamily};
      font-size: ${styles.fontSize};
      color: ${styles.color};
      background: ${styles.backgroundColor};
      border-left: 3px solid ${isProfit ? '#00ff88' : '#ff4444'};
      position: relative;
      opacity: 0.95;
    `;

    row.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="font-weight:600;">${position.tokenSymbol}</span>
        ${position.isMoonBag ? '<span style="font-size:10px;background:#ff6b00;color:#000;padding:1px 4px;border-radius:3px;">🌙 MOON BAG</span>' : ''}
        <span style="font-size:9px;opacity:0.5;letter-spacing:0.5px;">PAPER</span>
      </div>
      <div style="display:flex;align-items:center;gap:16px;">
        <span>${position.amountSol.toFixed(3)} SOL</span>
        <span style="color:${isProfit ? '#00ff88' : '#ff4444'};font-weight:600;">
          ${isProfit ? '+' : ''}${position.pnlPercent.toFixed(2)}%
        </span>
      </div>
    `;

    // Insert at the top of the table
    if (table.firstChild) {
      table.insertBefore(row, table.firstChild);
    } else {
      table.appendChild(row);
    }
  }

  /** Clean up */
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
    if (this.currentTokenAddress) {
      chrome.runtime.sendMessage({ type: 'UNSUBSCRIBE_PRICE', tokenAddress: this.currentTokenAddress });
    }
  }
}
