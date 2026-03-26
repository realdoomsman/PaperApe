/// <reference types="chrome" />

// ─── PaperApe Background Service Worker ─────────────────
// Manages auth state, API proxying, and WebSocket persistence.

const API_BASE = 'http://localhost:3001';
let authToken: string | null = null;
let ws: WebSocket | null = null;

// ─── Auth State ─────────────────────────────────────────
chrome.storage.local.get(['paperape_auth_token'], (result) => {
  authToken = result.paperape_auth_token ?? null;
  if (authToken) connectWebSocket();
});

// ─── Message Handler ────────────────────────────────────
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message).then(sendResponse);
  return true; // async response
});

async function handleMessage(message: any): Promise<any> {
  switch (message.type) {
    case 'LOGIN':
      return handleLogin(message.accessToken);

    case 'LOGOUT':
      return handleLogout();

    case 'GET_AUTH':
      return { success: true, data: { token: authToken } };

    case 'API_REQUEST':
      return proxyApiRequest(message.method, message.path, message.body);

    case 'SUBSCRIBE_PRICE':
      subscribePriceWs(message.tokenAddress);
      return { success: true };

    case 'UNSUBSCRIBE_PRICE':
      unsubscribePriceWs(message.tokenAddress);
      return { success: true };

    default:
      return { success: false, error: 'Unknown message type' };
  }
}

// ─── Login ──────────────────────────────────────────────
async function handleLogin(accessToken: string) {
  try {
    const res = await fetch(`${API_BASE}/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken }),
    });
    const json = await res.json();

    if (json.success) {
      authToken = accessToken;
      await chrome.storage.local.set({ paperape_auth_token: accessToken });
      connectWebSocket();
      return { success: true, data: json.data };
    }
    return { success: false, error: json.error };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function handleLogout() {
  authToken = null;
  await chrome.storage.local.remove(['paperape_auth_token']);
  disconnectWebSocket();
  return { success: true };
}

// ─── API Proxy ──────────────────────────────────────────
async function proxyApiRequest(method: string, path: string, body?: any) {
  try {
    const headers: any = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── WebSocket ──────────────────────────────────────────
function connectWebSocket() {
  if (ws && ws.readyState === WebSocket.OPEN) return;

  ws = new WebSocket(`ws://localhost:3001/ws`);

  ws.onopen = () => {
    console.log('[PaperApe] WebSocket connected');
    if (authToken) {
      ws!.send(JSON.stringify({ type: 'auth', token: authToken }));
    }
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      // Broadcast to all content scripts
      chrome.tabs.query({}, (tabs) => {
        for (const tab of tabs) {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, { type: 'WS_EVENT', data }).catch(() => {});
          }
        }
      });
    } catch (err) {
      console.error('[PaperApe] WS parse error:', err);
    }
  };

  ws.onclose = () => {
    console.log('[PaperApe] WebSocket disconnected, reconnecting in 3s...');
    setTimeout(connectWebSocket, 3000);
  };

  ws.onerror = (err) => {
    console.error('[PaperApe] WebSocket error:', err);
  };
}

function disconnectWebSocket() {
  if (ws) {
    ws.close();
    ws = null;
  }
}

function subscribePriceWs(tokenAddress: string) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'subscribe_price', token_address: tokenAddress }));
  }
}

function unsubscribePriceWs(tokenAddress: string) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'unsubscribe_price', token_address: tokenAddress }));
  }
}
