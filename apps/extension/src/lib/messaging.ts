// ─── Chrome Runtime Messaging Helpers ───────────────────

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/** Send a message to the background service worker and wait for response */
export function sendMessage<T = any>(message: Record<string, any>): Promise<ApiResponse<T>> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      resolve(response ?? { success: false, error: 'No response from background' });
    });
  });
}

/** Proxy an API request through the background service worker */
export function api<T = any>(method: string, path: string, body?: any): Promise<ApiResponse<T>> {
  return sendMessage({ type: 'API_REQUEST', method, path, body });
}

/** Get current auth status */
export async function getAuthStatus() {
  return sendMessage<{ isLoggedIn: boolean; token: string | null; user: any }>({ type: 'GET_AUTH' });
}

/** Subscribe to price updates via WebSocket */
export function subscribePriceWs(tokenAddress: string) {
  chrome.runtime.sendMessage({ type: 'SUBSCRIBE_PRICE', tokenAddress });
}

/** Unsubscribe from price updates */
export function unsubscribePriceWs(tokenAddress: string) {
  chrome.runtime.sendMessage({ type: 'UNSUBSCRIBE_PRICE', tokenAddress });
}

/** Open the PaperApe dashboard */
export function openDashboard() {
  chrome.runtime.sendMessage({ type: 'OPEN_DASHBOARD' });
}
