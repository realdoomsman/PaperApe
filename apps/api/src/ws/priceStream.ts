import { WebSocketServer, WebSocket } from 'ws';
import type { WsClientEvent, WsServerEvent } from '@paperape/shared';
import { getTokenPrice } from '../services/birdeye.js';

// ─── MEVX WebSocket Smart Router ────────────────────────
// Instead of polling DexScreener every 10s per token, we maintain
// ONE persistent connection to MEVX and route trade-data price updates
// to only the clients who are subscribed to those tokens.
// Fallback: if MEVX is down, we poll DexScreener on a slower interval.

const MEVX_WS_URL = 'wss://ws.mevx.io/api/v1/ws';
const FALLBACK_POLL_INTERVAL = 15_000; // 15s polling fallback

interface ClientState {
  ws: WebSocket;
  subscriptions: Set<string>; // token addresses
  authenticated: boolean;
  id: number;
}

// ─── Global State ───────────────────────────────────────
let clientIdCounter = 0;
const clients = new Map<number, ClientState>();
const tokenSubscribers = new Map<string, Set<number>>(); // tokenAddress -> Set(clientId)
const mevxSubscriptions = new Set<string>(); // tokens subscribed on MEVX
let mevxWS: WebSocket | null = null;
let mevxConnected = false;
let mevxReconnectTimer: ReturnType<typeof setTimeout> | null = null;

// Fallback polling timers (active only when MEVX is down)
const fallbackPollers = new Map<string, NodeJS.Timeout>();

// Stats for /health endpoint
const stats = {
  totalMevxMessages: 0,
  totalClientMessages: 0,
  startTime: Date.now(),
};

export function getPriceStreamStats() {
  return {
    mevxConnected,
    connectedClients: clients.size,
    subscribedTokens: mevxSubscriptions.size,
    stats: {
      ...stats,
      uptimeMs: Date.now() - stats.startTime,
    },
  };
}

// ─── MEVX Connection ────────────────────────────────────
function connectToMEVX() {
  if (mevxWS && mevxWS.readyState === WebSocket.OPEN) return;

  console.log('🔌 Connecting to MEVX WebSocket...');

  try {
    mevxWS = new WebSocket(MEVX_WS_URL);

    mevxWS.on('open', () => {
      console.log('✅ Connected to MEVX WebSocket — real-time prices active!');
      mevxConnected = true;

      // Kill any fallback pollers now that we have live data
      stopAllFallbackPollers();

      // Re-subscribe to all tokens we're tracking
      for (const tokenAddress of mevxSubscriptions) {
        sendMEVXSubscription(tokenAddress);
      }
    });

    mevxWS.on('message', (data) => {
      try {
        const mevxData = JSON.parse(data.toString());
        stats.totalMevxMessages++;

        // MEVX sends trade batches: { method: "subscribeTradesBatch", params: [...trades] }
        if (
          mevxData.method === 'subscribeTradesBatch' &&
          mevxData.params &&
          Array.isArray(mevxData.params)
        ) {
          for (const trade of mevxData.params) {
            if (trade.token && trade.priceUsd) {
              routePriceUpdate({
                type: 'price_update',
                token_address: trade.token,
                price_usd: parseFloat(trade.priceUsd),
                price_sol: parseFloat(trade.priceNative ?? '0'),
                timestamp: Date.now(),
              });
            }
          }
        }
      } catch (err) {
        // Silently skip unparseable messages
      }
    });

    mevxWS.on('close', (code, reason) => {
      console.log(`🔌 MEVX WebSocket closed: ${code}`);
      mevxConnected = false;

      // Start fallback pollers for all subscribed tokens
      startFallbackPollers();

      // Reconnect after 5s
      if (mevxReconnectTimer) clearTimeout(mevxReconnectTimer);
      mevxReconnectTimer = setTimeout(connectToMEVX, 5000);
    });

    mevxWS.on('error', (err) => {
      console.error('❌ MEVX WebSocket error:', err.message);
      mevxConnected = false;
    });
  } catch (err: any) {
    console.error('❌ Failed to connect to MEVX:', err.message);
    mevxConnected = false;
    if (mevxReconnectTimer) clearTimeout(mevxReconnectTimer);
    mevxReconnectTimer = setTimeout(connectToMEVX, 10000);
  }
}

function sendMEVXSubscription(tokenAddress: string) {
  if (!mevxWS || mevxWS.readyState !== WebSocket.OPEN) return;

  mevxWS.send(
    JSON.stringify({
      jsonrpc: '2.0',
      id: `trades-sub-${tokenAddress}`,
      method: 'subscribeTradesBatch',
      params: {
        chain: 'sol',
        token: tokenAddress,
      },
    })
  );
}

// ─── Smart Price Routing ────────────────────────────────
// Only sends price updates to clients who subscribed to that token
function routePriceUpdate(event: WsServerEvent & { type: 'price_update' }) {
  const subscribers = tokenSubscribers.get(event.token_address);
  if (!subscribers || subscribers.size === 0) return;

  const msg = JSON.stringify(event);
  let sent = 0;

  for (const clientId of subscribers) {
    const client = clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(msg);
      sent++;
      stats.totalClientMessages++;
    }
  }
}

