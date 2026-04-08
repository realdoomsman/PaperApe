import { BaseAdapter } from './base.js';

/**
 * GMGN adapter — extracts token address from URL path.
 * URL patterns: gmgn.ai/sol/token/<CA>, gmgn.ai/sol/address/<CA>
 */
export class GmgnAdapter extends BaseAdapter {
  readonly platformName = 'GMGN';

  extractTokenAddress(): string | null {
    const match = window.location.pathname.match(/\/(?:token|address)\/([1-9A-HJ-NP-Za-km-z]{32,44})/);
    return match ? match[1] : null;
  }

  getPositionTableSelector(): string | null {
    return '[class*="position"], [class*="portfolio"], [class*="holding"]';
  }

  getHostStyles() {
    const body = document.body;
    const computed = window.getComputedStyle(body);
    return {
      fontFamily: computed.fontFamily || '"Inter", sans-serif',
      fontSize: computed.fontSize || '13px',
      color: computed.color || '#e0e0e0',
      backgroundColor: 'rgba(18, 18, 28, 0.85)',
    };
  }
}
