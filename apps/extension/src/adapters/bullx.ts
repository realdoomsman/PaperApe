import { BaseAdapter } from './base.js';

/**
 * BullX adapter — extracts token address from URL query param `address`.
 * URL pattern: bullx.io/terminal?chainId=1399811149&address=<CA>
 */
export class BullXAdapter extends BaseAdapter {
  readonly platformName = 'BullX';

  extractTokenAddress(): string | null {
    const url = new URL(window.location.href);
    return url.searchParams.get('address');
  }

  getPositionTableSelector(): string | null {
    // BullX uses a positions panel — look for common selectors
    return '[class*="position"], [class*="portfolio"], [data-testid*="position"]';
  }

  getHostStyles() {
    // BullX dark theme defaults
    const body = document.body;
    const computed = window.getComputedStyle(body);
    return {
      fontFamily: computed.fontFamily || '"Inter", sans-serif',
      fontSize: computed.fontSize || '13px',
      color: computed.color || '#e0e0e0',
      backgroundColor: 'rgba(30, 30, 40, 0.8)',
    };
  }
}
