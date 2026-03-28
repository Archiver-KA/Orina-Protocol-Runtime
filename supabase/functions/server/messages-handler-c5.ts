/**
 * Messages Handler (C5-backed)
 * Compatibility layer for existing chat REST API using C5 messaging schema:
 * - conversations
 * - conversation_participants
 * - messages
 *
 * Keeps the frontend API contract stable while migrating storage away from kv_store.
 */

import { Context } from 'npm:hono';
import { createClient } from 'npm:@supabase/supabase-js@2';
import type { AuthenticatedWalletIdentity } from './request-auth.ts';
import {
  assertAuthenticatedWalletMatch,
  normalizeWalletAddress,
  requireAuthenticatedWallet,
} from './request-auth.ts';

// Types (compatible with existing frontend MessagesClient)
export interface Message {
  id: string;
  conversationId: string;
  sender: string; // wallet address
  receiver: string; // wallet address (direct conversation partner)
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
  participants: string[]; // [address1, address2]
  createdAt: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: { [address: string]: number };
}

type DbProfileRow = {
  id: string;
  wallet_address: string;
  display_name?: string | null;
  avatar_url?: string | null;
  status?: string | null;
};

type DbConversationRow = {
  id: string;
  type: string;
  title: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
};

type DbParticipantRow = {
  conversation_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  last_read_at: string | null;
};

type DbMessageRow = {
  id: string;
  conversation_id: string;
  sender_user_id: string;
  client_message_id: string;
  body: string | null;
  attachments: any;
  metadata: Record<string, any> | null;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
};

function normalizeAddress(address: string): string {
  return String(address || '').trim().toLowerCase();
}

