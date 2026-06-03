const DEV_API_BASE = 'http://localhost:3001';
const PROD_API_BASE = 'https://paperape-api.onrender.com';

function getApiBase(): string {
  // In production builds, always use the production API
  if (__DEV__) return DEV_API_BASE;
  return PROD_API_BASE;
}

function getWebSocketBase(): string {
  return getApiBase().replace(/^http/, 'ws');
}

export { getApiBase, getWebSocketBase };
