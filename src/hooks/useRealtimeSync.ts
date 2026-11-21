import { useEffect, useRef, useState } from 'react';
import type { RealtimeEvent } from '../types/index';
import { getMemorySessionToken } from '../utils/apiClient';

export type SyncConnectionState = 'connecting' | 'connected' | 'reconnecting';

export function useRealtimeSync(
  enabled: boolean,
  onEvent: (event: RealtimeEvent) => void,
  onReconnected?: () => void,
): SyncConnectionState {
  const [state, setState] = useState<SyncConnectionState>('connecting');
  const onEventRef = useRef(onEvent);
  const onReconnectedRef = useRef(onReconnected);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    onReconnectedRef.current = onReconnected;
  }, [onReconnected]);

  useEffect(() => {
    if (!enabled) return;

    let disposed = false;
    let ws: WebSocket | null = null;
    let sse: EventSource | null = null;
    let reconnectTimer: number | null = null;
    let attempt = 0;
    let hasConnectedOnce = false;

    const handleMessage = (raw: string) => {
      try {
        const parsed = JSON.parse(raw) as RealtimeEvent;
        onEventRef.current(parsed);
      } catch {
        // Ignore malformed frames
      }
    };

    const startSseFallback = () => {
      if (disposed || sse) return;
      try {
        sse = new EventSource('/api/sync/stream', { withCredentials: true });
        sse.onopen = () => {
          if (disposed) return;
          setState('connected');
          if (hasConnectedOnce) {
            onReconnectedRef.current?.();
          }
          hasConnectedOnce = true;
          attempt = 0;
        };
        sse.onmessage = (msg) => {
          handleMessage(msg.data);
        };
        sse.onerror = () => {
          if (disposed) return;
          setState('reconnecting');
        };
      } catch {
        setState('reconnecting');
      }
    };

    const connectWs = () => {
      if (disposed) return;
      setState(hasConnectedOnce ? 'reconnecting' : 'connecting');

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      try {
        const token = getMemorySessionToken();
        ws = token ? new WebSocket(wsUrl, ['ols-auth', token]) : new WebSocket(wsUrl);
      } catch {
        startSseFallback();
        return;
      }

      ws.onopen = () => {
        if (disposed) return;
        setState('connected');
        if (hasConnectedOnce) {
          onReconnectedRef.current?.();
        }
        hasConnectedOnce = true;
        attempt = 0;
      };

      ws.onmessage = (event) => {
        if (typeof event.data === 'string') {
          handleMessage(event.data);
        }
      };

      ws.onclose = () => {
        if (disposed) return;
        setState('reconnecting');
        attempt += 1;
        if (attempt >= 2) {
          startSseFallback();
          return;
        }
        const delay = Math.min(8000, 1000 * 2 ** attempt);
        reconnectTimer = window.setTimeout(connectWs, delay);
      };

      ws.onerror = () => {
        ws?.close();
      };
    };

    connectWs();

    return () => {
      disposed = true;
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
      ws?.close();
      sse?.close();
    };
  }, [enabled]);

  return state;
}