function shortDisplayName(walletAddress: string): string {
  return `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
}

function directConversationKey(address1: string, address2: string): string {
  const sorted = [normalizeAddress(address1), normalizeAddress(address2)].sort();
  return `direct:${sorted[0]}:${sorted[1]}`;
}

function getServiceSupabaseClient() {
  const url = Deno.env.get('SUPABASE_URL') || '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!url || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(url, serviceRoleKey);
}

async function resolveOrCreateProfile(
  supabase: ReturnType<typeof createClient>,
  walletAddress: string
): Promise<DbProfileRow> {
  const normalized = normalizeAddress(walletAddress);
  const { data: existing, error: selectError } = await supabase
    .from('profiles')
    .select('id,wallet_address,display_name,avatar_url,status')
    .eq('wallet_address', normalized)
    .limit(1);

  if (selectError) {
    throw new Error(`profiles lookup failed: ${selectError.message}`);
  }

  const found = (existing?.[0] as DbProfileRow | undefined) || null;
  if (found) return found;

  const { data: inserted, error: insertError } = await supabase
    .from('profiles')
    .insert({
      wallet_address: normalized,
      display_name: shortDisplayName(normalized),
      status: 'active',
    })
    .select('id,wallet_address,display_name,avatar_url,status')
    .limit(1);

  if (insertError) {
    const duplicate = `${(insertError as any).code || ''}` === '23505';
    if (!duplicate) throw new Error(`profiles create failed: ${insertError.message}`);

    const { data: raced, error: racedError } = await supabase
      .from('profiles')
      .select('id,wallet_address,display_name,avatar_url,status')
      .eq('wallet_address', normalized)
      .limit(1);
    if (racedError || !raced?.[0]) {
      throw new Error(`profiles race re-read failed: ${racedError?.message || 'not found'}`);
    }
    return raced[0] as DbProfileRow;
  }

  const row = (inserted?.[0] as DbProfileRow | undefined) || null;
  if (!row) throw new Error('profiles create returned empty row');
  return row;
}

async function loadProfilesByIds(
  supabase: ReturnType<typeof createClient>,
  profileIds: string[]
): Promise<Map<string, DbProfileRow>> {
  if (!profileIds.length) return new Map();
  const { data, error } = await supabase
    .from('profiles')
    .select('id,wallet_address,display_name,avatar_url,status')
    .in('id', profileIds);
  if (error) throw new Error(`profiles batch lookup failed: ${error.message}`);
  const rows = (data || []) as DbProfileRow[];
  return new Map(rows.map((r) => [r.id, r]));
}

async function ensureParticipantRows(
  supabase: ReturnType<typeof createClient>,
  conversationId: string,
  profileIds: string[]
): Promise<void> {
  if (!profileIds.length) return;
  const rows = profileIds.map((userId, idx) => ({
    conversation_id: conversationId,
    user_id: userId,
    role: idx === 0 ? 'owner' : 'member',
  }));
  const { error } = await supabase
    .from('conversation_participants')
    .upsert(rows, { onConflict: 'conversation_id,user_id', ignoreDuplicates: true });
  if (error) throw new Error(`conversation_participants upsert failed: ${error.message}`);
}

async function createOrGetConversation(
  address1: string,
  address2: string,
  displayName?: string
): Promise<{
  supabase: ReturnType<typeof createClient>;
  conversation: Conversation;
  conversationRow: DbConversationRow;
  participants: DbParticipantRow[];
  profilesById: Map<string, DbProfileRow>;
}> {
  const supabase = getServiceSupabaseClient();
  const walletA = normalizeAddress(address1);
  const walletB = normalizeAddress(address2);
  const directKey = directConversationKey(walletA, walletB);

  const profileA = await resolveOrCreateProfile(supabase, walletA);
  const profileB = await resolveOrCreateProfile(supabase, walletB);

  let conversationRow: DbConversationRow | null = null;

  // Direct conversation lookup by metadata.direct_key
  const { data: existingRows, error: existingError } = await supabase
    .from('conversations')
    .select('id,type,title,metadata,created_at,updated_at')
    .eq('type', 'direct')
    .contains('metadata', { direct_key: directKey })
    .limit(1);
  if (existingError) {
    throw new Error(`conversations lookup failed: ${existingError.message}`);
  }

  conversationRow = (existingRows?.[0] as DbConversationRow | undefined) || null;

  if (!conversationRow) {
    const { data: insertedRows, error: insertError } = await supabase
      .from('conversations')
      .insert({
        type: 'direct',
        title: displayName || null,
        metadata: {
          direct_key: directKey,
          created_by: 'orina-chat-v1',
        },
      })
      .select('id,type,title,metadata,created_at,updated_at')
      .limit(1);
    if (insertError) {
      // race fallback: re-read
      const { data: racedRows, error: racedError } = await supabase
        .from('conversations')
        .select('id,type,title,metadata,created_at,updated_at')
        .eq('type', 'direct')
        .contains('metadata', { direct_key: directKey })
        .limit(1);
      if (racedError || !racedRows?.[0]) {
        throw new Error(`conversations create failed: ${insertError.message}`);
      }
      conversationRow = racedRows[0] as DbConversationRow;
    } else {
      conversationRow = (insertedRows?.[0] as DbConversationRow | undefined) || null;
    }
  }

  if (!conversationRow) {
    throw new Error('conversation create/get returned empty row');
  }

  await ensureParticipantRows(supabase, conversationRow.id, [profileA.id, profileB.id]);

  const { data: participantRows, error: participantError } = await supabase
    .from('conversation_participants')
    .select('conversation_id,user_id,role,joined_at,last_read_at')
    .eq('conversation_id', conversationRow.id);
  if (participantError) {
    throw new Error(`conversation_participants select failed: ${participantError.message}`);
  }
  const participants = (participantRows || []) as DbParticipantRow[];
  const profilesById = new Map<string, DbProfileRow>([
    [profileA.id, profileA],
    [profileB.id, profileB],
  ]);

  const conversation = await buildConversationResponse(
    supabase,
    conversationRow,
    participants,
    profilesById
  );

  return { supabase, conversation, conversationRow, participants, profilesById };
}

function extractImageFromAttachments(attachments: any): { url: string; ipfsHash?: string } | undefined {
  if (!Array.isArray(attachments) || attachments.length === 0) return undefined;
  const first = attachments[0];
  if (!first || typeof first !== 'object') return undefined;
  const url = typeof first.url === 'string' ? first.url : '';
  if (!url) return undefined;
  return {
    url,
    ipfsHash: typeof first.ipfsHash === 'string' ? first.ipfsHash : undefined,
  };
}

async function loadConversationParticipants(
  supabase: ReturnType<typeof createClient>,
  conversationIds: string[]
): Promise<DbParticipantRow[]> {
  if (!conversationIds.length) return [];
  const { data, error } = await supabase
    .from('conversation_participants')
    .select('conversation_id,user_id,role,joined_at,last_read_at')
    .in('conversation_id', conversationIds);
  if (error) throw new Error(`conversation_participants batch select failed: ${error.message}`);
  return (data || []) as DbParticipantRow[];
}

async function loadVisibleMessagesForConversations(
  supabase: ReturnType<typeof createClient>,
  conversationIds: string[]
): Promise<DbMessageRow[]> {
  if (!conversationIds.length) return [];
  const { data, error } = await supabase
    .from('messages')
    .select('id,conversation_id,sender_user_id,client_message_id,body,attachments,metadata,created_at,edited_at,deleted_at')
    .in('conversation_id', conversationIds)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });
  if (error) throw new Error(`messages batch select failed: ${error.message}`);
  return (data || []) as DbMessageRow[];
}

async function buildConversationResponse(
  supabase: ReturnType<typeof createClient>,
  conversationRow: DbConversationRow,
  participantRows: DbParticipantRow[],
  profilesByIdInput?: Map<string, DbProfileRow>
): Promise<Conversation> {
  const profileIds = Array.from(new Set(participantRows.map((p) => p.user_id)));
  const profilesById = profilesByIdInput || (await loadProfilesByIds(supabase, profileIds));
  const messages = await loadVisibleMessagesForConversations(supabase, [conversationRow.id]);
  const convMessages = messages.filter((m) => m.conversation_id === conversationRow.id);
  const lastMessage = convMessages[convMessages.length - 1] || null;

  const participants = participantRows
    .map((p) => profilesById.get(p.user_id)?.wallet_address || '')
    .filter(Boolean);

  const unreadCount = {};
  for (const p of participantRows) {
    const profile = profilesById.get(p.user_id);
    if (!profile?.wallet_address) continue;
    const lastReadAtMs = p.last_read_at ? Date.parse(p.last_read_at) : 0;
    const count = convMessages.filter((m) => {
      if (m.sender_user_id === p.user_id) return false;
      return Date.parse(m.created_at) > lastReadAtMs;
    }).length;
    unreadCount[profile.wallet_address.toLowerCase()] = count;
  }

  return {
    id: conversationRow.id,
    participants,
    createdAt: conversationRow.created_at,
    lastMessage: lastMessage?.body || (extractImageFromAttachments(lastMessage?.attachments)?.url ? 'Sent an image' : 'Conversation started'),
    lastMessageTime: lastMessage?.created_at || conversationRow.created_at,
    unreadCount,
  };
}

async function sendMessageImpl(
  sender: string,
  receiver: string,
  text: string,
  image?: { url: string; ipfsHash?: string }
): Promise<{ message: Message; conversation: Conversation }> {
  const normalizedSender = normalizeAddress(sender);
  const normalizedReceiver = normalizeAddress(receiver);
  const { supabase, conversationRow, participants, profilesById } = await createOrGetConversation(
    normalizedSender,
    normalizedReceiver
  );

  const senderProfile = Array.from(profilesById.values()).find((p) => p.wallet_address === normalizedSender);
  if (!senderProfile?.id) throw new Error('Failed to resolve sender profile');

  const attachments = image?.url
    ? [{ kind: 'image', url: image.url, ipfsHash: image.ipfsHash || null }]
    : [];

  const clientMessageId = `api_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const { data: insertedRows, error: insertError } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationRow.id,
      sender_user_id: senderProfile.id,
      client_message_id: clientMessageId,
      body: text || null,
      attachments,
      metadata: { source: 'orina-chat-v1' },
    })
    .select('id,conversation_id,sender_user_id,client_message_id,body,attachments,metadata,created_at,edited_at,deleted_at')
    .limit(1);

  if (insertError) throw new Error(`messages insert failed: ${insertError.message}`);
  const inserted = (insertedRows?.[0] as DbMessageRow | undefined) || null;
  if (!inserted) throw new Error('messages insert returned empty row');

  const refreshedConversation = await buildConversationResponse(
    supabase,
    conversationRow,
    participants,
    profilesById
  );

  const receiverWallet = normalizedReceiver;
  const senderWallet = normalizedSender;

  const message: Message = {
    id: inserted.id,
    conversationId: inserted.conversation_id,
    sender: senderWallet,
    receiver: receiverWallet,
    text: inserted.body || '',
    timestamp: inserted.created_at,
    read: false,
    image: extractImageFromAttachments(inserted.attachments),
    isAI: false,
  };

  return { message, conversation: refreshedConversation };
}

