import { BaseAdapter } from './base';
import type { HostStyles } from './types';

export class BullXAdapter extends BaseAdapter {
  readonly platformName = 'BullX';

  extractTokenAddress(): string | null {
    const url = new URL(window.location.href);
    return url.searchParams.get('address');
  }

  getPositionTableSelector(): string {
    return '[class*="position"], [class*="portfolio"], [data-testid*="position"]';
  }

  getHostStyles(): HostStyles {
    const computed = window.getComputedStyle(document.body);
    return {
      fontFamily: computed.fontFamily || '"Inter", sans-serif',
      fontSize: computed.fontSize || '13px',
      color: computed.color || '#e0e0e0',
      backgroundColor: 'rgba(30, 30, 40, 0.8)',
    };
  }
}

export class PadreAdapter extends BaseAdapter {
  readonly platformName = 'Padre';

  extractTokenAddress(): string | null {
    const match = window.location.pathname.match(/\/token\/([1-9A-HJ-NP-Za-km-z]{32,44})/);
    return match ? match[1] : null;
  }

  getPositionTableSelector(): string {
    return '[class*="position"], [class*="portfolio"], [class*="holdings"]';
  }

  getHostStyles(): HostStyles {
    const computed = window.getComputedStyle(document.body);
    return {
      fontFamily: computed.fontFamily || '"Inter", sans-serif',
      fontSize: computed.fontSize || '13px',
      color: computed.color || '#e0e0e0',
      backgroundColor: 'rgba(25, 25, 35, 0.8)',
    };
  }
}

export class PhotonAdapter extends BaseAdapter {
  readonly platformName = 'Photon';

  extractTokenAddress(): string | null {
    const pathMatch = window.location.pathname.match(/\/lp\/([1-9A-HJ-NP-Za-km-z]{32,44})/);
    if (pathMatch) return pathMatch[1];
    const hashMatch = window.location.hash.match(/([1-9A-HJ-NP-Za-km-z]{32,44})/);
    return hashMatch ? hashMatch[1] : null;
  }

  getPositionTableSelector(): string {
    return '[class*="position"], [class*="portfolio"], [class*="open-order"]';
  }

  getHostStyles(): HostStyles {
    const computed = window.getComputedStyle(document.body);
    return {
      fontFamily: computed.fontFamily || '"Roboto", sans-serif',
      fontSize: computed.fontSize || '12px',
      color: computed.color || '#d4d4d4',
      backgroundColor: 'rgba(20, 20, 30, 0.85)',
    };
  }
}

export class AxiomAdapter extends BaseAdapter {
  readonly platformName = 'Axiom';

  extractTokenAddress(): string | null {
    const match = window.location.pathname.match(/\/(?:t|token|meme|pulse|trade)\/([1-9A-HJ-NP-Za-km-z]{32,44})/);
    return match ? match[1] : null;
  }

  getPositionTableSelector(): string {
    return '[class*="position"], [class*="portfolio"], [class*="holding"]';
  }

  getHostStyles(): HostStyles {
    const computed = window.getComputedStyle(document.body);
    return {
      fontFamily: computed.fontFamily || '"Inter", sans-serif',
      fontSize: computed.fontSize || '13px',
      color: computed.color || '#e0e0e0',
      backgroundColor: 'rgba(22, 22, 32, 0.8)',
    };
  }
}

export class GMGNAdapter extends BaseAdapter {
  readonly platformName = 'GMGN';

  extractTokenAddress(): string | null {
    const match = window.location.pathname.match(/\/sol\/token\/([1-9A-HJ-NP-Za-km-z]{32,44})/);
    return match ? match[1] : null;
  }

  getPositionTableSelector(): string {
    return '[class*="position"], [class*="portfolio"], [class*="holding"]';
  }

  getHostStyles(): HostStyles {
    const computed = window.getComputedStyle(document.body);
    return {
      fontFamily: computed.fontFamily || '"Inter", sans-serif',
      fontSize: computed.fontSize || '13px',
      color: computed.color || '#e0e0e0',
      backgroundColor: 'rgba(18, 18, 28, 0.85)',
    };
  }
}
