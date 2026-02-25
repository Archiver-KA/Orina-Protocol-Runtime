/**
 * Messages Client - Frontend API for Supabase Backend Messaging
 * Enables real-time bidirectional messaging between wallets
 */

import { projectId, publicAnonKey, supabaseUrl } from '/utils/supabase/info';

// NOTE: The deployed edge function historically mounted routes under:
//   /functions/v1/<fnName>/<fnName>/messages/*
// while newer code should use:
//   /functions/v1/<fnName>/messages/*
// To avoid hard failures during migrations, we try the canonical path first
// and fall back to the legacy duplicated-prefix path on 404.
// Prefer the clean chat function (does not share routes with the legacy "make-server" function).
// This avoids route collisions and makes deployment safer.
const FN_NAME = 'orina-chat-v1';
const SUPABASE_BASE = supabaseUrl.replace(/\/+$/, '');
const FN_BASE = `${SUPABASE_BASE}/functions/v1/${FN_NAME}`;
const MESSAGES_BASE = `${FN_BASE}/messages`;
// Optional fallback to the old function path if needed for rollback/debug.
const LEGACY_FN_NAME = 'make-server-b0d68fc8';
const LEGACY_FN_BASE = `${SUPABASE_BASE}/functions/v1/${LEGACY_FN_NAME}`;
// Different deployments have historically used different mount patterns.
// We try both legacy forms before failing.
const MESSAGES_BASE_LEGACY = `${LEGACY_FN_BASE}/messages`; // most common
const MESSAGES_BASE_LEGACY_DUP = `${LEGACY_FN_BASE}/${LEGACY_FN_NAME}/messages`; // older duplicate-prefix

function buildHeaders(extra?: Record<string, string>) {
  // Keep headers as "simple" as possible to reduce CORS preflight failures.
  // Some Supabase setups accept Authorization alone for Edge Functions calls.
  // If your deployment requires `apikey`, add it back once CORS allow-headers
  // is confirmed to include it on OPTIONS preflight responses.
  return {
    'Authorization': `Bearer ${publicAnonKey}`,
    ...extra,
  };
}

async function fetchJsonWithFallback<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const urlPrimary = `${MESSAGES_BASE}${path}`;
  const urlLegacy = `${MESSAGES_BASE_LEGACY}${path}`;
  const urlLegacyDup = `${MESSAGES_BASE_LEGACY_DUP}${path}`;

  const doFetch = async (url: string) => {
    const res = await fetch(url, init);
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

// Types
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

/**
 * Send a message to another user
 */
export async function sendMessage(
  sender: string,
  receiver: string,
  text: string,
  image?: { url: string; ipfsHash?: string }
): Promise<{ message: Message; conversation: Conversation }> {
  try {
    const data = await fetchJsonWithFallback<any>('/send', {
      method: 'POST',
      headers: buildHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ sender, receiver, text, image }),
    });
    return { message: data.message, conversation: data.conversation };
  } catch (error) {
    console.error('[MessagesClient] Send error:', error);
    throw error;
  }
}

/**
 * Get all conversations for a user
 */
export async function getConversations(
  address: string
): Promise<ConversationWithMetadata[]> {
  try {
    const data = await fetchJsonWithFallback<any>(`/conversations/${address}`, {
      headers: buildHeaders(),
    });
    
    // Merge conversations with metadata
    const conversations: ConversationWithMetadata[] = data.conversations.map((conv: Conversation) => {
      const metadata = data.metadata[conv.id] || {};
      return {
        ...conv,
        displayName: metadata.displayName,
        avatar: metadata.avatar,
        online: false, // Can be extended with real online status
      };
    });

    return conversations;
  } catch (error) {
    console.error('[MessagesClient] Get conversations error:', error);
    throw error;
  }
}

/**
 * Get messages for a specific conversation
 */
export async function getMessages(
  conversationId: string,
  userAddress: string
): Promise<{ messages: Message[]; conversation: Conversation | null }> {
  try {
    const data = await fetchJsonWithFallback<any>(
      `/${conversationId}?userAddress=${encodeURIComponent(userAddress)}`,
      { headers: buildHeaders() }
    );
    return { messages: data.messages, conversation: data.conversation };
  } catch (error) {
    console.error('[MessagesClient] Get messages error:', error);
    throw error;
  }
}

/**
 * Mark a conversation as read
 */
export async function markAsRead(
  conversationId: string,
  userAddress: string
): Promise<void> {
  try {
    await fetchJsonWithFallback<any>('/read', {
      method: 'POST',
      headers: buildHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ conversationId, userAddress }),
    });
  } catch (error) {
    console.error('[MessagesClient] Mark as read error:', error);
    throw error;
  }
}

/**
 * Delete a conversation (only removes from user's list)
 */
export async function deleteConversation(
  conversationId: string,
  userAddress: string
): Promise<void> {
  try {
    await fetchJsonWithFallback<any>(
      `/${conversationId}?userAddress=${encodeURIComponent(userAddress)}`,
      { method: 'DELETE', headers: buildHeaders() }
    );
  } catch (error) {
    console.error('[MessagesClient] Delete conversation error:', error);
    throw error;
  }
}

/**
 * Create a new conversation (convenience wrapper)
 */
export async function createConversation(
  sender: string,
  receiver: string,
  displayName?: string
): Promise<Conversation> {
  // Send an initial message to create the conversation
  const result = await sendMessage(
    sender,
    receiver,
    'Conversation started',
    undefined
  );
  return result.conversation;
}
