/**
 * Messages Client - Frontend API for Supabase Backend Messaging
 * Requires H1 wallet-auth bridge JWT (same as other protected Edge routes).
 */

import { projectId, publicAnonKey, supabaseUrl } from '/utils/supabase/info';
import {
  exchangeWalletAuthForSupabaseClaimSession,
  getSupabaseBridgeAccessToken,
  isSupabaseAuthClaimBridgeEnabled,
} from '@/utils/supabaseAuthClaimBridge';

const FN_NAME = 'orina-chat-v1';
const SUPABASE_BASE = supabaseUrl.replace(/\/+$/, '');
const FN_BASE = `${SUPABASE_BASE}/functions/v1/${FN_NAME}`;
const MESSAGES_BASE = `${FN_BASE}/messages`;
const LEGACY_FN_NAME = 'make-server-b0d68fc8';
const LEGACY_FN_BASE = `${SUPABASE_BASE}/functions/v1/${LEGACY_FN_NAME}`;
const MESSAGES_BASE_LEGACY = `${LEGACY_FN_BASE}/messages`;
const MESSAGES_BASE_LEGACY_DUP = `${LEGACY_FN_BASE}/${LEGACY_FN_NAME}/messages`;

export const CHAT_CONVERSATIONS_CHANGED_EVENT = 'orina:chat-conversations-changed';
export const CHAT_MESSAGES_CHANGED_EVENT = 'orina:chat-messages-changed';
export const CHAT_READ_STATE_CHANGED_EVENT = 'orina:chat-read-state-changed';

function dispatchChatEvent(name: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(name));
}

async function buildWalletAuthHeaders(walletAddress: string, jsonBody: boolean): Promise<Record<string, string>> {
  const w = String(walletAddress || '').trim();
  if (!w) {
    throw new Error('Wallet address is required for messaging.');
  }

  if (isSupabaseAuthClaimBridgeEnabled()) {
    await exchangeWalletAuthForSupabaseClaimSession(w);
  }

  const token = getSupabaseBridgeAccessToken();
  if (!token) {
    throw new Error('Wallet session required. Sign the Orina wallet auth message, then retry.');
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    apikey: publicAnonKey,
  };
  if (jsonBody) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
}

async function fetchJsonWithFallback<T>(
  path: string,
  walletAddress: string,
  init?: RequestInit
): Promise<T> {
  const jsonBody = Boolean(
    init?.body && typeof init.body === 'string' && init.method && init.method !== 'GET'
  );
  const authHeaders = await buildWalletAuthHeaders(walletAddress, jsonBody);

  const urlPrimary = `${MESSAGES_BASE}${path}`;
  const urlLegacy = `${MESSAGES_BASE_LEGACY}${path}`;
  const urlLegacyDup = `${MESSAGES_BASE_LEGACY_DUP}${path}`;

  const doFetch = async (url: string) => {
    const res = await fetch(url, {
      ...init,
      headers: {
        ...authHeaders,
        ...(init?.headers || {}),
      },
    });
    const text = await res.text();

    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      // keep raw text for error reporting
    }

    return { res, text, json };
  };

  const primary = await doFetch(urlPrimary);
  if (primary.res.status === 404) {
    const legacy = await doFetch(urlLegacy);
    if (legacy.res.status === 404) {
      const legacyDup = await doFetch(urlLegacyDup);
      if (!legacyDup.res.ok) {
        const msg =
          legacyDup.json?.error ||
          legacyDup.json?.message ||
          `HTTP ${legacyDup.res.status} (legacy): ${legacyDup.text?.slice(0, 200) || 'Request failed'}`;
        throw new Error(msg);
      }
      return legacyDup.json as T;
    }

    if (!legacy.res.ok) {
      const msg =
        legacy.json?.error ||
        legacy.json?.message ||
        `HTTP ${legacy.res.status} (legacy): ${legacy.text?.slice(0, 200) || 'Request failed'}`;
      throw new Error(msg);
    }

    return legacy.json as T;
  }

  if (!primary.res.ok) {
    const msg =
      primary.json?.error ||
      primary.json?.message ||
      `HTTP ${primary.res.status}: ${primary.text?.slice(0, 200) || 'Request failed'}`;
    throw new Error(msg);
  }

  return primary.json as T;
}

