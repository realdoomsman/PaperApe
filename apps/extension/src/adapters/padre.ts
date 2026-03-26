import { BaseAdapter } from './base.js';

/**
 * Padre adapter — extracts token address from URL path.
 * URL pattern: padre.market/token/<CA>
 */
export class PadreAdapter extends BaseAdapter {
  readonly platformName = 'Padre';

  extractTokenAddress(): string | null {
    const match = window.location.pathname.match(/\/token\/([1-9A-HJ-NP-Za-km-z]{32,44})/);
    return match ? match[1] : null;
  }

  getPositionTableSelector(): string | null {
    return '[class*="position"], [class*="portfolio"], [class*="holdings"]';
  }

  getHostStyles() {
    const body = document.body;
    const computed = window.getComputedStyle(body);
    return {
      fontFamily: computed.fontFamily || '"Inter", sans-serif',
      fontSize: computed.fontSize || '13px',
      color: computed.color || '#e0e0e0',
      backgroundColor: 'rgba(25, 25, 35, 0.8)',
    };
  }
}
