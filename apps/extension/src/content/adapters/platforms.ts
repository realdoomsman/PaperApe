import { BaseAdapter } from './base';
import { SOLANA_ADDRESS_REGEX, type HostStyles } from './types';

function firstSolanaAddress(value?: string | null): string | null {
  if (!value) return null;
  const decoded = (() => {
    try { return decodeURIComponent(value); } catch { return value; }
  })();
  return decoded.match(SOLANA_ADDRESS_REGEX)?.[0] ?? null;
}

function addressFromUrl(patterns: RegExp[] = []): string | null {
  const url = new URL(window.location.href);
  const knownParams = ['address', 'token', 'mint', 'ca', 'contract', 'baseMint', 'base'];

  for (const param of knownParams) {
    const found = firstSolanaAddress(url.searchParams.get(param));
    if (found) return found;
  }

  for (const pattern of patterns) {
    const match = `${url.pathname}${url.hash}`.match(pattern);
    if (match?.[1]) return match[1];
  }

  return firstSolanaAddress(window.location.href);
}

function addressFromDom(): string | null {
  const candidates = document.querySelectorAll<HTMLElement>([
    '[data-address]',
    '[data-token-address]',
    '[data-token]',
    '[data-mint]',
    '[data-ca]',
    'a[href*="/token/"]',
    'a[href*="/trade/"]',
    'a[href*="/meme/"]',
    'a[href*="/lp/"]',
  ].join(','));

  for (const el of Array.from(candidates).slice(0, 120)) {
    const found = firstSolanaAddress(
      el.dataset.address ??
      el.dataset.tokenAddress ??
      el.dataset.token ??
      el.dataset.mint ??
      el.dataset.ca ??
      el.getAttribute('href') ??
      el.textContent,
    );
    if (found) return found;
  }

  return null;
}

function extractAddress(patterns: RegExp[] = []): string | null {
  return addressFromUrl(patterns) ?? addressFromDom();
}

export class BullXAdapter extends BaseAdapter {
  readonly platformName = 'BullX';

  extractTokenAddress(): string | null {
    return extractAddress([
      /\/(?:terminal|token|trade|pair)\/([1-9A-HJ-NP-Za-km-z]{32,44})/,
    ]);
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
    return extractAddress([
      /\/(?:token|trade|pair|chart)\/([1-9A-HJ-NP-Za-km-z]{32,44})/,
    ]);
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
    return extractAddress([
      /\/(?:lp|token|trade)\/([1-9A-HJ-NP-Za-km-z]{32,44})/,
    ]);
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
    return extractAddress([
      /\/(?:t|token|meme|pulse|trade|pair)\/([1-9A-HJ-NP-Za-km-z]{32,44})/,
    ]);
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
    return extractAddress([
      /\/(?:sol\/)?(?:token|trade|pair)\/([1-9A-HJ-NP-Za-km-z]{32,44})/,
    ]);
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
