import { WebSocketServer, WebSocket } from 'ws';
import type { WsClientEvent, WsServerEvent } from '@paperape/shared';
import { subscribeToPriceUpdates } from '../services/birdeye.js';

interface ClientState {
  ws: WebSocket;
  subscriptions: Map<string, () => void>; // token_address -> unsubscribe fn
  authenticated: boolean;
}

export function setupPriceStream(wss: WebSocketServer) {
  const clients: Set<ClientState> = new Set();

  wss.on('connection', (ws) => {
    const client: ClientState = {
      ws,
      subscriptions: new Map(),
      authenticated: false,
    };
    clients.add(client);

    console.log(`🔌 WS client connected (${clients.size} total)`);

    ws.on('message', (raw) => {
      try {
        const event: WsClientEvent = JSON.parse(raw.toString());
        handleClientEvent(client, event);
      } catch (err) {
        sendToClient(client, { type: 'error', message: 'Invalid message format' });
      }
    });

    ws.on('close', () => {
      // Clean up all subscriptions
      for (const unsub of client.subscriptions.values()) {
        unsub();
      }
      clients.delete(client);
      console.log(`🔌 WS client disconnected (${clients.size} total)`);
    });

    ws.on('error', (err) => {
      console.error('WS error:', err);
    });
  });

  console.log('📡 Price stream WebSocket server initialized');
}

function handleClientEvent(client: ClientState, event: WsClientEvent) {
  switch (event.type) {
    case 'auth':
      // In production, verify the token here
      client.authenticated = true;
      break;

    case 'subscribe_price': {
      const { token_address } = event;

      // Don't double-subscribe
      if (client.subscriptions.has(token_address)) return;

      const unsubscribe = subscribeToPriceUpdates(token_address, (price) => {
        sendToClient(client, {
          type: 'price_update',
          token_address,
          price_usd: price.priceUsd,
          price_sol: price.priceSol,
          timestamp: price.timestamp,
        });
      });

      client.subscriptions.set(token_address, unsubscribe);
      break;
    }

    case 'unsubscribe_price': {
      const unsub = client.subscriptions.get(event.token_address);
      if (unsub) {
        unsub();
        client.subscriptions.delete(event.token_address);
      }
      break;
    }
  }
}

function sendToClient(client: ClientState, event: WsServerEvent) {
  if (client.ws.readyState === WebSocket.OPEN) {
    client.ws.send(JSON.stringify(event));
  }
}
