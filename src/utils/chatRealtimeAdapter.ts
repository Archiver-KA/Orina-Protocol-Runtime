import { publicAnonKey, publishableKey, supabaseUrl } from '/utils/supabase/info';
import {
  ensureSupabaseBridgeAccessToken,
  getSupabaseBridgeAccessToken,
  isSupabaseAuthClaimBridgeEnabled,
} from '@/utils/supabaseAuthClaimBridge';

export const CHAT_PRESENCE_ACTIVITY_WINDOW_MS_DEFAULT = 3 * 60 * 1000;

export type ChatInvalidateCallback = () => void;
export type ChatUnsubscribe = () => void;

export interface ChatPresenceResolveInput {
  backendOnline?: boolean | null;
  lastMessageTime?: string | null;
  createdAt?: string | null;
  nowMs?: number;
  activityWindowMs?: number;
}

type RealtimePostgresChangeSpec = {
  schema: 'public';
  table: 'conversations' | 'conversation_participants' | 'messages';
  event?: '*' | 'INSERT' | 'UPDATE' | 'DELETE';
  filter?: string;
};

type RealtimeEnvelope = {
  topic?: string;
  event?: string;
  payload?: any;
  ref?: string | null;
  join_ref?: string | null;
};

const REALTIME_VSN = '1.0.0';
const REALTIME_HEARTBEAT_MS = 25_000;
const INVALIDATE_DEBOUNCE_MS = 120;

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof WebSocket !== 'undefined';
}

function getRealtimeApiKey(): string {
  return (publishableKey || publicAnonKey || '').trim();
}

function getRealtimeWebSocketUrl(): string | null {
  if (!supabaseUrl) return null;
  const apiKey = getRealtimeApiKey();
  if (!apiKey) return null;
  try {
    const base = new URL(supabaseUrl);
    base.protocol = base.protocol === 'https:' ? 'wss:' : 'ws:';
    base.pathname = '/realtime/v1/websocket';
    base.searchParams.set('apikey', apiKey);
    base.searchParams.set('vsn', REALTIME_VSN);
    return base.toString();
  } catch {
    return null;
  }
}

function normalizeUuid(value: string | null | undefined): string {
  return (value || '').trim().toLowerCase();
}

function makeRefGenerator() {
  let seq = 0;
  return () => {
    seq += 1;
    return String(seq);
  };
}

function scheduleInvalidation(onInvalidate: ChatInvalidateCallback) {
  let timer: number | null = null;
  return {
    trigger() {
      if (timer != null) return;
      timer = window.setTimeout(() => {
        timer = null;
        onInvalidate();
      }, INVALIDATE_DEBOUNCE_MS);
    },
    clear() {
      if (timer != null) {
        window.clearTimeout(timer);
        timer = null;
      }
    },
  };
}

