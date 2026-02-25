/**
 * Messages Handler - Supabase Backend for Real-Time Messaging
 * Enables bidirectional messaging between wallet addresses
 */

import { Context } from 'npm:hono';
import * as kv from './kv_store.tsx';

// Types
export interface Message {
  id: string;
  conversationId: string;
  sender: string; // wallet address
  receiver: string; // wallet address
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

/**
 * Generate a consistent conversation ID from two addresses
 * Always sorts addresses to ensure same ID regardless of who initiates
 */
function generateConversationId(address1: string, address2: string): string {
  const sorted = [address1.toLowerCase(), address2.toLowerCase()].sort();
  return `conv_${sorted[0]}_${sorted[1]}`;
}

/**
 * Get KV key for user's conversation list
 */
function getUserConversationsKey(address: string): string {
  return `msg_list_${address.toLowerCase()}`;
}

/**
 * Get KV key for conversation metadata
 */
function getConversationKey(conversationId: string): string {
  return `msg_conv_${conversationId}`;
}

/**
 * Get KV key for conversation messages
 */
function getMessagesKey(conversationId: string): string {
  return `msg_messages_${conversationId}`;
}

/**
 * Create or get existing conversation
 */
export async function createOrGetConversation(
  address1: string,
  address2: string,
  displayName?: string
): Promise<Conversation> {
  const conversationId = generateConversationId(address1, address2);
  const convKey = getConversationKey(conversationId);

  // Try to get existing conversation
  const existing = await kv.get<Conversation>(convKey);
  if (existing) {
    return existing;
  }

  // Create new conversation
  const newConversation: Conversation = {
    id: conversationId,
    participants: [address1.toLowerCase(), address2.toLowerCase()],
    createdAt: new Date().toISOString(),
    lastMessage: 'Conversation started',
    lastMessageTime: new Date().toISOString(),
    unreadCount: {
      [address1.toLowerCase()]: 0,
      [address2.toLowerCase()]: 0,
    },
  };

  // Save conversation metadata
  await kv.set(convKey, newConversation);

  // Add to both users' conversation lists
  for (const address of newConversation.participants) {
    const listKey = getUserConversationsKey(address);
    const userConvs = (await kv.get<string[]>(listKey)) || [];
    if (!userConvs.includes(conversationId)) {
      userConvs.unshift(conversationId); // Add to beginning
      await kv.set(listKey, userConvs);
    }
  }

  // Initialize empty messages array
  await kv.set(getMessagesKey(conversationId), []);

  console.log(`[Messages] Created conversation: ${conversationId}`);
  return newConversation;
}

/**
 * Send a message
 */
export async function sendMessage(
  sender: string,
  receiver: string,
  text: string,
  image?: { url: string; ipfsHash?: string }
): Promise<{ message: Message; conversation: Conversation }> {
  // Create or get conversation
  const conversation = await createOrGetConversation(sender, receiver);
  const conversationId = conversation.id;

  // Create message
  const message: Message = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    conversationId,
    sender: sender.toLowerCase(),
    receiver: receiver.toLowerCase(),
    text,
    timestamp: new Date().toISOString(),
    read: false,
    image,
  };

  // Get existing messages
  const messagesKey = getMessagesKey(conversationId);
  const messages = (await kv.get<Message[]>(messagesKey)) || [];
  messages.push(message);
  await kv.set(messagesKey, messages);

  // Update conversation metadata
  conversation.lastMessage = text || 'Sent an image';
  conversation.lastMessageTime = message.timestamp;
  
  // Increment unread count for receiver
  const receiverLower = receiver.toLowerCase();
  conversation.unreadCount[receiverLower] = (conversation.unreadCount[receiverLower] || 0) + 1;
  
  await kv.set(getConversationKey(conversationId), conversation);

  console.log(`[Messages] Sent message from ${sender} to ${receiver}`);
  return { message, conversation };
}

/**
 * Get all conversations for a user
 */
export async function getUserConversations(address: string): Promise<{
  conversations: Conversation[];
  metadata: { [convId: string]: { displayName?: string; avatar?: string } };
}> {
  const listKey = getUserConversationsKey(address);
  const conversationIds = (await kv.get<string[]>(listKey)) || [];

  const conversations: Conversation[] = [];
  const metadata: { [convId: string]: { displayName?: string; avatar?: string } } = {};

  for (const convId of conversationIds) {
    const conv = await kv.get<Conversation>(getConversationKey(convId));
    if (conv) {
      conversations.push(conv);
      
      // Try to get metadata for the other participant
      const otherAddress = conv.participants.find(
        p => p.toLowerCase() !== address.toLowerCase()
      );
      if (otherAddress) {
        // You can extend this to fetch actual user profiles later
        metadata[convId] = {
          displayName: `${otherAddress.slice(0, 6)}...${otherAddress.slice(-4)}`,
        };
      }
    }
  }

  return { conversations, metadata };
}