async function getUserConversationsImpl(address: string): Promise<{
  conversations: Conversation[];
  metadata: { [convId: string]: { displayName?: string; avatar?: string } };
}> {
  const supabase = getServiceSupabaseClient();
  const wallet = normalizeAddress(address);
  const profile = await resolveOrCreateProfile(supabase, wallet);

  const { data: myParticipantRows, error: myParticipantError } = await supabase
    .from('conversation_participants')
    .select('conversation_id,user_id,role,joined_at,last_read_at')
    .eq('user_id', profile.id);
  if (myParticipantError) throw new Error(`conversation_participants list failed: ${myParticipantError.message}`);
  const mine = (myParticipantRows || []) as DbParticipantRow[];
  const conversationIds = mine.map((r) => r.conversation_id);
  if (conversationIds.length === 0) return { conversations: [], metadata: {} };

  const { data: convRows, error: convError } = await supabase
    .from('conversations')
    .select('id,type,title,metadata,created_at,updated_at')
    .in('id', conversationIds)
    .order('updated_at', { ascending: false });
  if (convError) throw new Error(`conversations list failed: ${convError.message}`);
  const conversationsRows = (convRows || []) as DbConversationRow[];

  const allParticipantRows = await loadConversationParticipants(supabase, conversationIds);
  const profileIds = Array.from(new Set(allParticipantRows.map((p) => p.user_id)));
  const profilesById = await loadProfilesByIds(supabase, profileIds);
  const messages = await loadVisibleMessagesForConversations(supabase, conversationIds);

  const participantsByConversation = new Map();
  for (const row of allParticipantRows) {
    const arr = participantsByConversation.get(row.conversation_id) || [];
    arr.push(row);
    participantsByConversation.set(row.conversation_id, arr);
  }
  const messagesByConversation = new Map();
  for (const msg of messages) {
    const arr = messagesByConversation.get(msg.conversation_id) || [];
    arr.push(msg);
    messagesByConversation.set(msg.conversation_id, arr);
  }

  const outConversations: Conversation[] = [];
  const metadata: { [convId: string]: { displayName?: string; avatar?: string } } = {};

  for (const conv of conversationsRows) {
    const participantRows = (participantsByConversation.get(conv.id) || []) as DbParticipantRow[];
    const convMsgs = (messagesByConversation.get(conv.id) || []) as DbMessageRow[];
    const lastMessage = convMsgs[convMsgs.length - 1] || null;

    const participantWallets = participantRows
      .map((p) => profilesById.get(p.user_id)?.wallet_address || '')
      .filter(Boolean);

    const unreadCount: Record<string, number> = {};
    for (const p of participantRows) {
      const profileRow = profilesById.get(p.user_id);
      if (!profileRow?.wallet_address) continue;
      const lastReadAtMs = p.last_read_at ? Date.parse(p.last_read_at) : 0;
      unreadCount[profileRow.wallet_address.toLowerCase()] = convMsgs.filter((m) => {
        if (m.sender_user_id === p.user_id) return false;
        return Date.parse(m.created_at) > lastReadAtMs;
      }).length;
    }

    outConversations.push({
      id: conv.id,
      participants: participantWallets,
      createdAt: conv.created_at,
      lastMessage: lastMessage?.body || (extractImageFromAttachments(lastMessage?.attachments)?.url ? 'Sent an image' : 'Conversation started'),
      lastMessageTime: lastMessage?.created_at || conv.created_at,
      unreadCount,
    });

    const otherParticipant = participantRows
      .map((p) => profilesById.get(p.user_id))
      .find((p) => p && normalizeAddress(p.wallet_address) !== wallet);
    if (otherParticipant) {
      metadata[conv.id] = {
        displayName: otherParticipant.display_name || shortDisplayName(otherParticipant.wallet_address),
        avatar: otherParticipant.avatar_url || undefined,
      };
    }
  }

  // Sort by last message time desc
  outConversations.sort((a, b) => Date.parse(b.lastMessageTime) - Date.parse(a.lastMessageTime));

  return { conversations: outConversations, metadata };
}

