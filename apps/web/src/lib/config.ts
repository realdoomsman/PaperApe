export const DEV_API_BASE = 'http://localhost:3001';
export const FALLBACK_PROD_API_BASE = 'https://paperape-api.onrender.com';

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

export function getApiBase(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configured) return trimTrailingSlash(configured);

  if (process.env.NODE_ENV === 'production') {
    console.warn('[PaperApe] NEXT_PUBLIC_API_URL is not set; using fallback API URL.');
    return FALLBACK_PROD_API_BASE;
  }

  return DEV_API_BASE;
}

export function getWebSocketBase(): string {
  return getApiBase().replace(/^http/, 'ws');
}
