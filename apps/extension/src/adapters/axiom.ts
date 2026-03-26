import { BaseAdapter } from './base.js';

/**
 * Axiom adapter — extracts token address from URL path.
 * URL pattern: axiom.trade/t/<CA> or axiom.trade/token/<CA>
 */
export class AxiomAdapter extends BaseAdapter {
  readonly platformName = 'Axiom';

  extractTokenAddress(): string | null {
    const match = window.location.pathname.match(/\/(?:t|token|meme)\/([1-9A-HJ-NP-Za-km-z]{32,44})/);
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
      backgroundColor: 'rgba(22, 22, 32, 0.8)',
    };
  }
}