function createRealtimeSubscription(params: {
  debugTag: string;
  topic: string;
  changes: RealtimePostgresChangeSpec[];
  onInvalidate: ChatInvalidateCallback;
  ensureBridgeTokenForAddress?: string | null;
}): ChatUnsubscribe {
  if (!isBrowser()) return () => {};

  const wsUrl = getRealtimeWebSocketUrl();
  if (!wsUrl || !params.changes.length) return () => {};

  let closed = false;
  let socket: WebSocket | null = null;
  let heartbeatTimer: number | null = null;
  let reconnectTimer: number | null = null;
  let reconnectAttempt = 0;
  let joinRef: string | null = null;
  let joined = false;
  const nextRef = makeRefGenerator();
  const invalidator = scheduleInvalidation(params.onInvalidate);

  const clearTimers = () => {
    if (heartbeatTimer != null) {
      window.clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
    if (reconnectTimer != null) {
      window.clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    invalidator.clear();
  };

  const send = (event: string, payload: any, topic = params.topic, ref?: string | null) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    const message: RealtimeEnvelope = {
      topic,
      event,
      payload,
      ref: ref ?? nextRef(),
    };
    if (joinRef) {
      message.join_ref = joinRef;
    }
    try {
      socket.send(JSON.stringify(message));
    } catch {
      // polling fallback remains active; ignore send errors
    }
  };

  const startHeartbeat = () => {
    if (heartbeatTimer != null) return;
    heartbeatTimer = window.setInterval(() => {
      if (closed || !socket || socket.readyState !== WebSocket.OPEN) return;
      const ref = nextRef();
      try {
        socket.send(
          JSON.stringify({
            topic: 'phoenix',
            event: 'heartbeat',
            payload: {},
            ref,
          } satisfies RealtimeEnvelope)
        );
      } catch {
        // ignore; reconnect path handles socket closure
      }
    }, REALTIME_HEARTBEAT_MS);
  };

  const scheduleReconnect = () => {
    if (closed || reconnectTimer != null) return;
    reconnectAttempt += 1;
    const delayMs = Math.min(30_000, 1_000 * Math.pow(2, Math.min(reconnectAttempt - 1, 5)));
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = null;
      void connect();
    }, delayMs);
  };

  const handleMessage = (event: MessageEvent<string>) => {
    let envelope: RealtimeEnvelope | null = null;
    try {
      envelope = JSON.parse(String(event.data || '')) as RealtimeEnvelope;
    } catch {
      return;
    }
    if (!envelope?.event) return;

    if (envelope.topic === params.topic && envelope.event === 'phx_reply') {
      const status = envelope.payload?.status || '';
      if (status === 'ok') {
        joined = true;
        reconnectAttempt = 0;
      }
      return;
    }

    if (envelope.event === 'postgres_changes') {
      invalidator.trigger();
      return;
    }

    // Some Realtime payloads emit "system" for subscribe acks or replication status.
    // Avoid spamming UI on every system message; only trigger after join if status changes.
    if (joined && envelope.event === 'system') {
      const payloadStatus = String(envelope.payload?.status || '').toLowerCase();
      if (payloadStatus.includes('error')) {
        invalidator.trigger();
      }
    }
  };

  const joinChannel = () => {
    joinRef = nextRef();
    const accessToken = getSupabaseBridgeAccessToken();
    send(
      'phx_join',
      {
        config: {
          broadcast: { ack: false, self: false },
          presence: { key: '' },
          postgres_changes: params.changes.map((c) => ({
            event: c.event || '*',
            schema: c.schema,
            table: c.table,
            ...(c.filter ? { filter: c.filter } : {}),
          })),
          private: true,
        },
        ...(accessToken ? { access_token: accessToken } : {}),
      },
      params.topic,
      joinRef
    );
  };

  const connect = async () => {
    if (closed) return;
    if (!isBrowser()) return;

    try {
      if (params.ensureBridgeTokenForAddress && isSupabaseAuthClaimBridgeEnabled()) {
        await ensureSupabaseBridgeAccessToken({
          walletAddress: params.ensureBridgeTokenForAddress,
          promptOnAuthMissing: false,
        });
      }
    } catch (error) {
      console.debug(`[C6.3.3.1 realtime:${params.debugTag}] bridge token exchange skipped`, error);
    }

    const authToken = getSupabaseBridgeAccessToken();
    if (!authToken) {
      // Realtime on messaging tables needs authenticated claims; keep polling fallback.
      return;
    }

    try {
      socket = new WebSocket(wsUrl);
    } catch {
      socket = null;
      return;
    }

    socket.addEventListener('open', () => {
      if (closed || !socket) return;
      joined = false;
      startHeartbeat();
      joinChannel();
    });

    socket.addEventListener('message', handleMessage as EventListener);

    socket.addEventListener('error', () => {
      // Let close handler schedule reconnect; polling fallback remains primary safety net.
    });

    socket.addEventListener('close', () => {
      if (socket) {
        socket.onopen = null;
        socket.onmessage = null;
        socket.onerror = null;
        socket.onclose = null;
      }
      socket = null;
      joined = false;
      if (heartbeatTimer != null) {
        window.clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
      scheduleReconnect();
    });
  };

  void connect();

  return () => {
    closed = true;
    clearTimers();
    try {
      if (socket && socket.readyState === WebSocket.OPEN && joinRef) {
        send('phx_leave', {}, params.topic, nextRef());
      }
    } catch {
      // ignore close path errors
    }
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      try {
        socket.close(1000, 'unsubscribe');
      } catch {
        // ignore
      }
    }
    socket = null;
  };
}

// C6.3.3.1 realtime adapter execution (Supabase Realtime -> invalidate callback).
// Polling remains the fallback path when bridge auth/config/realtime socket is unavailable.
export function subscribeChatConversationList(
  address: string,
  onInvalidate: ChatInvalidateCallback
): ChatUnsubscribe {
  const normalizedAddress = (address || '').trim().toLowerCase();
  return createRealtimeSubscription({
    debugTag: 'list',
    topic: `realtime:atp2-chat-list:${Date.now()}`,
    onInvalidate,
    ensureBridgeTokenForAddress: normalizedAddress || null,
    changes: [
      { schema: 'public', table: 'conversations', event: '*' },
      { schema: 'public', table: 'messages', event: '*' },
      { schema: 'public', table: 'conversation_participants', event: '*' },
    ],
  });
}

export function subscribeChatConversationThread(
  conversationId: string,
  onInvalidate: ChatInvalidateCallback
): ChatUnsubscribe {
  const normalizedConversationId = normalizeUuid(conversationId);
  if (!normalizedConversationId) return () => {};
  return createRealtimeSubscription({
    debugTag: `thread:${normalizedConversationId}`,
    topic: `realtime:atp2-chat-thread:${normalizedConversationId}`,
    onInvalidate,
    changes: [
      {
        schema: 'public',
        table: 'messages',
        event: '*',
        filter: `conversation_id=eq.${normalizedConversationId}`,
      },
      {
        schema: 'public',
        table: 'conversation_participants',
        event: '*',
        filter: `conversation_id=eq.${normalizedConversationId}`,
      },
    ],
  });
}

export function resolveChatPresenceOnline(input: ChatPresenceResolveInput): boolean {
  if (input.backendOnline === true) return true;

  const candidateTs = input.lastMessageTime || input.createdAt || null;
  if (!candidateTs) return false;

  const parsedMs = Date.parse(candidateTs);
  if (!Number.isFinite(parsedMs)) return false;

  const nowMs = input.nowMs ?? Date.now();
  const windowMs = input.activityWindowMs ?? CHAT_PRESENCE_ACTIVITY_WINDOW_MS_DEFAULT;
  return nowMs - parsedMs <= windowMs;
}
