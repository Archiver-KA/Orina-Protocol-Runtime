// Conversation Management Utils
import { shortenUserDisplayName } from './profileUtils';

export interface Conversation {
  id: number | string;
  address: string;
  displayName?: string;
  avatar?: string;
  lastMessage: string;
  timestamp: string;
  online: boolean;
  unread: number;
  isAIAgent: boolean;
  messages: ConversationMessage[];
  userInfo: {
    displayName: string;
    role: string;
    walletAddress: string | null;
    mutualHoldings?: any[];
    interactionHistory?: any[];
  };
}

export interface ConversationMessage {
  id: number;
  sender: 'me' | 'them';
  text: string;
  timestamp: string;
  read: boolean;
  conversationId: number | string;
  image?: any;
  isAI?: boolean;
}

// 🔒 PHASE 1 FIX: Address-based storage for privacy isolation
const LEGACY_CONVERSATIONS_KEY = 'orina_conversations'; // For migration
const LEGACY_MESSAGES_KEY = 'orina_messages';

/**
 * Get storage key for conversations (address-based)
 */
function getConversationsKey(walletAddress: string): string {
  return `orina_conversations_${walletAddress.toLowerCase()}`;
}

/**
 * Get storage key for messages (address-based)
 */
function getMessagesKey(walletAddress: string): string {
  return `orina_messages_${walletAddress.toLowerCase()}`;
}

/**
 * Load conversations for a specific wallet address
 * @param walletAddress - The wallet address to load conversations for
 */
export function loadConversations(walletAddress: string): Conversation[] {
  try {
    const key = getConversationsKey(walletAddress);
    const stored = localStorage.getItem(key);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('[Conversations] Failed to load:', error);
    return [];
  }
}

/**
 * Save conversations for a specific wallet address
 * @param walletAddress - The wallet address to save conversations for
 * @param conversations - The conversations to save
 */
export function saveConversations(walletAddress: string, conversations: Conversation[]): void {
  try {
    const key = getConversationsKey(walletAddress);
    localStorage.setItem(key, JSON.stringify(conversations));
  } catch (error) {
    console.error('[Conversations] Failed to save:', error);
  }
}

/**
 * Load messages for a specific wallet address
 * @param walletAddress - The wallet address to load messages for
 */
export function loadMessages(walletAddress: string): ConversationMessage[] {
  try {
    const key = getMessagesKey(walletAddress);
    const stored = localStorage.getItem(key);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('[Messages] Failed to load:', error);
    return [];
  }
}

/**
 * Save messages for a specific wallet address
 * @param walletAddress - The wallet address to save messages for
 * @param messages - The messages to save
 */
export function saveMessages(walletAddress: string, messages: ConversationMessage[]): void {
  try {
    const key = getMessagesKey(walletAddress);
    localStorage.setItem(key, JSON.stringify(messages));
  } catch (error) {
    console.error('[Messages] Failed to save:', error);
  }
}

/**
 * Find or create a conversation with a specific user
 * @param currentUserAddress - The current user's wallet address
 * @param targetUserAddress - The target user's wallet address
 * @param displayName - Display name for the target user
 * @param avatar - Avatar URL for the target user
 */
export function findOrCreateConversation(
  currentUserAddress: string,
  targetUserAddress: string,
  displayName: string,
  avatar?: string
): { conversation: Conversation; isNew: boolean } {
  const conversations = loadConversations(currentUserAddress);
  
  // Try to find existing conversation
  const existing = conversations.find(
    c => c.address.toLowerCase() === targetUserAddress.toLowerCase()
  );
  
  if (existing) {
    return { conversation: existing, isNew: false };
  }
  
  // Create new conversation
  const newConversation: Conversation = {
    id: Date.now(), // Use timestamp as ID
    address: targetUserAddress,
    displayName: displayName || shortenUserDisplayName(targetUserAddress),
    avatar: avatar,
    lastMessage: 'Start a conversation',
    timestamp: 'Just now',
    online: false,
    unread: 0,
    isAIAgent: false,
    messages: [],
    userInfo: {
      displayName: displayName || shortenUserDisplayName(targetUserAddress),
      role: 'Seller',
      walletAddress: targetUserAddress,
      mutualHoldings: [],
      interactionHistory: [
        { event: 'Conversation Started', date: new Date().toLocaleDateString(), isRecent: true }
      ]
    }
  };
  
  conversations.push(newConversation);
  saveConversations(currentUserAddress, conversations);
  
  return { conversation: newConversation, isNew: true };
}