/**
 * Get messages for a conversation
 */
export async function getConversationMessages(
  conversationId: string,
  userAddress: string
): Promise<{ messages: Message[]; conversation: Conversation | null }> {
  const messagesKey = getMessagesKey(conversationId);
  const messages = (await kv.get<Message[]>(messagesKey)) || [];

  const convKey = getConversationKey(conversationId);
  const conversation = await kv.get<Conversation>(convKey);

  // Mark messages as read for this user
  if (conversation && userAddress) {
    const userLower = userAddress.toLowerCase();
    conversation.unreadCount[userLower] = 0;
    await kv.set(convKey, conversation);
  }

  return { messages, conversation };
}

/**
 * Mark conversation as read
 */
export async function markConversationAsRead(
  conversationId: string,
  userAddress: string
): Promise<void> {
  const convKey = getConversationKey(conversationId);
  const conversation = await kv.get<Conversation>(convKey);

  if (conversation) {
    const userLower = userAddress.toLowerCase();
    conversation.unreadCount[userLower] = 0;
    await kv.set(convKey, conversation);
  }
}

/**
 * Delete a conversation (for one user)
 */
export async function deleteConversation(
  conversationId: string,
  userAddress: string
): Promise<void> {
  const listKey = getUserConversationsKey(userAddress);
  const userConvs = (await kv.get<string[]>(listKey)) || [];
  const filtered = userConvs.filter(id => id !== conversationId);
  await kv.set(listKey, filtered);

  console.log(`[Messages] Deleted conversation ${conversationId} for ${userAddress}`);
}

// ============================================================================
// HTTP Handlers
// ============================================================================

/**
 * POST /messages/send
 * Body: { sender, receiver, text, image? }
 */
export async function handleSendMessage(c: Context) {
  try {
    const body = await c.req.json();
    const { sender, receiver, text, image } = body;

    if (!sender || !receiver) {
      return c.json({ error: 'Missing sender or receiver' }, 400);
    }

    if (!text && !image) {
      return c.json({ error: 'Message must contain text or image' }, 400);
    }

    const result = await sendMessage(sender, receiver, text || '', image);

    return c.json({
      success: true,
      message: result.message,
      conversation: result.conversation,
    });
  } catch (error) {
    console.error('[Messages] Send error:', error);
    return c.json({ error: 'Failed to send message', details: error.message }, 500);
  }
}

/**
 * GET /messages/conversations/:address
 */
export async function handleGetConversations(c: Context) {
  try {
    const address = c.req.param('address');

    if (!address) {
      return c.json({ error: 'Missing address' }, 400);
    }

    const result = await getUserConversations(address);

    return c.json({
      success: true,
      conversations: result.conversations,
      metadata: result.metadata,
    });
  } catch (error) {
    console.error('[Messages] Get conversations error:', error);
    return c.json({ error: 'Failed to get conversations', details: error.message }, 500);
  }
}

/**
 * GET /messages/:conversationId?userAddress=0x...
 */
export async function handleGetMessages(c: Context) {
  try {
    const conversationId = c.req.param('conversationId');
    const userAddress = c.req.query('userAddress');

    if (!conversationId) {
      return c.json({ error: 'Missing conversationId' }, 400);
    }

    const result = await getConversationMessages(conversationId, userAddress || '');

    return c.json({
      success: true,
      messages: result.messages,
      conversation: result.conversation,
    });
  } catch (error) {
    console.error('[Messages] Get messages error:', error);
    return c.json({ error: 'Failed to get messages', details: error.message }, 500);
  }
}

/**
 * POST /messages/read
 * Body: { conversationId, userAddress }
 */
export async function handleMarkAsRead(c: Context) {
  try {
    const body = await c.req.json();
    const { conversationId, userAddress } = body;

    if (!conversationId || !userAddress) {
      return c.json({ error: 'Missing conversationId or userAddress' }, 400);
    }

    await markConversationAsRead(conversationId, userAddress);

    return c.json({ success: true });
  } catch (error) {
    console.error('[Messages] Mark as read error:', error);
    return c.json({ error: 'Failed to mark as read', details: error.message }, 500);
  }
}

/**
 * DELETE /messages/:conversationId?userAddress=0x...
 */
export async function handleDeleteConversation(c: Context) {
  try {
    const conversationId = c.req.param('conversationId');
    const userAddress = c.req.query('userAddress');

    if (!conversationId || !userAddress) {
      return c.json({ error: 'Missing conversationId or userAddress' }, 400);
    }

    await deleteConversation(conversationId, userAddress);

    return c.json({ success: true });
  } catch (error) {
    console.error('[Messages] Delete conversation error:', error);
    return c.json({ error: 'Failed to delete conversation', details: error.message }, 500);
  }
}