// ─── Fallback Polling (when MEVX is down) ───────────────
function startFallbackPollers() {
  for (const tokenAddress of mevxSubscriptions) {
    if (fallbackPollers.has(tokenAddress)) continue;

    const poll = async () => {
      try {
        const price = await getTokenPrice(tokenAddress);
        routePriceUpdate({
          type: 'price_update',
          token_address: tokenAddress,
          price_usd: price.priceUsd,
          price_sol: price.priceSol,
          timestamp: Date.now(),
        });
      } catch {}
    };

    poll(); // Immediate first poll
    fallbackPollers.set(tokenAddress, setInterval(poll, FALLBACK_POLL_INTERVAL));
  }
}

function stopAllFallbackPollers() {
  for (const timer of fallbackPollers.values()) {
    clearInterval(timer);
  }
  fallbackPollers.clear();
}

function stopFallbackPoller(tokenAddress: string) {
  const timer = fallbackPollers.get(tokenAddress);
  if (timer) {
    clearInterval(timer);
    fallbackPollers.delete(tokenAddress);
  }
}

// ─── Client Subscription Management ────────────────────
function handleSubscribe(client: ClientState, tokenAddress: string) {
  // Add to client's subscription set
  client.subscriptions.add(tokenAddress);

  // Add client to token's subscriber list
  if (!tokenSubscribers.has(tokenAddress)) {
    tokenSubscribers.set(tokenAddress, new Set());
  }
  tokenSubscribers.get(tokenAddress)!.add(client.id);

  // If this is the first subscriber for this token, subscribe on MEVX
  const subCount = tokenSubscribers.get(tokenAddress)!.size;
  if (subCount === 1) {
    mevxSubscriptions.add(tokenAddress);
    sendMEVXSubscription(tokenAddress);

    // If MEVX is down, start a fallback poller for this token
    if (!mevxConnected && !fallbackPollers.has(tokenAddress)) {
      const poll = async () => {
        try {
          const price = await getTokenPrice(tokenAddress);
          routePriceUpdate({
            type: 'price_update',
            token_address: tokenAddress,
            price_usd: price.priceUsd,
            price_sol: price.priceSol,
            timestamp: Date.now(),
          });
        } catch {}
      };
      poll();
      fallbackPollers.set(tokenAddress, setInterval(poll, FALLBACK_POLL_INTERVAL));
    }
  }

  // Send immediate price update from DexScreener cache
  getTokenPrice(tokenAddress)
    .then((price) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(
          JSON.stringify({
            type: 'price_update',
            token_address: tokenAddress,
            price_usd: price.priceUsd,
            price_sol: price.priceSol,
            timestamp: Date.now(),
          })
        );
      }
    })
    .catch(() => {});
}

function handleUnsubscribe(client: ClientState, tokenAddress: string) {
  client.subscriptions.delete(tokenAddress);

  const subscribers = tokenSubscribers.get(tokenAddress);
  if (subscribers) {
    subscribers.delete(client.id);

    // If no one is subscribed anymore, clean up
    if (subscribers.size === 0) {
      tokenSubscribers.delete(tokenAddress);
      mevxSubscriptions.delete(tokenAddress);
      stopFallbackPoller(tokenAddress);
    }
  }
}

function handleClientDisconnect(client: ClientState) {
  // Remove client from all token subscriber lists
  for (const tokenAddress of client.subscriptions) {
    const subscribers = tokenSubscribers.get(tokenAddress);
    if (subscribers) {
      subscribers.delete(client.id);
      if (subscribers.size === 0) {
        tokenSubscribers.delete(tokenAddress);
        mevxSubscriptions.delete(tokenAddress);
        stopFallbackPoller(tokenAddress);
      }
    }
  }

  clients.delete(client.id);
}

// ─── Main Setup ─────────────────────────────────────────
export function setupPriceStream(wss: WebSocketServer) {
  // Connect to MEVX on startup
  connectToMEVX();

  wss.on('connection', (ws) => {
    const clientId = ++clientIdCounter;
    const client: ClientState = {
      ws,
      subscriptions: new Set(),
      authenticated: false,
      id: clientId,
    };
    clients.set(clientId, client);

    // Heartbeat: detect dead connections
    let isAlive = true;
    ws.on('pong', () => { isAlive = true; });

    const heartbeat = setInterval(() => {
      if (!isAlive) {
        clearInterval(heartbeat);
        handleClientDisconnect(client);
        ws.terminate();
        return;
      }
      isAlive = false;
      try { ws.ping(); } catch { /* already closed */ }
    }, 30_000);

    ws.on('message', (raw) => {
      try {
        const event: WsClientEvent = JSON.parse(raw.toString());
        handleClientEvent(client, event);
      } catch (err) {
        sendToClient(client, { type: 'error', message: 'Invalid message format' });
      }
    });

    ws.on('close', () => {
      clearInterval(heartbeat);
      handleClientDisconnect(client);
    });

    ws.on('error', () => {
      clearInterval(heartbeat);
      handleClientDisconnect(client);
    });
  });

  console.log('⚡ Price stream initialized (MEVX Smart Router + DexScreener fallback + heartbeat)');
}

function handleClientEvent(client: ClientState, event: WsClientEvent) {
  switch (event.type) {
    case 'auth':
      client.authenticated = true;
      break;

    case 'subscribe_price':
      handleSubscribe(client, event.token_address);
      break;

    case 'unsubscribe_price':
      handleUnsubscribe(client, event.token_address);
      break;
  }
}

function sendToClient(client: ClientState, event: WsServerEvent) {
  if (client.ws.readyState === WebSocket.OPEN) {
    client.ws.send(JSON.stringify(event));
  }
}