/**
 * Add a message to a conversation
 * @param currentUserAddress - The current user's wallet address
 * @param conversationId - The conversation ID
 * @param messageText - The message text
 * @param sender - Who sent the message ('me' or 'them')
 */
export function addMessageToConversation(
  currentUserAddress: string,
  conversationId: number | string,
  messageText: string,
  sender: 'me' | 'them' = 'me'
): ConversationMessage {
  const messages = loadMessages(currentUserAddress);
  const conversations = loadConversations(currentUserAddress);
  
  const newMessage: ConversationMessage = {
    id: Date.now(),
    sender,
    text: messageText,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    read: true,
    conversationId,
  };
  
  // Add to messages
  messages.push(newMessage);
  saveMessages(currentUserAddress, messages);
  
  // Update conversation's last message
  const conversation = conversations.find(c => c.id === conversationId);
  if (conversation) {
    conversation.lastMessage = messageText;
    conversation.timestamp = 'Just now';
    saveConversations(currentUserAddress, conversations);
  }
  
  return newMessage;
}

/**
 * Get messages for a specific conversation
 * @param currentUserAddress - The current user's wallet address
 * @param conversationId - The conversation ID
 */
export function getConversationMessages(
  currentUserAddress: string,
  conversationId: number | string
): ConversationMessage[] {
  const messages = loadMessages(currentUserAddress);
  return messages.filter(m => m.conversationId === conversationId);
}

/**
 * Delete a conversation and its messages
 * @param currentUserAddress - The current user's wallet address
 * @param conversationId - The conversation ID to delete
 */
export function deleteConversation(
  currentUserAddress: string,
  conversationId: number | string
): void {
  const conversations = loadConversations(currentUserAddress);
  const messages = loadMessages(currentUserAddress);
  
  // Remove conversation
  const updatedConversations = conversations.filter(c => c.id !== conversationId);
  saveConversations(currentUserAddress, updatedConversations);
  
  // Remove messages
  const updatedMessages = messages.filter(m => m.conversationId !== conversationId);
  saveMessages(currentUserAddress, updatedMessages);
}

/**
 * Clear all conversations and messages for a specific wallet
 * @param currentUserAddress - The current user's wallet address
 */
export function clearAllConversations(currentUserAddress: string): void {
  const conversationsKey = getConversationsKey(currentUserAddress);
  const messagesKey = getMessagesKey(currentUserAddress);
  
  localStorage.removeItem(conversationsKey);
  localStorage.removeItem(messagesKey);
  
  console.log(`[Conversations] Cleared all conversations and messages for ${currentUserAddress}`);
}

/**
 * 🔄 MIGRATION: Migrate from legacy global storage to address-based storage
 * This should be called once per user on first load after upgrade
 * @param walletAddress - The wallet address to migrate data for
 */
export function migrateConversationsToAddressBased(walletAddress: string): void {
  try {
    console.log(`[Conversations Migration] Starting migration for ${walletAddress}`);
    
    // Check if already migrated
    const newConversationsKey = getConversationsKey(walletAddress);
    const existing = localStorage.getItem(newConversationsKey);
    if (existing && JSON.parse(existing).length > 0) {
      console.log(`[Conversations Migration] Already migrated (${JSON.parse(existing).length} conversations found)`);
      return;
    }
    
    // Load from legacy global storage
    const legacyConversations = localStorage.getItem(LEGACY_CONVERSATIONS_KEY);
    const legacyMessages = localStorage.getItem(LEGACY_MESSAGES_KEY);
    
    if (legacyConversations) {
      const allConversations: Conversation[] = JSON.parse(legacyConversations);
      
      // For now, migrate ALL conversations to this user
      // In a real scenario, you'd filter by ownership
      if (allConversations.length > 0) {
        saveConversations(walletAddress, allConversations);
        console.log(`[Conversations Migration] ✅ Migrated ${allConversations.length} conversations`);
      }
    }
    
    if (legacyMessages) {
      const allMessages: ConversationMessage[] = JSON.parse(legacyMessages);
      
      if (allMessages.length > 0) {
        saveMessages(walletAddress, allMessages);
        console.log(`[Conversations Migration] ✅ Migrated ${allMessages.length} messages`);
      }
    }
    
    console.log(`[Conversations Migration] ✅ Migration complete for ${walletAddress}`);
  } catch (error) {
    console.error('[Conversations Migration] Failed:', error);
  }
}
