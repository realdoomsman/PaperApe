// ─── PaperApe Background Service Worker ─────────────────
// Manages auth state, API proxying, and WebSocket persistence.

import { getConfig } from '../lib/config';

let authToken: string | null = null;
let ws: WebSocket | null = null;

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
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const res = await fetch(`${config.API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── WebSocket Management ───────────────────────────────

async function connectWebSocket() {
  if (ws && ws.readyState === WebSocket.OPEN) return;

  const config = await getConfig();
  const wsUrl = config.API_BASE.replace('http', 'ws') + '/ws';
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log('[PaperApe] WebSocket connected');
    if (authToken) ws!.send(JSON.stringify({ type: 'auth', token: authToken }));
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
    console.log('[PaperApe] WebSocket disconnected, reconnecting in 3s...');
    setTimeout(connectWebSocket, 3000);
  };

  ws.onerror = () => {};
}

function disconnectWebSocket() {
  ws?.close();
  ws = null;
}

function subscribePriceWs(tokenAddress: string) {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'subscribe_price', token_address: tokenAddress }));
  }
}

function unsubscribePriceWs(tokenAddress: string) {
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
