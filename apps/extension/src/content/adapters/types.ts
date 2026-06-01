// ─── Platform Adapter Types ─────────────────────────────

export interface PlatformConfig {
  id: string;
  name: string;
  urlPattern: RegExp;
}

export interface HostStyles {
  fontFamily: string;
  fontSize: string;
  color: string;
  backgroundColor: string;
}

export type TokenChangeCallback = (address: string) => void;
export type PriceUpdateCallback = (price: { priceUsd: number; priceSol: number }) => void;

export const PLATFORM_CONFIGS: PlatformConfig[] = [
  { id: 'bullx',  name: 'BullX',  urlPattern: /bullx\.(io|com)/ },
  { id: 'padre',  name: 'Padre',  urlPattern: /padre\.(market|gg)|trade\.padre\.gg/ },
  { id: 'photon', name: 'Photon', urlPattern: /photon-sol\.tinyastro\.io|photon\.tinyastro\.io/ },
  { id: 'axiom',  name: 'Axiom',  urlPattern: /axiom\.trade/ },
  { id: 'gmgn',   name: 'GMGN',   urlPattern: /gmgn\.ai/ },
];

/** Base58 Solana address pattern */
export const SOLANA_ADDRESS_REGEX = /[1-9A-HJ-NP-Za-km-z]{32,44}/;
