import { useEffect, useRef, useCallback, useState } from 'react';
import { getWebSocketBase } from '../lib/config';

interface PriceUpdate {
  token_address: string;
  price_usd: number;
  price_sol: number;
  timestamp: number;
}

interface UseWebSocketOptions {
  token: string | null; // auth token
  tokenAddress: string | null; // crypto token to subscribe to
  onPriceUpdate?: (data: PriceUpdate) => void;
}

export function useWebSocket({ token, tokenAddress, onPriceUpdate }: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();
  const [connected, setConnected] = useState(false);
  const previousAddress = useRef<string | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(`${getWebSocketBase()}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      // Authenticate
      if (token) {
        ws.send(JSON.stringify({ type: 'auth', token }));
      }
      // Subscribe to token if we have one
      if (tokenAddress) {
        ws.send(JSON.stringify({ type: 'subscribe_price', token_address: tokenAddress }));
        previousAddress.current = tokenAddress;
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'price_update' && onPriceUpdate) {
          onPriceUpdate(data);
        }
      } catch {}
    };

    ws.onclose = () => {
      setConnected(false);
      // Reconnect after 3 seconds
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [token, tokenAddress, onPriceUpdate]);

  // Connect on mount
  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  // Handle token address changes
  useEffect(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    // Unsubscribe from previous
    if (previousAddress.current && previousAddress.current !== tokenAddress) {
      ws.send(JSON.stringify({ type: 'unsubscribe_price', token_address: previousAddress.current }));
    }

    // Subscribe to new
    if (tokenAddress) {
      ws.send(JSON.stringify({ type: 'subscribe_price', token_address: tokenAddress }));
    }

    previousAddress.current = tokenAddress;
  }, [tokenAddress]);

  return { connected };
}