export interface Message {
  id: string;
  conversationId: string;
  sender: string;
  receiver: string;
  text: string;
  timestamp: string;
  read: boolean;
  image?: {
    url: string;
    ipfsHash?: string;
  };
  isAI?: boolean;
}

export interface Conversation {
  id: string;
  participants: string[];
  createdAt: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: { [address: string]: number };
}

export interface ConversationWithMetadata extends Conversation {
  displayName?: string;
  avatar?: string;
  online?: boolean;
}

export async function sendMessage(
  sender: string,
  receiver: string,
  text: string,
  image?: { url: string; ipfsHash?: string }
): Promise<{ message: Message; conversation: Conversation }> {
  try {
    const data = await fetchJsonWithFallback<any>('/send', sender, {
      method: 'POST',
      body: JSON.stringify({ sender, receiver, text, image }),
    });
    dispatchChatEvent(CHAT_MESSAGES_CHANGED_EVENT);
    dispatchChatEvent(CHAT_CONVERSATIONS_CHANGED_EVENT);
    return { message: data.message, conversation: data.conversation };
  } catch (error) {
    console.error('[MessagesClient] Send error:', error);
    throw error;
  }
}

export async function getConversations(
  address: string
): Promise<ConversationWithMetadata[]> {
  try {
    const data = await fetchJsonWithFallback<any>(`/conversations/${address}`, address, {
      method: 'GET',
    });

    const conversations: ConversationWithMetadata[] = data.conversations.map((conv: Conversation) => {
      const metadata = data.metadata[conv.id] || {};
      return {
        ...conv,
        displayName: metadata.displayName,
        avatar: metadata.avatar,
        online: false,
      };
    });

    return conversations;
  } catch (error) {
    console.error('[MessagesClient] Get conversations error:', error);
    throw error;
  }
}

export async function getMessages(
  conversationId: string,
  userAddress: string
): Promise<{ messages: Message[]; conversation: Conversation | null }> {
  try {
    const data = await fetchJsonWithFallback<any>(
      `/${conversationId}?userAddress=${encodeURIComponent(userAddress)}`,
      userAddress,
      { method: 'GET' }
    );
    return { messages: data.messages, conversation: data.conversation };
  } catch (error) {
    console.error('[MessagesClient] Get messages error:', error);
    throw error;
  }
}

export async function markAsRead(
  conversationId: string,
  userAddress: string
): Promise<void> {
  try {
    await fetchJsonWithFallback<any>('/read', userAddress, {
      method: 'POST',
      body: JSON.stringify({ conversationId, userAddress }),
    });
    dispatchChatEvent(CHAT_READ_STATE_CHANGED_EVENT);
    dispatchChatEvent(CHAT_CONVERSATIONS_CHANGED_EVENT);
  } catch (error) {
    console.error('[MessagesClient] Mark as read error:', error);
    throw error;
  }
}

export async function deleteConversation(
  conversationId: string,
  userAddress: string
): Promise<void> {
  try {
    await fetchJsonWithFallback<any>(
      `/${conversationId}?userAddress=${encodeURIComponent(userAddress)}`,
      userAddress,
      { method: 'DELETE' }
    );
    dispatchChatEvent(CHAT_MESSAGES_CHANGED_EVENT);
    dispatchChatEvent(CHAT_CONVERSATIONS_CHANGED_EVENT);
  } catch (error) {
    console.error('[MessagesClient] Delete conversation error:', error);
    throw error;
  }
}

export async function createConversation(
  sender: string,
  receiver: string,
  displayName?: string
): Promise<Conversation> {
  try {
    const data = await fetchJsonWithFallback<any>('/conversation', sender, {
      method: 'POST',
      body: JSON.stringify({ sender, receiver, displayName }),
    });
    dispatchChatEvent(CHAT_CONVERSATIONS_CHANGED_EVENT);
    return data.conversation as Conversation;
  } catch (error) {
    console.debug('[MessagesClient] createConversation fallback -> sendMessage:', error);
    const result = await sendMessage(sender, receiver, 'Conversation started', undefined);
    return result.conversation;
  }
}
