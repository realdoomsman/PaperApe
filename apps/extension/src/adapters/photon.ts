import { BaseAdapter } from './base.js';

/**
 * Photon adapter — extracts token address from URL path.
 * URL pattern: photon-sol.tinyastro.io/en/lp/<CA>
 */
export class PhotonAdapter extends BaseAdapter {
  readonly platformName = 'Photon';

  extractTokenAddress(): string | null {
    const match = window.location.pathname.match(/\/lp\/([1-9A-HJ-NP-Za-km-z]{32,44})/);
    if (match) return match[1];

    // Fallback: check URL hash or other patterns
    const hashMatch = window.location.hash.match(/([1-9A-HJ-NP-Za-km-z]{32,44})/);
    return hashMatch ? hashMatch[1] : null;
  }

  getPositionTableSelector(): string | null {
    return '[class*="position"], [class*="portfolio"], [class*="open-order"]';
  }

  getHostStyles() {
    const body = document.body;
    const computed = window.getComputedStyle(body);
    return {
      fontFamily: computed.fontFamily || '"Roboto", sans-serif',
      fontSize: computed.fontSize || '12px',
      color: computed.color || '#d4d4d4',
      backgroundColor: 'rgba(20, 20, 30, 0.85)',
    };
  }
}
