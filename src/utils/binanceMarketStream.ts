import { useEffect, useRef, useState } from 'react';

const BINANCE_MARKET_DATA_BASE_URL = 'wss://data-stream.binance.vision/ws';
const BINANCE_STALE_AFTER_MS = 15_000;
const BINANCE_MAX_RECONNECT_DELAY_MS = 30_000;

export type BinanceTickerStreamStatus =
  | 'idle'
  | 'connecting'
  | 'live'
  | 'reconnecting'
  | 'stale'
  | 'error';

export interface BinanceTickerSnapshot {
  symbol: string;
  eventTime: number | null;
  lastPrice: number | null;
  priceChangePercent: number | null;
  quoteVolume: number | null;
  tradeCount: number | null;
  bestBidPrice: number | null;
  bestAskPrice: number | null;
  windowOpenTime: number | null;
  windowCloseTime: number | null;
}

export interface BinanceTickerStreamState {
  snapshot: BinanceTickerSnapshot | null;
  status: BinanceTickerStreamStatus;
  error: string | null;
  lastMessageAt: number | null;
  isStale: boolean;
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof WebSocket !== 'undefined';
}

function toNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildTickerSocketUrl(symbol: string): string {
  const normalizedSymbol = symbol.trim().toLowerCase();
  return `${BINANCE_MARKET_DATA_BASE_URL}/${normalizedSymbol}@ticker`;
}

function mapTickerPayload(payload: Record<string, unknown>): BinanceTickerSnapshot {
  return {
    symbol: String(payload.s || '').toUpperCase(),
    eventTime: toNumber(payload.E),
    lastPrice: toNumber(payload.c),
    priceChangePercent: toNumber(payload.P),
    quoteVolume: toNumber(payload.q),
    tradeCount: toNumber(payload.n),
    bestBidPrice: toNumber(payload.b),
    bestAskPrice: toNumber(payload.a),
    windowOpenTime: toNumber(payload.O),
    windowCloseTime: toNumber(payload.C),
  };
}

export function useBinanceTickerStream(
  symbol = 'bnbusdt',
  enabled = true,
): BinanceTickerStreamState {
  const [snapshot, setSnapshot] = useState<BinanceTickerSnapshot | null>(null);
  const [status, setStatus] = useState<BinanceTickerStreamStatus>(enabled ? 'connecting' : 'idle');
  const [error, setError] = useState<string | null>(null);
  const [lastMessageAt, setLastMessageAt] = useState<number | null>(null);

  const hasSnapshotRef = useRef(false);
  const lastMessageAtRef = useRef<number | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<number | null>(null);
  const staleTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      setStatus('idle');
      setError(null);
      return;
    }

    if (!isBrowser()) {
      setStatus('error');
      setError('Binance stream requires a browser WebSocket runtime.');
      return;
    }

    let socket: WebSocket | null = null;
    let closed = false;

    const clearReconnectTimer = () => {
      if (reconnectTimerRef.current != null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const clearStaleTimer = () => {
      if (staleTimerRef.current != null) {
        window.clearInterval(staleTimerRef.current);
        staleTimerRef.current = null;
      }
    };

    const scheduleReconnect = () => {
      if (closed || reconnectTimerRef.current != null) return;

      reconnectAttemptRef.current += 1;
      const delayMs = Math.min(
        BINANCE_MAX_RECONNECT_DELAY_MS,
        1_000 * Math.pow(2, Math.min(reconnectAttemptRef.current - 1, 5)),
      );
      setStatus(hasSnapshotRef.current ? 'reconnecting' : 'connecting');
      reconnectTimerRef.current = window.setTimeout(() => {
        reconnectTimerRef.current = null;
        connect();
      }, delayMs);
    };

    const connect = () => {
      clearReconnectTimer();
      if (closed) return;

      try {
        socket = new WebSocket(buildTickerSocketUrl(symbol));
        setStatus(hasSnapshotRef.current ? 'reconnecting' : 'connecting');
      } catch (streamError) {
        setError(streamError instanceof Error ? streamError.message : 'Failed to open Binance stream.');
        setStatus('error');
        scheduleReconnect();
        return;
      }

      socket.addEventListener('open', () => {
        reconnectAttemptRef.current = 0;
        setError(null);
        setStatus('live');
        clearStaleTimer();
        staleTimerRef.current = window.setInterval(() => {
          setStatus((currentStatus) => {
            if (!lastMessageAtRef.current) return currentStatus;
            return Date.now() - lastMessageAtRef.current > BINANCE_STALE_AFTER_MS ? 'stale' : 'live';
          });
        }, 2_000);
      });

      socket.addEventListener('message', (event) => {
        try {
          const payload = JSON.parse(String(event.data || '')) as Record<string, unknown>;
          const nextSnapshot = mapTickerPayload(payload);
          const messageTime = Date.now();
          hasSnapshotRef.current = true;
          lastMessageAtRef.current = messageTime;
          setSnapshot(nextSnapshot);
          setLastMessageAt(messageTime);
          setStatus('live');
          setError(null);
        } catch (streamError) {
          setError(streamError instanceof Error ? streamError.message : 'Unable to parse Binance stream payload.');
        }
      });

      socket.addEventListener('error', () => {
        setStatus('error');
        setError('Binance stream connection error.');
      });

      socket.addEventListener('close', () => {
        clearStaleTimer();
        if (closed) return;
        scheduleReconnect();
      });
    };

    connect();

    return () => {
      closed = true;
      clearReconnectTimer();
      clearStaleTimer();
      if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
        socket.close();
      }
    };
  }, [enabled, symbol]);

  return {
    snapshot,
    status,
    error,
    lastMessageAt,
    isStale: status === 'stale',
  };
}
