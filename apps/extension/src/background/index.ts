// ─── PaperApe Background Service Worker ─────────────────
// Manages auth state, API proxying, and WebSocket persistence.

import { getConfig } from '../lib/config';

let authToken: string | null = null;
let ws: WebSocket | null = null;
let shouldReconnectWs = false;
const priceSubscriptions = new Set<string>();

// Restore persisted auth on startup
chrome.storage.local.get(['paperape_auth_token', 'paperape_user'], (result) => {
  authToken = result.paperape_auth_token ?? null;
  if (authToken) connectWebSocket();
});

// Handle messages from content scripts, popup, and bridge
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message).then(sendResponse);
  return true; // Keep channel open for async response
});

// Handle messages from external sources (web app via externally_connectable)
chrome.runtime.onMessageExternal?.addListener((message, _sender, sendResponse) => {
  handleMessage(message).then(sendResponse);
  return true;
});

async function handleMessage(message: any) {
  switch (message.type) {
    case 'LOGIN':       return handleLogin(message.token, message.user);
    case 'LOGOUT':      return handleLogout();
    case 'GET_AUTH':     return getAuthStatus();
    case 'SET_TOKEN':    return handleTokenRefresh(message.token);
    case 'API_REQUEST':  return proxyApiRequest(message.method, message.path, message.body);
    case 'SUBSCRIBE_PRICE':   subscribePriceWs(message.tokenAddress); return { success: true };
    case 'UNSUBSCRIBE_PRICE': unsubscribePriceWs(message.tokenAddress); return { success: true };
    case 'OPEN_DASHBOARD': {
      const config = await getConfig();
      chrome.tabs.create({ url: `${config.WEBAPP_URL}/dashboard` });
      return { success: true };
    }
    default: return { success: false, error: 'Unknown message type' };
  }
}

// ─── Auth Management ────────────────────────────────────

async function getAuthStatus() {
  const stored = await chrome.storage.local.get(['paperape_auth_token', 'paperape_user']);
  return {
    success: true,
    data: {
      token: stored.paperape_auth_token ?? null,
      user: stored.paperape_user ?? null,
      isLoggedIn: !!stored.paperape_auth_token,
    },
  };
}

async function handleLogin(idToken: string, user: any) {
  try {
    const config = await getConfig();
    const res = await fetch(`${config.API_BASE}/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken: idToken }),
    });
    const json = await res.json();

    if (json.success) {
      authToken = idToken;
      await chrome.storage.local.set({
        paperape_auth_token: idToken,
        paperape_user: user ?? json.data?.user ?? null,
      });
      connectWebSocket();
      return { success: true, data: json.data };
    }
    return { success: false, error: json.error };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function handleTokenRefresh(newToken: string) {
  authToken = newToken;
  await chrome.storage.local.set({ paperape_auth_token: newToken });
  connectWebSocket();
  return { success: true };
}

async function handleLogout() {
  authToken = null;
  await chrome.storage.local.remove(['paperape_auth_token', 'paperape_user']);
  disconnectWebSocket();
  return { success: true };
}

// ─── API Proxy ──────────────────────────────────────────

async function proxyApiRequest(method: string, path: string, body?: any) {
  try {
    const config = await getConfig();
    const normalizedMethod = String(method || 'GET').toUpperCase();
    const authRequiredPath = /^\/(trades|alerts|wallets|auth\/me)/.test(path);
    if (!authToken && (authRequiredPath || !['GET', 'HEAD'].includes(normalizedMethod))) {
      return { success: false, status: 401, error: 'Sign in to use PaperApe trading actions.' };
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    let res: Response;
    try {
      res = await fetch(`${config.API_BASE}${path}`, {
        method: normalizedMethod,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    const text = await res.text();
    let json: any = null;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        json = { success: false, error: text };
      }
    }

    if (!res.ok) {
      return {
        success: false,
        status: res.status,
        error: json?.error ?? res.statusText ?? 'Request failed',
        data: json?.data,
      };
    }

    return json ?? { success: true };
  } catch (err: any) {
    return { success: false, error: err.name === 'AbortError' ? 'PaperApe API request timed out' : err.message };
  }
}

// ─── WebSocket Management ───────────────────────────────

async function connectWebSocket() {
  if (!authToken) return;
  if (ws && ws.readyState === WebSocket.OPEN) return;
  shouldReconnectWs = true;

  const config = await getConfig();
  const wsUrl = config.API_BASE.replace('http', 'ws') + '/ws';
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log('[PaperApe] WebSocket connected');
    if (authToken) ws!.send(JSON.stringify({ type: 'auth', token: authToken }));
    for (const tokenAddress of priceSubscriptions) {
      ws!.send(JSON.stringify({ type: 'subscribe_price', token_address: tokenAddress }));
    }
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      // Broadcast to all tabs
      chrome.tabs.query({}, (tabs) => {
        for (const tab of tabs) {
          if (tab.id) chrome.tabs.sendMessage(tab.id, { type: 'WS_EVENT', data }).catch(() => {});
        }
      });
    } catch {}
  };

  ws.onclose = () => {
    ws = null;
    if (shouldReconnectWs && authToken) {
      console.log('[PaperApe] WebSocket disconnected, reconnecting in 3s...');
      setTimeout(connectWebSocket, 3000);
    }
  };

  ws.onerror = () => {};
}

function disconnectWebSocket() {
  shouldReconnectWs = false;
  ws?.close();
  ws = null;
}

function subscribePriceWs(tokenAddress: string) {
  if (!tokenAddress) return;
  priceSubscriptions.add(tokenAddress);
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'subscribe_price', token_address: tokenAddress }));
  } else if (authToken) {
    connectWebSocket();
  }
}

function unsubscribePriceWs(tokenAddress: string) {
  priceSubscriptions.delete(tokenAddress);
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'unsubscribe_price', token_address: tokenAddress }));
  }
}

// ─── Badge Status ───────────────────────────────────────
chrome.storage.onChanged.addListener((changes) => {
  if (changes.paperape_auth_token) {
    const isLoggedIn = !!changes.paperape_auth_token.newValue;
    chrome.action.setBadgeText({ text: isLoggedIn ? '' : '!' });
    chrome.action.setBadgeBackgroundColor({ color: isLoggedIn ? '#10b981' : '#ef4444' });
  }
});