function assertCallerIsPartyToDirectChat(
  c: Context,
  identity: AuthenticatedWalletIdentity,
  sender: string,
  receiver: string,
): Response | null {
  const w = identity.walletAddress;
  const s = normalizeWalletAddress(sender);
  const r = normalizeWalletAddress(receiver);
  if (w !== s && w !== r) {
    return c.json({ error: 'Authenticated wallet must match sender or receiver' }, 403);
  }
  return null;
}

async function getConversationMessagesImpl(
  conversationId: string,
  userAddress: string
): Promise<{ messages: Message[]; conversation: Conversation | null }> {
  const supabase = getServiceSupabaseClient();
  const wallet = normalizeAddress(userAddress);
  if (!wallet) {
    throw new Error('userAddress is required');
  }
  const userProfile = await resolveOrCreateProfile(supabase, wallet);

  const { data: convRows, error: convError } = await supabase
    .from('conversations')
    .select('id,type,title,metadata,created_at,updated_at')
    .eq('id', conversationId)
    .limit(1);
  if (convError) throw new Error(`conversations get failed: ${convError.message}`);
  const conversationRow = (convRows?.[0] as DbConversationRow | undefined) || null;
  if (!conversationRow) return { messages: [], conversation: null };

  const { data: participantRowsRaw, error: participantError } = await supabase
    .from('conversation_participants')
    .select('conversation_id,user_id,role,joined_at,last_read_at')
    .eq('conversation_id', conversationId);
  if (participantError) throw new Error(`conversation_participants get failed: ${participantError.message}`);
  const participantRows = (participantRowsRaw || []) as DbParticipantRow[];

  // Access check by membership (server-side guard even though service role is used)
  if (!participantRows.some((p) => p.user_id === userProfile.id)) {
    throw new Error('User is not a participant of this conversation');
  }

  const profileIds = Array.from(new Set(participantRows.map((p) => p.user_id)));
  const profilesById = await loadProfilesByIds(supabase, profileIds);

  const { data: msgRowsRaw, error: msgError } = await supabase
    .from('messages')
    .select('id,conversation_id,sender_user_id,client_message_id,body,attachments,metadata,created_at,edited_at,deleted_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (msgError) throw new Error(`messages get failed: ${msgError.message}`);
  const msgRows = ((msgRowsRaw || []) as DbMessageRow[]).filter((m) => !m.deleted_at);

  const requesterWallet = userProfile?.wallet_address || wallet;
  const participantWallets = participantRows
    .map((p) => profilesById.get(p.user_id)?.wallet_address || '')
    .filter(Boolean);

  const requesterParticipant = userProfile
    ? participantRows.find((p) => p.user_id === userProfile.id) || null
    : null;
  const requesterLastReadMs = requesterParticipant?.last_read_at ? Date.parse(requesterParticipant.last_read_at) : 0;

  // Mark as read only when there is a newer incoming message.
  // Avoiding a write on every poll materially reduces latency/noise for C6 polling baseline.
  if (userProfile) {
    const hasUnreadIncoming = msgRows.some((m) => {
      if (m.sender_user_id === userProfile.id) return false;
      const createdAtMs = Date.parse(m.created_at);
      return !Number.isFinite(requesterLastReadMs) || requesterLastReadMs <= 0
        ? true
        : createdAtMs > requesterLastReadMs;
    });

    if (hasUnreadIncoming) {
      const { error: markError } = await supabase
        .from('conversation_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', userProfile.id);
      if (markError) {
        console.warn('[Messages C5] mark-read on get failed:', markError.message);
      }
    }
  }

  const messages: Message[] = msgRows.map((m) => {
    const senderProfile = profilesById.get(m.sender_user_id);
    const senderWallet = senderProfile?.wallet_address || '';
    const receiverWallet =
      participantWallets.find((addr) => normalizeAddress(addr) !== normalizeAddress(senderWallet)) || '';
    const isRead = requesterLastReadMs > 0 ? Date.parse(m.created_at) <= requesterLastReadMs : senderWallet === requesterWallet;

    return {
      id: m.id,
      conversationId: m.conversation_id,
      sender: senderWallet,
      receiver: receiverWallet,
      text: m.body || '',
      timestamp: m.created_at,
      read: isRead,
      image: extractImageFromAttachments(m.attachments),
      isAI: false,
    };
  });

  const conversation = await buildConversationResponse(supabase, conversationRow, participantRows, profilesById);
  return { messages, conversation };
}

async function markConversationAsReadImpl(
  conversationId: string,
  userAddress: string
): Promise<void> {
  const supabase = getServiceSupabaseClient();
  const profile = await resolveOrCreateProfile(supabase, normalizeAddress(userAddress));
  const { data: membership, error: memErr } = await supabase
    .from('conversation_participants')
    .select('user_id')
    .eq('conversation_id', conversationId)
    .eq('user_id', profile.id)
    .limit(1);
  if (memErr) throw new Error(`mark read membership check failed: ${memErr.message}`);
  if (!membership?.length) throw new Error('User is not a participant of this conversation');

  const { error } = await supabase
    .from('conversation_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', profile.id);
  if (error) throw new Error(`mark read failed: ${error.message}`);
}

async function deleteConversationImpl(
  conversationId: string,
  userAddress: string
): Promise<void> {
  const supabase = getServiceSupabaseClient();
  const profile = await resolveOrCreateProfile(supabase, normalizeAddress(userAddress));

  const { data: membership, error: memErr } = await supabase
    .from('conversation_participants')
    .select('user_id')
    .eq('conversation_id', conversationId)
    .eq('user_id', profile.id)
    .limit(1);
  if (memErr) throw new Error(`delete membership check failed: ${memErr.message}`);
  if (!membership?.length) throw new Error('User is not a participant of this conversation');

  const { error } = await supabase
    .from('conversation_participants')
    .delete()
    .eq('conversation_id', conversationId)
    .eq('user_id', profile.id);
  if (error) throw new Error(`delete conversation participant row failed: ${error.message}`);
}

// ============================================================================
// HTTP Handlers (same routes/contract as legacy handler)
// ============================================================================

export async function handleCreateConversation(c: Context) {
  try {
    const body = await c.req.json();
    const { sender, receiver, displayName } = body;

    if (!sender || !receiver) {
      return c.json({ error: 'Missing sender or receiver' }, 400);
    }

    const { conversation } = await createOrGetConversation(sender, receiver, displayName);
    return c.json({ success: true, conversation });
  } catch (error) {
    console.error('[Messages C5] Create conversation error:', error);
    return c.json({ error: 'Failed to create conversation', details: error instanceof Error ? error.message : String(error) }, 500);
  }
}

export async function handleSendMessage(c: Context) {
  try {
    const auth = await requireAuthenticatedWallet(c);
    if (!auth.ok) return auth.response;

    const body = await c.req.json();
    const { sender, receiver, text, image } = body;

    if (!sender || !receiver) {
      return c.json({ error: 'Missing sender or receiver' }, 400);
    }
    if (!text && !image) {
      return c.json({ error: 'Message must contain text or image' }, 400);
    }

    const mismatch = assertAuthenticatedWalletMatch(c, auth.identity, sender, 'sender');
    if (mismatch) return mismatch;

    const result = await sendMessageImpl(sender, receiver, text || '', image);
    return c.json({ success: true, message: result.message, conversation: result.conversation });
  } catch (error) {
    console.error('[Messages C5] Send error:', error);
    return c.json({ error: 'Failed to send message', details: error instanceof Error ? error.message : String(error) }, 500);
  }
}

export async function handleGetConversations(c: Context) {
  try {
    const auth = await requireAuthenticatedWallet(c);
    if (!auth.ok) return auth.response;

    const address = c.req.param('address');
    if (!address) {
      return c.json({ error: 'Missing address' }, 400);
    }

    const mismatch = assertAuthenticatedWalletMatch(c, auth.identity, address, 'address');
    if (mismatch) return mismatch;

    const result = await getUserConversationsImpl(address);
    return c.json({ success: true, conversations: result.conversations, metadata: result.metadata });
  } catch (error) {
    console.error('[Messages C5] Get conversations error:', error);
    return c.json({ error: 'Failed to get conversations', details: error instanceof Error ? error.message : String(error) }, 500);
  }
}

export async function handleGetMessages(c: Context) {
  try {
    const auth = await requireAuthenticatedWallet(c);
    if (!auth.ok) return auth.response;

    const conversationId = c.req.param('conversationId');
    const userAddress = c.req.query('userAddress');
    if (!conversationId) {
      return c.json({ error: 'Missing conversationId' }, 400);
    }
    if (!userAddress?.trim()) {
      return c.json({ error: 'Missing userAddress' }, 400);
    }

    const mismatch = assertAuthenticatedWalletMatch(c, auth.identity, userAddress, 'userAddress');
    if (mismatch) return mismatch;

    const result = await getConversationMessagesImpl(conversationId, userAddress);
    return c.json({ success: true, messages: result.messages, conversation: result.conversation });
  } catch (error) {
    console.error('[Messages C5] Get messages error:', error);
    return c.json({ error: 'Failed to get messages', details: error instanceof Error ? error.message : String(error) }, 500);
  }
}

export async function handleMarkAsRead(c: Context) {
  try {
    const auth = await requireAuthenticatedWallet(c);
    if (!auth.ok) return auth.response;

    const body = await c.req.json();
    const { conversationId, userAddress } = body;
    if (!conversationId || !userAddress) {
      return c.json({ error: 'Missing conversationId or userAddress' }, 400);
    }

    const mismatch = assertAuthenticatedWalletMatch(c, auth.identity, userAddress, 'userAddress');
    if (mismatch) return mismatch;

    await markConversationAsReadImpl(conversationId, userAddress);
    return c.json({ success: true });
  } catch (error) {
    console.error('[Messages C5] Mark as read error:', error);
    return c.json({ error: 'Failed to mark as read', details: error instanceof Error ? error.message : String(error) }, 500);
  }
}

export async function handleDeleteConversation(c: Context) {
  try {
    const auth = await requireAuthenticatedWallet(c);
    if (!auth.ok) return auth.response;

    const conversationId = c.req.param('conversationId');
    const userAddress = c.req.query('userAddress');
    if (!conversationId || !userAddress) {
      return c.json({ error: 'Missing conversationId or userAddress' }, 400);
    }

    const mismatch = assertAuthenticatedWalletMatch(c, auth.identity, userAddress, 'userAddress');
    if (mismatch) return mismatch;

    await deleteConversationImpl(conversationId, userAddress);
    return c.json({ success: true });
  } catch (error) {
    console.error('[Messages C5] Delete conversation error:', error);
    return c.json({ error: 'Failed to delete conversation', details: error instanceof Error ? error.message : String(error) }, 500);
  }
}
