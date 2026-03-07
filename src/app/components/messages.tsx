import { Search, Smile, Paperclip, Send, Copy, Diamond, Coins, Zap, Flag, ArrowRight, Bot, Sparkles, Star, Plus, AlertTriangle, X } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { getAvatarByUserId } from '@/app/components/user-avatars';
import { AIAgentClient } from '@/utils/aiAgentClient';
import { AIAgentTest } from '@/app/components/ai-agent-test';
import { shortenUserDisplayName } from '@/utils/profileUtils';
import { useUser } from '@/contexts/UserContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { NewConversationModal } from '@/app/components/new-conversation-modal';
import * as MessagesClient from '@/utils/messagesClient';
import { toast } from 'sonner';
import { loadReputationScore, loadRatings, calculateReputationScore, generateMockRatings, saveRatings } from '@/utils/reputationUtils';
import { loadUserActivities } from '@/utils/profileUtils';
import { buildNotificationSourceId } from '@/utils/notifications';
import {
  StudioSidebarShell,
  StudioSidebarHeader,
  StudioSidebarScroll,
  StudioSidebarFooter,
} from '@/app/components/ui/studio-sidebar';
import {
  CHAT_PRESENCE_ACTIVITY_WINDOW_MS_DEFAULT,
  resolveChatPresenceOnline,
  subscribeChatConversationList,
  subscribeChatConversationThread,
} from '@/utils/chatRealtimeAdapter';

// ✅ FIX: Local image attachment type (different from UploadedImage which requires IPFS fields)
interface AttachedImage {
  url: string;
  file?: File;
}

const CHAT_ACTIVITY_ONLINE_WINDOW_MS = CHAT_PRESENCE_ACTIVITY_WINDOW_MS_DEFAULT;
const CHAT_CONVERSATIONS_POLL_MS_FG = 2500;
const CHAT_CONVERSATIONS_POLL_MS_BG = 10000;
const CHAT_MESSAGES_POLL_MS_FG = 900;
const CHAT_CONVERSATIONS_POLL_BACKOFF_BASE_MS = 1500;
const CHAT_CONVERSATIONS_POLL_BACKOFF_MAX_MS = 12000;
const CHAT_MESSAGES_POLL_BACKOFF_BASE_MS = 800;
const CHAT_MESSAGES_POLL_BACKOFF_MAX_MS = 8000;

// Default conversations (keep only AI Agent test tab; legacy mock user chats removed for C6 cleanup)
const defaultConversations = [
  {
    id: 'ai-agent',
    address: 'AI Agent Test',
    displayName: 'AI Agent Test',
    AvatarComponent: null, // Will use Bot icon
    lastMessage: 'Test your AI Agent responses here',
    timestamp: 'Test Mode',
    online: true,
    unread: 0,
    isAIAgent: true,
    userInfo: {
      displayName: 'AI Agent Test',
      role: 'AI Sales Assistant',
      walletAddress: null,
      mutualHoldings: [],
      interactionHistory: [
        { event: 'Test Mode Active', date: 'Live Testing', isRecent: true }
      ]
    }
  }
];

const defaultMessages: any[] = [];

const initialMessagesByConversation = defaultMessages.reduce<Record<string, any[]>>((acc, msg) => {
  const key = String(msg.conversationId);
  acc[key] = [...(acc[key] || []), msg];
  return acc;
}, {});
const EMPTY_MESSAGES: any[] = [];
const emojiRows = [
  ['😀', '😊', '😆', '😂', '🤣', '😜', '😬', '😍', '😘'],
  ['🥰', '😎', '🤩', '👍', '✌️', '🤟', '👊', '♥️', '💕'],
  ['⭐', '✨', '⚽', '🏀', '🏈', '⚾', '👾', '🦄', '👻'],
  ['🤖', '🐻', '🐱', '👽', '💀', '🐯', '🐉', '🐵', '🐶'],
  ['💩', '🐴', '🐏', '🐇', '🐍', '🐔', '🐖', '🐭', '🐮'],
];

function computePollBackoffMs(streak: number, baseMs: number, maxMs: number): number {
  const normalizedStreak = Math.max(1, Math.min(streak, 6));
  return Math.min(maxMs, baseMs * Math.pow(2, normalizedStreak - 1));
}

interface MessagesProps {
  onNavigateToUserProfile?: (walletAddress: string) => void;
  onNavigateToPage?: (page: string) => void;
  initialConversationId?: string | null;
}

export function Messages({ onNavigateToUserProfile, onNavigateToPage, initialConversationId }: MessagesProps) {
  // ✅ Get wallet address for backend communication
  const { address } = useAccount();
  
  // Get user data from context
  const { userData } = useUser();
  const { addNotification } = useNotifications();
  
  // Fallback if user is not loaded yet
  const currentUser = userData || {
    username: 'User',
    displayName: '',
    avatarUrl: '',
    address: '0x000...000'
  };
  
  // State
  const [conversations, setConversations] = useState<any[]>(defaultConversations);
  const [activeConversation, setActiveConversation] = useState<number | string>(initialConversationId || 'ai-agent');
  const [messagesByConversation, setMessagesByConversation] = useState<Record<string, any[]>>(initialMessagesByConversation);
  const [userInput, setUserInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [aiAgentEnabled, setAIAgentEnabled] = useState<boolean | null>(null);
  const [attachedImage, setAttachedImage] = useState<AttachedImage | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isNewConversationModalOpen, setIsNewConversationModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const forceScrollOnNextRenderRef = useRef<boolean>(true);
  const shouldAutoScrollRef = useRef<boolean>(true);
  const messagesByConversationRef = useRef<Record<string, any[]>>(initialMessagesByConversation);
  const latestMessagesRequestRef = useRef<number>(0);
  const messagesLoadInFlightRef = useRef<null | { conversationId: string; silent: boolean }>(null);
  const conversationsLoadInFlightRef = useRef<boolean>(false);
  const chatEventRefreshTimerRef = useRef<number | null>(null);
  const lastConversationsPollAtRef = useRef<number>(0);
  const lastMessagesPollAtRef = useRef<number>(0);
  const conversationsPollErrorStreakRef = useRef<number>(0);
  const messagesPollErrorStreakRef = useRef<number>(0);
  const conversationsPollBackoffUntilRef = useRef<number>(0);
  const messagesPollBackoffUntilRef = useRef<number>(0);
  const chatNotificationBaselineReadyRef = useRef<boolean>(false);
  const chatUnreadSnapshotRef = useRef<Record<string, number>>({});
  
  // ✅ FIX: Track locally-added messages for demo conversations to prevent polling from clearing them
  const localMessagesRef = useRef<any[]>([]);
  // ✅ FIX: Cooldown after sending to prevent immediate poll overwrite for backend conversations
  const sendCooldownRef = useRef<number>(0);
  // ✅ FIX: Ref to always have the latest activeConversation for polling (prevents stale closure)
  const activeConversationRef = useRef<number | string>(activeConversation);
  activeConversationRef.current = activeConversation;
  // ✅ FIX: Ref for address to prevent stale closure in polling
  const addressRef = useRef(address);
  addressRef.current = address;
  // ✅ Report modal state
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportTarget, setReportTarget] = useState<{ name: string; address: string } | null>(null);
  const activeConversationKey = String(activeConversation);
  const conversationMessages = messagesByConversation[activeConversationKey] || EMPTY_MESSAGES;

  const setConversationMessagesFor = useCallback(
    (conversationId: string | number, updater: any[] | ((prev: any[]) => any[])) => {
      const key = String(conversationId);
      setMessagesByConversation((prev) => {
        const current = prev[key] || [];
        const next = typeof updater === 'function' ? (updater as (prev: any[]) => any[])(current) : updater;
        if (next === current) return prev;
        const updated = { ...prev, [key]: next };
        messagesByConversationRef.current = updated;
        return updated;
      });
    },
    []
  );

  useEffect(() => {
    messagesByConversationRef.current = messagesByConversation;
  }, [messagesByConversation]);

  useEffect(() => {
    chatNotificationBaselineReadyRef.current = false;
    chatUnreadSnapshotRef.current = {};
  }, [address]);
  
  // ✅ Get reputation score for active conversation partner
  const getPartnerReputation = useCallback((walletAddress: string | null): { score: number; reviewCount: number } => {
    if (!walletAddress) return { score: 4.9, reviewCount: 150 };
    try {
      const repScore = loadReputationScore(walletAddress);
      if (repScore) {
        const ratings = loadRatings(walletAddress);
        const scoreValue = repScore.overallScore ?? 0; // ✅ FIX: Use correct property name `overallScore` (not `overall`)
        return { 
          score: Math.round((scoreValue / 20) * 10) / 10, // Convert 0-100 to 0-5 scale
          reviewCount: ratings.length || Math.floor(scoreValue * 1.5)
        };
      }
      // Try to calculate
      const activities = loadUserActivities(walletAddress);
      let ratings = loadRatings(walletAddress);
      if (ratings.length === 0) {
        ratings = generateMockRatings(walletAddress, 10);
        saveRatings(walletAddress, ratings);
      }
      const calculated = calculateReputationScore(activities, ratings, [], 30, false);
      const avgRating = ratings.reduce((sum, r) => sum + (r.overallRating ?? 0), 0) / (ratings.length || 1); // ✅ FIX: Use correct property name `overallRating` (not `score`)
      return { 
        score: Math.round(avgRating * 10) / 10, 
        reviewCount: ratings.length 
      };
    } catch {
      return { score: 4.9, reviewCount: 150 };
    }
  }, []);
  
  // Helper function to render stars
  const renderStars = (count: number) => {
    return Array.from({ length: count }).map((_, i) => (
      <Star key={i} size={12} className="text-[#2CC295]" fill="currentColor" />
    ));
  };
  
  // Copy to clipboard with fallback
  const copyToClipboard = async (text: string) => {
    // Quick check: if in iframe or clipboard not available, use fallback immediately
    const isInIframe = window.self !== window.top;
    
    if (isInIframe || !navigator.clipboard || !navigator.clipboard.writeText) {
      // Use fallback directly
      return fallbackCopyMethod(text);
    }
    
    // Try modern Clipboard API first (silently)
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard!');
      return;
    } catch {
      // Silently fall back - don't log as this is expected when Permissions Policy blocks it
      fallbackCopyMethod(text);
    }
  };
  
  // Fallback copy method
  const fallbackCopyMethod = (text: string) => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      textArea.style.opacity = '0';
      textArea.style.pointerEvents = 'none';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        toast.success('Copied to clipboard!');
      } else {
        toast.error('Could not copy. Please copy manually.');
      }
    } catch (error) {
      console.error('All clipboard methods failed:', error);
      toast.error('Could not copy automatically. Text: ' + text);
    }
  };
  
  // Load conversations from backend (silent=true for polling to suppress toasts/loading)
  const loadBackendConversations = async (silent: boolean = false, force: boolean = false) => {
    const currentAddress = addressRef.current;
    if (!currentAddress) return;
    if (silent && conversationsLoadInFlightRef.current) return;
    if (silent && !force && conversationsPollBackoffUntilRef.current > Date.now()) return;
    
    try {
      conversationsLoadInFlightRef.current = true;
      if (!silent) setLoading(true);
      const backendConversations = await MessagesClient.getConversations(currentAddress);
      conversationsPollErrorStreakRef.current = 0;
      conversationsPollBackoffUntilRef.current = 0;
      
      // Transform backend conversations to UI format
      const transformed = backendConversations.map((conv: any) => {
        // Find the other participant
        const otherAddress = conv.participants.find(
          (p: string) => p.toLowerCase() !== currentAddress.toLowerCase()
        );
        
        const unreadCount = conv.unreadCount[currentAddress.toLowerCase()] || 0;
        const recentlyActive = resolveChatPresenceOnline({
          backendOnline: conv.online,
          lastMessageTime: conv.lastMessageTime || null,
          createdAt: conv.createdAt || null,
          activityWindowMs: CHAT_ACTIVITY_ONLINE_WINDOW_MS,
        });
        
        return {
          id: conv.id,
          address: otherAddress || '',
          displayName: conv.displayName || shortenUserDisplayName(otherAddress || ''),
          avatar: conv.avatar || undefined,
          AvatarComponent: getAvatarByUserId(otherAddress || ''),
          lastMessage: conv.lastMessage,
          timestamp: formatTimestamp(conv.lastMessageTime),
          // C6 currently has no true presence service; use backend flag if present,
          // otherwise fallback to recent-message activity as a practical online heuristic.
          online: recentlyActive,
          unread: unreadCount,
          isAIAgent: false,
          userInfo: {
            displayName: conv.displayName || shortenUserDisplayName(otherAddress || ''),
            role: 'Community Member',
            walletAddress: otherAddress || '',
            avatarUrl: conv.avatar || undefined,
            mutualHoldings: [],
            interactionHistory: [
              { event: 'Conversation Created', date: formatTimestamp(conv.createdAt), isRecent: true }
            ]
          }
        };
      });

      // Chat message notifications (C6 UX): trigger when unread count increases for the current wallet.
      // Dedupe is enforced by notifications sourceId (`conversation + lastMessageTime`).
      const nextUnreadSnapshot: Record<string, number> = {};
      for (let i = 0; i < transformed.length; i += 1) {
        const uiConv = transformed[i];
        const backendConv = backendConversations[i];
        if (!uiConv || !backendConv) continue;
        if (!uiConv.id || uiConv.id === 'ai-agent') continue;

        const unread = Number(uiConv.unread || 0);
        nextUnreadSnapshot[String(uiConv.id)] = unread;

        if (!chatNotificationBaselineReadyRef.current) continue;

        const prevUnread = Number(chatUnreadSnapshotRef.current[String(uiConv.id)] || 0);
        if (unread <= prevUnread || unread <= 0) continue;

        const otherAddress = String(uiConv.address || '').toLowerCase();
        const actorName =
          String(uiConv.displayName || '').trim() ||
          shortenUserDisplayName(otherAddress || '');
        const lastMessage = String(backendConv.lastMessage || '').trim() || 'Sent you a message';
        const lastMessageTime = String(backendConv.lastMessageTime || backendConv.createdAt || Date.now());
        const sourceId = buildNotificationSourceId('chat:message:new', [
          uiConv.id,
          lastMessageTime,
        ]);

        addNotification(
          'message',
          'New Message',
          `${actorName}: ${lastMessage}`,
          {
            sourceId,
            eventCode: 'chat:message:new',
            conversationId: String(uiConv.id),
            actorAddress: otherAddress,
            actorName,
            action: 'open_chat_thread',
            actionPage: 'messages',
          } as any
        );
      }
      chatUnreadSnapshotRef.current = nextUnreadSnapshot;
      chatNotificationBaselineReadyRef.current = true;
      
      // Merge with default conversations (AI Agent, demo conversations)
      const merged = [...transformed, ...defaultConversations];
      setConversations(merged);

      // Reconcile active conversation with the latest backend list.
      // This prevents the thread pane from staying on a stale/deleted UUID after DB reset or cleanup.
      setActiveConversation((prev) => {
        if (prev === 'ai-agent' || typeof prev === 'number') return prev;
        const stillExists = transformed.some((c: any) => c.id === prev);
        if (stillExists) return prev;
        if (transformed.length > 0) return transformed[0].id;
        return 'ai-agent';
      });
    } catch (error) {
      console.error('[Messages] Load conversations error:', error);
      if (silent) {
        conversationsPollErrorStreakRef.current += 1;
        const backoffMs = computePollBackoffMs(
          conversationsPollErrorStreakRef.current,
          CHAT_CONVERSATIONS_POLL_BACKOFF_BASE_MS,
          CHAT_CONVERSATIONS_POLL_BACKOFF_MAX_MS
        );
        conversationsPollBackoffUntilRef.current = Date.now() + backoffMs;
      }
      if (!silent) {
        const msg =
          error instanceof Error
            ? error.message
            : 'Failed to load conversations';
        toast.error(`Failed to load conversations: ${msg}`);
      }
    } finally {
      conversationsLoadInFlightRef.current = false;
      if (!silent) setLoading(false);
    }
  };
  
  // Load messages for active conversation (silent=true for polling to suppress toasts)
  const loadBackendMessages = async (conversationId: string | number, silent: boolean = false, force: boolean = false) => {
    const conversationKey = String(conversationId);

    // Prevent overlapping silent polls for the same conversation.
    // Without this, polling every 900ms can continuously invalidate in-flight responses
    // via latestMessagesRequestRef and create "messages appear after minutes" symptoms.
    if (
      silent &&
      messagesLoadInFlightRef.current &&
      messagesLoadInFlightRef.current.conversationId === conversationKey
    ) {
      return;
    }

    const requestId = ++latestMessagesRequestRef.current;
    const cacheKey = conversationKey;

    // Skip polling reload during send cooldown, but allow user-initiated loads (tab switch)
    if (silent && !force && sendCooldownRef.current > Date.now()) {
      console.log('[Messages] Skipping poll refresh - send cooldown active');
      return;
    }
    if (silent && !force && messagesPollBackoffUntilRef.current > Date.now()) {
      return;
    }
    
    const currentAddress = addressRef.current;
    
    if (conversationId === 'ai-agent' || typeof conversationId === 'number') {
      // ✅ FIX: For demo conversations, merge default messages with locally-added messages
      const filtered = defaultMessages.filter(m => m.conversationId === conversationId);
      const localForConv = localMessagesRef.current.filter(m => m.conversationId === conversationId);
      
      // Merge and deduplicate
      const allMessages = [...filtered, ...localForConv];
      setConversationMessagesFor(conversationId, allMessages);
      return;
    }

    // Do not overwrite real conversation messages when wallet address is temporarily unavailable
    if (!currentAddress) {
      return;
    }
    
    try {
      messagesLoadInFlightRef.current = { conversationId: conversationKey, silent };
      console.log('[Messages] Loading messages for conversation:', conversationId);
      const result = await MessagesClient.getMessages(String(conversationId), currentAddress);
      messagesPollErrorStreakRef.current = 0;
      messagesPollBackoffUntilRef.current = 0;
      
      // ✅ FIX: Guard against stale response - only update if this conversation is still active
      if (activeConversationRef.current !== conversationId || latestMessagesRequestRef.current !== requestId) {
        console.log('[Messages] Discarding stale response for conversation:', conversationId);
        return;
      }
      
      console.log('[Messages] Received messages:', result.messages);

      // If backend reports the conversation no longer exists (e.g. reset/deleted),
      // clear stale UI cache for that thread instead of preserving old local state.
      if (!result.conversation) {
        setConversationMessagesFor(conversationId, []);
        return;
      }
      
      // Transform backend messages to UI format
      const transformed = result.messages.map((msg: any) => {
        const isSender = msg.sender.toLowerCase() === currentAddress.toLowerCase();
        return {
          id: msg.id,
          sender: isSender ? 'me' : 'them',
          AvatarComponent: isSender ? getAvatarByUserId(currentAddress) : getAvatarByUserId(msg.sender),
          text: msg.text,
          timestamp: formatTimestamp(msg.timestamp),
          read: msg.read,
          conversationId: conversationId, // ✅ Use the activeConversation ID, not msg.conversationId
          image: msg.image,
          isAI: msg.isAI
        };
      });

      // Prevent transient empty poll responses from wiping visible chat content.
      // Only keep old content during a short post-send cooldown.
      const cachedForConversation = messagesByConversationRef.current[cacheKey] || [];
      if (
        silent &&
        sendCooldownRef.current > Date.now() &&
        transformed.length === 0 &&
        cachedForConversation.length > 0
      ) {
        return;
      }
      
      console.log('[Messages] Transformed messages:', transformed);
      setConversationMessagesFor(conversationId, (prev) => {
        const confirmedPrev = prev.filter(
          (msg: any) => !String(msg.id).startsWith('temp_')
        );

        // Guard against transient stale/partial poll snapshots overwriting a newer local view.
        // Symptom observed by users: incoming message appears late because one poll shrinks list to an older server snapshot.
        if (silent && transformed.length > 0 && confirmedPrev.length > transformed.length) {
          const confirmedPrevIds = new Set(confirmedPrev.map((msg: any) => String(msg.id)));
          const transformedIdsAreKnown = transformed.every((msg: any) =>
            confirmedPrevIds.has(String(msg.id))
          );
          if (transformedIdsAreKnown) {
            console.log('[Messages] Skipping stale partial poll snapshot (list shrink detected)');
            return prev;
          }
        }

        const optimisticForConversation = prev.filter(
          (msg: any) => String(msg.id).startsWith('temp_')
        );

        const unresolvedOptimistic = optimisticForConversation.filter((optimistic: any) => {
          return !transformed.some((serverMsg: any) => {
            return (
              serverMsg.sender === 'me' &&
              serverMsg.text === optimistic.text &&
              (serverMsg.image?.url || '') === (optimistic.image?.url || '')
            );
          });
        });

        const mergedMessages = [...transformed, ...unresolvedOptimistic];

        const sameLength = prev.length === mergedMessages.length;
        if (
          sameLength &&
          prev.every((msg, index) => {
            const next = mergedMessages[index];
            return (
              msg.id === next.id &&
              msg.sender === next.sender &&
              msg.text === next.text &&
              msg.timestamp === next.timestamp &&
              msg.read === next.read &&
              msg.conversationId === next.conversationId &&
              msg.isAI === next.isAI &&
              msg.image?.url === next.image?.url
            );
          })
        ) {
          return prev;
        }
        return mergedMessages;
      });
    } catch (error) {
      console.error('[Messages] Load messages error:', error);
      if (silent) {
        messagesPollErrorStreakRef.current += 1;
        const backoffMs = computePollBackoffMs(
          messagesPollErrorStreakRef.current,
          CHAT_MESSAGES_POLL_BACKOFF_BASE_MS,
          CHAT_MESSAGES_POLL_BACKOFF_MAX_MS
        );
        messagesPollBackoffUntilRef.current = Date.now() + backoffMs;
      }
      if (!silent) toast.error('Failed to load messages');
    } finally {
      if (messagesLoadInFlightRef.current?.conversationId === conversationKey) {
        messagesLoadInFlightRef.current = null;
      }
    }
  };
  
  // Format timestamp to human-readable format
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Load conversations on mount and when address changes
  useEffect(() => {
    loadBackendConversations();
    
    // Poll conversation list (C6.3.2.1 visibility-aware: keep slower background cadence)
    const conversationsInterval = setInterval(() => {
      const now = Date.now();
      const isVisible = typeof document === 'undefined' || document.visibilityState === 'visible';
      const minCadence = isVisible ? CHAT_CONVERSATIONS_POLL_MS_FG : CHAT_CONVERSATIONS_POLL_MS_BG;
      if (now - lastConversationsPollAtRef.current < minCadence) return;
      if (conversationsLoadInFlightRef.current) return;
      if (conversationsPollBackoffUntilRef.current > now) return;
      lastConversationsPollAtRef.current = now;
      loadBackendConversations(true); // silent=true for polling
    }, CHAT_CONVERSATIONS_POLL_MS_FG);

    // Poll active conversation messages (C6.3.2.1 visibility-aware: foreground only)
    const messagesInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return;
      }
      const currentActive = activeConversationRef.current;
      if (!currentActive) return;
      const now = Date.now();
      if (now - lastMessagesPollAtRef.current < CHAT_MESSAGES_POLL_MS_FG) return;
      if (sendCooldownRef.current > now) return;
      if (messagesPollBackoffUntilRef.current > now) return;
      if (
        messagesLoadInFlightRef.current &&
        messagesLoadInFlightRef.current.conversationId === String(currentActive)
      ) {
        return;
      }
      lastMessagesPollAtRef.current = now;
      loadBackendMessages(currentActive, true); // silent=true for polling
    }, CHAT_MESSAGES_POLL_MS_FG);
    
    return () => {
      clearInterval(conversationsInterval);
      clearInterval(messagesInterval);
    };
  }, [address]);

  // C6.3.1: chat invalidation events (no-payload bus). Coalesce rapid emits (send/create/read)
  // to avoid duplicate polling requests and keep sidebar/thread in sync across chat entry points.
  useEffect(() => {
    const scheduleChatRefresh = () => {
      if (typeof window === 'undefined') return;
      if (chatEventRefreshTimerRef.current) {
        window.clearTimeout(chatEventRefreshTimerRef.current);
      }

      chatEventRefreshTimerRef.current = window.setTimeout(() => {
        chatEventRefreshTimerRef.current = null;
        loadBackendConversations(true, true);
        const currentActive = activeConversationRef.current;
        if (currentActive) {
          loadBackendMessages(currentActive, true, true);
        }
      }, 120);
    };

    const onConversationsChanged = () => scheduleChatRefresh();
    const onMessagesChanged = () => scheduleChatRefresh();
    const onReadStateChanged = () => scheduleChatRefresh();

    window.addEventListener(MessagesClient.CHAT_CONVERSATIONS_CHANGED_EVENT, onConversationsChanged);
    window.addEventListener(MessagesClient.CHAT_MESSAGES_CHANGED_EVENT, onMessagesChanged);
    window.addEventListener(MessagesClient.CHAT_READ_STATE_CHANGED_EVENT, onReadStateChanged);

    return () => {
      window.removeEventListener(MessagesClient.CHAT_CONVERSATIONS_CHANGED_EVENT, onConversationsChanged);
      window.removeEventListener(MessagesClient.CHAT_MESSAGES_CHANGED_EVENT, onMessagesChanged);
      window.removeEventListener(MessagesClient.CHAT_READ_STATE_CHANGED_EVENT, onReadStateChanged);
      if (chatEventRefreshTimerRef.current) {
        window.clearTimeout(chatEventRefreshTimerRef.current);
        chatEventRefreshTimerRef.current = null;
      }
    };
  }, [activeConversation]);

  // C6.3.2.3: realtime/presence adapter boundary (polling fallback-safe)
  // Default adapter is no-op; future realtime implementation can invalidate via callbacks.
  useEffect(() => {
    if (!address) return;

    const unsubscribe = subscribeChatConversationList(address, () => {
      if (typeof window === 'undefined') return;
      window.dispatchEvent(new Event(MessagesClient.CHAT_CONVERSATIONS_CHANGED_EVENT));
    });

    return () => unsubscribe();
  }, [address]);

  useEffect(() => {
    if (!activeConversation || activeConversation === 'ai-agent' || typeof activeConversation === 'number') {
      return;
    }

    const conversationId = String(activeConversation);
    const unsubscribe = subscribeChatConversationThread(conversationId, () => {
      if (typeof window === 'undefined') return;
      window.dispatchEvent(new Event(MessagesClient.CHAT_MESSAGES_CHANGED_EVENT));
    });

    return () => unsubscribe();
  }, [activeConversation]);
  
  // Load messages when active conversation changes
  useEffect(() => {
    if (activeConversation) {
      // Force jump to latest message when switching conversation tab
      forceScrollOnNextRenderRef.current = true;
      shouldAutoScrollRef.current = true;
      setShowEmojiPicker(false);
      loadBackendMessages(activeConversation); // NOT silent - user-initiated
    }
  }, [activeConversation, address]);

  // Allow external navigation (e.g. notification click) to switch the active thread after mount.
  useEffect(() => {
    if (!initialConversationId) return;
    const target = String(initialConversationId);
    if (!target || target === 'ai-agent') return;

    // If a wallet address is passed, resolve to a loaded conversation UUID when possible.
    if (target.startsWith('0x')) {
      const matched = conversations.find(
        (c) => String(c.address || '').toLowerCase() === target.toLowerCase()
      );
      if (matched?.id) {
        setActiveConversation((prev) => (prev === matched.id ? prev : matched.id));
      }
      return;
    }

    setActiveConversation((prev) => (prev === target ? prev : target));
  }, [initialConversationId, conversations]);

  // Check if AI Agent is enabled for this seller
  useEffect(() => {
    if (!address) return; // ✅ Don't check if no wallet connected
    
    const checkAIAgent = async () => {
      const config = await AIAgentClient.getConfig(address); // ✅ Use current user's address
      setAIAgentEnabled(config?.enabled || false);
    };
    checkAIAgent();
  }, [address]); // ✅ Reload when wallet address changes

  const handleSendMessage = async () => {
    // Must have either text or image
    if ((!userInput.trim() && !attachedImage) || sendingMessage || !address) return;

    const messageText = userInput.trim();
    
    // Clear input immediately for better UX
    setUserInput('');
    setAttachedImage(null);
    setShowEmojiPicker(false);

    // For AI Agent or demo conversations, use old logic
    if (activeConversation === 'ai-agent' || typeof activeConversation === 'number') {
      const newMessage = {
        id: conversationMessages.length + 1,
        sender: 'me',
        AvatarComponent: getAvatarByUserId(18),
        text: messageText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: true,
        conversationId: activeConversation,
        image: attachedImage
      };

      // ✅ FIX: Also store in localMessagesRef so polling doesn't clear it
      localMessagesRef.current = [...localMessagesRef.current, newMessage];
      setConversationMessagesFor(activeConversation, (prev) => [...prev, newMessage]);

      // AI Agent logic - ONLY show typing indicator for AI responses
      if (aiAgentEnabled && messageText && activeConversation !== 'ai-agent') {
        setSendingMessage(true); // ✅ Show typing indicator ONLY for AI response
        
        try {
          const aiResponse = await AIAgentClient.sendMessage(
            address, // ✅ Use current user's address
            messageText,
            `conv_${activeConversation}`
          );

          if (aiResponse) {
            setTimeout(() => {
              const aiMsg = {
                id: `ai_${Date.now()}`,
                sender: 'them',
                AvatarComponent: getAvatarByUserId(1),
                text: aiResponse.content,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                read: true,
                conversationId: activeConversation,
                isAI: true
              };
              // ✅ FIX: Also store AI response in local ref
              localMessagesRef.current = [...localMessagesRef.current, aiMsg];
              setConversationMessagesFor(activeConversation, (prev) => [...prev, aiMsg]);
              setSendingMessage(false);
            }, 1000);
          } else {
            setSendingMessage(false);
          }
        } catch (error) {
          console.error('AI Agent error:', error);
          setSendingMessage(false);
        }
      }
      return;
    }

    // For real backend conversations - OPTIMISTIC UPDATE
    let optimisticMessageId = '';
    try {
      // Find the active conversation to get receiver address
      const activeConv = conversations.find(c => c.id === activeConversation);
      if (!activeConv || !activeConv.address) {
        toast.error('Conversation not found');
        return;
      }

      const receiverAddress = activeConv.address;

      // ✅ OPTIMISTIC UPDATE - Show message immediately
      optimisticMessageId = `temp_${Date.now()}`;
      const optimisticMessage = {
        id: optimisticMessageId,
        sender: 'me',
        AvatarComponent: getAvatarByUserId(address),
        text: messageText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: true,
        conversationId: activeConversation,
        image: attachedImage
      };
      
      setConversationMessagesFor(activeConversation, (prev) => [...prev, optimisticMessage]);

      // Briefly suppress poll overwrite while backend catches up (C6 polling baseline)
      sendCooldownRef.current = Date.now() + 2500;

      // Send message to backend in background
      await MessagesClient.sendMessage(
        address,
        receiverAddress,
        messageText,
        attachedImage ? { url: attachedImage.url } : undefined
      );

      // ❌ NO toast notification - instant UX!

      // Trigger a fast sync; optimistic message stays visible until backend confirms it
      await loadBackendMessages(activeConversation, true);
      await loadBackendConversations(true);
      
    } catch (error) {
      console.error('[Messages] Send message error:', error);
      toast.error('Failed to send message');
      sendCooldownRef.current = 0;
      // Restore input on error
      setUserInput(messageText);
      // Remove failed optimistic message
      if (optimisticMessageId) {
        setConversationMessagesFor(activeConversation, (prev) =>
          prev.filter((msg: any) => msg.id !== optimisticMessageId)
        );
      }
    }
  };

  const handleTyping = () => {
    // No need to handle typing for AI Agent
  };

  const handleEmojiSelect = (emoji: string) => {
    setUserInput(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  // Close emoji picker on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        showEmojiPicker &&
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(e.target as Node) &&
        emojiButtonRef.current &&
        !emojiButtonRef.current.contains(e.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker]);

  const isNearBottom = (threshold: number = 80) => {
    const container = messagesContainerRef.current;
    if (!container) return true;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    return distanceFromBottom <= threshold;
  };

  const scrollToBottom = (smooth: boolean = true) => {
    const element = messagesEndRef.current;
    if (!element) return;

    // Use requestAnimationFrame to ensure DOM is fully updated
    requestAnimationFrame(() => {
      element.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'end' });
    });
  };

  const handleMessagesScroll = useCallback(() => {
    shouldAutoScrollRef.current = isNearBottom(120);
  }, []);

  // Auto scroll when messages change
  useEffect(() => {
    if (forceScrollOnNextRenderRef.current) {
      scrollToBottom(false);
      forceScrollOnNextRenderRef.current = false;
      shouldAutoScrollRef.current = true;
      return;
    }

    // Auto-scroll only if user is already following latest messages.
    if (shouldAutoScrollRef.current) {
      scrollToBottom();
    }
  }, [conversationMessages]);
  
  // Also scroll on visibility change (tab becomes visible)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // C6.3.2.1: force foreground refresh before next polling ticks
        // so sidebar/thread catch up immediately after tab resumes.
        lastConversationsPollAtRef.current = Date.now();
        lastMessagesPollAtRef.current = Date.now();
        loadBackendConversations(true, true);
        const currentActive = activeConversationRef.current;
        if (currentActive) {
          loadBackendMessages(currentActive, true, true);
        }
        // Scroll when tab becomes visible
        requestAnimationFrame(() => scrollToBottom(false));
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Handle create new conversation
  const handleCreateConversation = async (walletAddress: string, displayName?: string) => {
    if (!address) {
      toast.error('Please connect your wallet first');
      return;
    }

    try {
      // Create (or get) direct conversation and use the real backend UUID.
      // Do not synthesize `conv_<a>_<b>` IDs because C5/C6 storage is UUID-based.
      const conversation = await MessagesClient.createConversation(
        address,
        walletAddress,
        displayName
      );

      // Reload conversations to show the new one
      await loadBackendConversations();
      setActiveConversation(conversation.id);
      setConversationMessagesFor(conversation.id, []);
      await loadBackendMessages(conversation.id, true);

      toast.success('Conversation created!');
    } catch (error) {
      console.error('[Messages] Create conversation error:', error);
      toast.error('Failed to create conversation');
    }
  };

  return (
    <>
      <style>{`
        .hidden-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      <section className="h-full bg-ui-page overflow-hidden">
        <div className="h-full flex overflow-hidden">
        <div className="flex-1 min-w-0 p-2.5 pr-0 overflow-hidden">
        <div className="h-full min-w-0 rounded-[24px] bg-[var(--t-card-bg)] backdrop-blur-[6px] overflow-hidden flex">
        {/* Conversations Sidebar */}
        <div className="w-[300px] border-r border-[var(--t-border-subtle)] flex flex-col bg-transparent">
          {/* Header */}
          <div className="p-4 border-b border-[var(--t-border-subtle)] bg-transparent">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Messages</h2>
              <button
                onClick={() => {
                  if (!address) {
                    toast.error('Please connect your wallet first');
                    return;
                  }
                  setIsNewConversationModalOpen(true);
                }}
                className="w-10 h-10 bg-[#2CC295] hover:bg-[#2CC295]/90 text-black rounded-full flex items-center justify-center transition-all hover:scale-105 shrink-0"
                title="New Conversation"
              >
                <Plus size={18} strokeWidth={3} />
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
              <input
                className="w-full bg-[rgba(18,18,18,0.5)] border border-[rgba(255,255,255,0.1)] rounded-[999px] pl-9 pr-4 py-2 text-xs text-[#F1F5F9] focus:ring-[#2CC295] focus:border-[#2CC295] placeholder:text-[rgba(203,213,225,0.5)]"
                placeholder="Search conversations"
                type="text"
              />
            </div>
          </div>

          {/* Conversations */}
          <div className="flex-grow overflow-y-auto hidden-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setActiveConversation(conv.id)}
                className={`p-3 border-b border-[var(--t-border-subtle)] cursor-pointer transition-colors ${
                  activeConversation === conv.id
                    ? 'bg-[#2CC295]/5 border-l-2 border-l-[#2CC295]'
                    : 'hover:bg-white/[0.02]'
                }`}
              >
                <div className="flex gap-2">
                  <div className="relative flex-shrink-0">
                    <div className={`w-10 h-10 rounded-full border overflow-hidden flex items-center justify-center ${
                      conv.isAIAgent 
                        ? 'bg-gradient-to-br from-[#2CC295] to-[#1a9d6f] border-[#2CC295]/50' 
                        : 'bg-zinc-800 border-[#27272a]'
                    }`}>
                      {conv.isAIAgent ? (
                        <Bot className="text-white" size={20} />
                      ) : (() => {
                        // Dynamically get avatar component based on address or use stored one
                        const AvatarComp = conv.AvatarComponent || getAvatarByUserId(conv.address || conv.id);
                        return conv.avatar ? (
                          <img src={conv.avatar} alt={conv.displayName} className="w-full h-full object-cover" />
                        ) : (
                          <AvatarComp className="w-full h-full" />
                        );
                      })()}
                    </div>
                    {conv.isAIAgent ? (
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-2 border-[#1a1a1c] rounded-full bg-[#2CC295]"></div>
                    ) : (
                      <div
                        className={`absolute bottom-0 right-0 w-2.5 h-2.5 border-2 border-[#1a1a1c] rounded-full ${
                          conv.online ? 'bg-[#2CC295]' : 'bg-zinc-600'
                        }`}
                      ></div>
                    )}
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white truncate">
                          {conv.displayName || shortenUserDisplayName(conv.address)}
                        </span>
                        {conv.isAIAgent && (
                          <Sparkles className="text-[#2CC295] flex-shrink-0" size={10} />
                        )}
                      </div>
                      <span className={`text-[9px] ${
                        conv.isAIAgent ? 'text-[#2CC295] font-bold' : 'text-zinc-500'
                      }`}>{conv.timestamp}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <p
                        className={`text-[11px] truncate font-medium ${
                          conv.unread > 0 ? 'text-zinc-400' : 'text-zinc-500'
                        }`}
                      >
                        {conv.lastMessage}
                      </p>
                      {conv.unread > 0 && (
                        <span className="w-1.5 h-1.5 bg-[#2CC295] rounded-full flex-shrink-0 ml-2"></span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        {activeConversation === 'ai-agent' ? (
          /* AI Agent Test Interface */
          <div className="flex-1 flex overflow-hidden">
            <AIAgentTest sellerAddress={address || ''} />
          </div>
        ) : (
          /* Normal Chat Interface */
          <div className="flex-1 flex flex-col overflow-hidden bg-transparent relative">
            {/* Chat Header */}
            <div className="p-5 border-b border-[var(--t-border-subtle)] flex items-center justify-between bg-[rgba(18,18,18,0.5)] backdrop-blur-[6px] flex-shrink-0 relative">
              {(() => {
                const activeConv = conversations.find(c => c.id === activeConversation);
                const AvatarComp = activeConv?.AvatarComponent;
                const displayName = activeConv?.displayName || shortenUserDisplayName(activeConv?.address || '');
                const isOnline = activeConv?.online || false;
                
                return (
                  <>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-zinc-800 border border-[#27272a] overflow-hidden flex items-center justify-center">
                        {activeConv?.avatar ? (
                          <img src={activeConv.avatar} alt={displayName} className="w-full h-full object-cover" />
                        ) : AvatarComp ? (
                          <AvatarComp className="w-full h-full" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-[#2CC295] to-[#1a9d6f] flex items-center justify-center text-white font-bold">
                            {displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          {displayName}
                          {aiAgentEnabled && (
                            <span className="w-5 h-5 bg-[#2CC295]/10 text-[#2CC295] border border-[#2CC295]/20 rounded flex items-center justify-center" title="AI Agent Active">
                              <Bot size={12} />
                            </span>
                          )}
                        </h3>
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-[#2CC295]' : 'bg-zinc-600'}`}></span>
                          <span className={`text-[10px] uppercase font-bold tracking-widest ${isOnline ? 'text-[#2CC295]' : 'text-zinc-500'}`}>{isOnline ? 'Online' : 'Offline'}</span>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Messages */}
            <div ref={messagesContainerRef} onScroll={handleMessagesScroll} className="flex-1 overflow-y-auto p-6 pb-24 space-y-6 hidden-scrollbar min-h-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {/* Date Divider */}
              <div className="flex justify-center">
                <span className="text-[10px] px-3 py-1 bg-[rgba(255,255,255,0.02)] border-0 rounded-full text-zinc-500 uppercase tracking-widest font-bold">
                  Today
                </span>
              </div>

              {/* Message Bubbles */}
              {(() => {
                const activeConv = conversations.find(c => c.id === activeConversation);
                // Get avatar component for the active conversation
                const ConvAvatarComp = activeConv?.AvatarComponent || (activeConv?.address ? getAvatarByUserId(activeConv.address) : null);
                
                return conversationMessages.map((message) =>
                  message.sender !== 'me' ? (
                    <div key={message.id} className="flex items-end gap-3 max-w-[80%]">
                      <div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0 self-end">
                        {activeConv?.avatar ? (
                          <img src={activeConv.avatar} alt="User" className="w-full h-full object-cover" />
                        ) : ConvAvatarComp ? (
                          <ConvAvatarComp className="w-full h-full" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-zinc-700 to-zinc-600 flex items-center justify-center text-white text-xs font-bold">
                            {activeConv?.displayName?.charAt(0).toUpperCase() || 'U'}
                          </div>
                        )}
                      </div>
                      <div className="bg-white/[0.05] backdrop-blur-lg border border-white/10 p-4 rounded-2xl rounded-bl-none">
                        {message.image && (
                          <div className="mb-2">
                            <div className="w-[220px] sm:w-[260px] aspect-[4/3] rounded-lg overflow-hidden border border-white/10 bg-zinc-900/50">
                              <img src={message.image.url} alt="Attached" className="w-full h-full object-cover" />
                            </div>
                          </div>
                        )}
                        <p className="text-sm text-zinc-200 leading-relaxed">{message.text}</p>
                        <span className="text-[10px] text-zinc-500 mt-1 block">{message.timestamp}</span>
                        {message.isAI && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-[#2CC295]" title="AI Agent Response">
                            <Bot size={12} />
                            <span>AI Agent</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div key={message.id} className="flex flex-row-reverse items-end gap-3 max-w-[80%] ml-auto">
                      <div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0 self-end">
                        {currentUser.avatarUrl ? (
                          <img src={currentUser.avatarUrl} alt={currentUser.displayName || currentUser.username} className="w-full h-full object-cover" />
                        ) : (() => {
                          // Use SVG avatar system for current user
                          const CurrentUserAvatar = getAvatarByUserId(currentUser.address || 'default');
                          return <CurrentUserAvatar className="w-full h-full" />;
                        })()}
                      </div>
                      <div className="bg-[#2CC295]/15 backdrop-blur-lg border border-[#2CC295]/20 p-4 rounded-2xl rounded-br-none">
                        {message.image && (
                          <div className="mb-2">
                            <div className="w-[220px] sm:w-[260px] aspect-[4/3] rounded-lg overflow-hidden border border-[#2CC295]/20 bg-zinc-900/50">
                              <img src={message.image.url} alt="Attached" className="w-full h-full object-cover" />
                            </div>
                          </div>
                        )}
                        <p className="text-sm text-white leading-relaxed break-words whitespace-pre-wrap">{message.text}</p>
                        <div className="flex items-center justify-end gap-1 mt-2">
                          <span className="text-[10px] text-[#2CC295]/70">{message.timestamp}</span>
                          <svg className="w-3.5 h-3.5 text-[#2CC295]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13l4 4L23 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  )
                );
              })()}

              {/* Typing Indicator */}
              {sendingMessage && (() => {
                const activeConv = conversations.find(c => c.id === activeConversation);
                const ConvAvatarComp = activeConv?.AvatarComponent || (activeConv?.address ? getAvatarByUserId(activeConv.address) : null);
                
                return (
                  <div className="flex items-end gap-3 max-w-[80%]">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0 self-end">
                      {activeConv?.avatar ? (
                        <img src={activeConv.avatar} alt="User" className="w-full h-full object-cover" />
                      ) : ConvAvatarComp ? (
                        <ConvAvatarComp className="w-full h-full" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-zinc-700 to-zinc-600 flex items-center justify-center text-white text-xs font-bold">
                          {activeConv?.displayName?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      )}
                    </div>
                    <div className="bg-white/[0.05] backdrop-blur-lg border border-white/10 p-4 rounded-2xl rounded-bl-none">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Auto-scroll anchor */}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-6 border-t border-[var(--t-border-subtle)] bg-[rgba(18,18,18,0.5)] backdrop-blur-[6px]">
              <div className="flex items-center gap-4 max-w-4xl mx-auto w-full">
                <div className="flex-grow relative">
                  <input
                    className="w-full bg-[rgba(18,18,18,0.5)] border border-[rgba(255,255,255,0.1)] rounded-xl px-4 py-3 pr-20 text-sm text-[#F1F5F9] focus:ring-[#2CC295] focus:border-[#2CC295] placeholder:text-[rgba(203,213,225,0.5)]"
                    placeholder="Type a secure message..."
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    onFocus={handleTyping}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-2">
                    <button
                      ref={emojiButtonRef}
                      className={`transition-colors ${showEmojiPicker ? 'text-[#2CC295]' : 'text-zinc-500 hover:text-white'}`}
                      onClick={() => setShowEmojiPicker(prev => !prev)}
                      type="button"
                    >
                      <Smile size={18} />
                    </button>
                    <button className="text-zinc-500 hover:text-white transition-colors" onClick={() => fileInputRef.current?.click()}>
                      <Paperclip size={18} />
                    </button>
                  </div>
                  {/* Emoji Picker - anchored inside input wrapper to prevent overflow */}
                  {showEmojiPicker && (
                    <div
                      ref={emojiPickerRef}
                      className="absolute bottom-full right-0 mb-2 bg-[#121212] border border-[rgba(255,255,255,0.08)] rounded-xl p-3 shadow-2xl shadow-black/70 backdrop-blur-[20px] z-[120]"
                    >
                      <div className="flex flex-col gap-1.5">
                        {emojiRows.map((row, rowIdx) => (
                          <div key={rowIdx} className="flex gap-1">
                              {row.map((emoji) => (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() => handleEmojiSelect(emoji)}
                                  className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-xl cursor-pointer"
                                >
                                  {emoji}
                                </button>
                              ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  className="w-11 h-11 bg-[#2CC295] text-black rounded-full flex items-center justify-center hover:shadow-lg hover:shadow-[#2CC295]/20 hover:scale-105 transition-all flex-shrink-0"
                  onClick={handleSendMessage}
                >
                  <Send size={18} />
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      const url = event.target?.result as string;
                      setAttachedImage({ url, file });
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </div>
          </div>
        )}
        </div>
        </div>

        {/* User Info Sidebar */}
        <StudioSidebarShell widthClassName="w-[344px]" className="bg-ui-page border-l-0 p-2.5">
        <div className="h-full rounded-[24px] bg-[var(--t-card-bg)] backdrop-blur-[6px] flex flex-col overflow-hidden">
          {(() => {
            const activeConv = conversations.find(c => c.id === activeConversation);
            const userInfo = activeConv?.userInfo;
            const AvatarComp = activeConv?.AvatarComponent;
            const isAIAgent = activeConv?.isAIAgent;

            if (!userInfo) return null;

            return (
              <>
                {/* User Profile */}
                <StudioSidebarHeader className="p-5 text-center border-b border-[var(--t-border-subtle)]">
                  <div className={`w-16 h-16 rounded-full border-2 mx-auto mb-3 overflow-hidden flex items-center justify-center ${
                    isAIAgent 
                      ? 'bg-gradient-to-br from-[#2CC295] to-[#1a9d6f] border-[#2CC295]/50'
                      : 'bg-zinc-800 border-[#27272a]'
                  }`}>
                    {userInfo.avatarUrl ? (
                      <img src={userInfo.avatarUrl} alt={userInfo.displayName} className="w-full h-full object-cover" />
                    ) : AvatarComp ? (
                      <AvatarComp className="w-full h-full" />
                    ) : (
                      <Bot className="text-white" size={32} />
                    )}
                  </div>
                  <h3 className="text-white font-bold text-sm">{userInfo.displayName}</h3>
                  <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-widest font-bold">
                    {userInfo.role}
                  </p>
                  <div className="mt-3 flex justify-center gap-2">
                    {!isAIAgent && (
                      <>
                        {/* ✅ NEW CLEAN BUTTON - Navigate to Seller Profile */}
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const targetAddress = userInfo?.walletAddress;
                            const targetUserInfo = userInfo;
                            
                            console.log('🆕 NEW View Profile Button Clicked!');
                            console.log('   Target Address:', targetAddress);
                            console.log('   Target User Info:', targetUserInfo);
                            
                            if (targetAddress && onNavigateToUserProfile) {
                              onNavigateToUserProfile(targetAddress);
                            } else {
                              console.error('❌ Missing address or handler');
                            }
                          }}
                          className="px-4 py-2 bg-[rgba(255,255,255,0.02)] border-0 rounded-lg text-xs font-bold text-zinc-400 hover:text-white hover:border-[#2CC295]/50 transition-all flex items-center gap-1.5"
                        >
                          View Profile
                          <ArrowRight size={12} />
                        </button>
                        <button 
                          onClick={() => {
                            setReportTarget({
                              name: userInfo.displayName,
                              address: userInfo.walletAddress || ''
                            });
                            setReportReason('');
                            setReportModalOpen(true);
                          }}
                          className="p-2 bg-[rgba(255,255,255,0.02)] border-0 rounded-lg text-zinc-400 hover:text-red-400 hover:border-red-500/30 transition-colors"
                          title="Report User"
                        >
                          <Flag size={14} />
                        </button>
                      </>
                    )}
                    {isAIAgent && (
                      <button 
                        onClick={() => onNavigateToPage?.('settings')}
                        className="px-4 py-2 bg-[#2CC295]/10 border border-[#2CC295]/30 rounded-lg text-xs font-bold text-[#2CC295] hover:bg-[#2CC295]/20 transition-all flex items-center gap-1.5"
                      >
                        Configure AI
                        <ArrowRight size={12} />
                      </button>
                    )}
                  </div>
                </StudioSidebarHeader>

                {/* Scrollable Info */}
                <StudioSidebarScroll className="p-6 space-y-6">
                  {/* Wallet Address - Only for non-AI users */}
                  {userInfo.walletAddress && (
                    <div>
                      <h4 className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-4">Wallet Address</h4>
                      <div 
                        className="bg-zinc-950/50 p-3 rounded-lg border border-[#27272a] flex items-center justify-between group cursor-pointer hover:border-[#2CC295]/50 transition-colors"
                        onClick={() => copyToClipboard(userInfo.walletAddress)}
                      >
                        <span className="text-xs font-mono text-zinc-300">{shortenUserDisplayName(userInfo.walletAddress)}</span>
                        <Copy className="text-zinc-600 group-hover:text-[#2CC295] transition-colors" size={14} />
                      </div>
                    </div>
                  )}

                  {/* Mutual Holdings / AI Features */}
                  {userInfo.mutualHoldings && userInfo.mutualHoldings.length > 0 && (
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                          {isAIAgent ? 'AI Capabilities' : 'Mutual Holdings'}
                        </h4>
                        {!isAIAgent && (
                          <span className="text-[10px] text-[#2CC295] font-bold">{userInfo.mutualHoldings.length} Assets</span>
                        )}
                      </div>
                      <div className="space-y-3">
                        {userInfo.mutualHoldings.map((holding, index) => {
                          const IconComponent = holding.icon === 'Diamond' ? Diamond : holding.icon === 'Coins' ? Coins : Zap;
                          return (
                            <div key={index} className="p-3 bg-zinc-900/40 rounded-xl border border-[#27272a] flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ 
                                backgroundColor: `${holding.color}33` 
                              }}>
                                <IconComponent style={{ color: holding.color }} size={14} />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-white">{holding.name}</p>
                                <p className="text-[10px] text-zinc-500">{holding.amount}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* AI Status - Only for AI Agent */}
                  {isAIAgent && userInfo.interactionHistory && userInfo.interactionHistory.length > 0 && (
                    <div className="pt-4">
                      <h4 className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-4">AI Status</h4>
                      <div className="space-y-4">
                        {userInfo.interactionHistory.map((interaction, index) => (
                          <div key={index} className="flex gap-3">
                            <div className="w-px bg-[#27272a] relative">
                              <div className={`absolute top-1 -left-1 w-2 h-2 rounded-full ${interaction.isRecent ? 'bg-[#2CC295]' : 'bg-zinc-600'}`}></div>
                            </div>
                            <div>
                              <p className="text-xs text-zinc-300">{interaction.event}</p>
                              <p className="text-[10px] text-zinc-500 mt-0.5">{interaction.date}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </StudioSidebarScroll>

                {/* Footer - Rating for non-AI users - ✅ Dynamic from reputation system */}
                {!isAIAgent && (() => {
                  const rep = getPartnerReputation(userInfo.walletAddress);
                  const filledStars = Math.round(rep.score);
                  return (
                    <StudioSidebarFooter className="p-6 bg-[rgba(18,18,18,0.5)] border-t border-[var(--t-border-subtle)]">
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <span className="text-xl font-bold text-white">{rep.score}</span>
                        <div className="flex items-center">
                          {renderStars(filledStars)}
                        </div>
                      </div>
                      <p className="text-[10px] text-zinc-500 text-center">Based on {rep.reviewCount} reviews</p>
                    </StudioSidebarFooter>
                  );
                })()}
              </>
            );
          })()}
        </div>
        </StudioSidebarShell>
        </div>
      </section>

      {/* New Conversation Modal */}
      <NewConversationModal
        isOpen={isNewConversationModalOpen}
        onClose={() => setIsNewConversationModalOpen(false)}
        onCreateConversation={handleCreateConversation}
      />

      {/* Report User Modal */}
      {reportModalOpen && reportTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setReportModalOpen(false)} />
          <div className="relative w-full max-w-md bg-[#0f0f11] rounded-xl border border-[#27272a] shadow-2xl overflow-hidden">
            <style>{`
              .report-animate-in {
                animation: reportFadeIn 0.3s ease-out, reportZoomIn 0.3s ease-out;
              }
              @keyframes reportFadeIn { from { opacity: 0; } to { opacity: 1; } }
              @keyframes reportZoomIn { from { transform: scale(0.95); } to { transform: scale(1); } }
            `}</style>
            
            <div className="report-animate-in">
              {/* Header */}
              <div className="p-6 border-b border-[#27272a]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                      <AlertTriangle size={20} className="text-red-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white tracking-tight">Report User</h2>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">
                        {reportTarget.name}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setReportModalOpen(false)}
                    className="w-10 h-10 flex items-center justify-center rounded-lg border border-[#27272a] bg-zinc-900/50 hover:bg-zinc-800 transition-colors"
                  >
                    <X className="text-zinc-400" size={18} />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-3">
                    Reason for Report
                  </label>
                  <div className="space-y-2">
                    {[
                      'Spam or scam',
                      'Harassment or abuse',
                      'Impersonation',
                      'Suspicious activity',
                      'Other'
                    ].map((reason) => (
                      <button
                        key={reason}
                        onClick={() => setReportReason(reason)}
                        className={`w-full text-left p-3 rounded-xl border text-sm font-medium transition-all ${
                          reportReason === reason
                            ? 'bg-red-500/10 border-red-500/30 text-red-400'
                            : 'bg-zinc-900/40 border-[#27272a] text-zinc-300 hover:border-zinc-600'
                        }`}
                      >
                        {reason}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Info */}
                <div className="bg-[rgba(255,255,255,0.02)] border-0 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-400 text-sm">i</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-relaxed">
                      Reports are stored locally and will be reviewed when the moderation system is connected. Blockchain addresses associated with reports are flagged for community safety.
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="p-6 pt-0 flex gap-3">
                <button
                  onClick={() => setReportModalOpen(false)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl transition-all text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!reportReason) {
                      toast.error('Please select a reason');
                      return;
                    }
                    // Store report in localStorage
                    const reports = JSON.parse(localStorage.getItem('orina_user_reports') || '[]');
                    reports.push({
                      target: reportTarget,
                      reason: reportReason,
                      reporter: address,
                      timestamp: new Date().toISOString()
                    });
                    localStorage.setItem('orina_user_reports', JSON.stringify(reports));
                    toast.success('Report submitted successfully');
                    setReportModalOpen(false);
                    setReportTarget(null);
                    setReportReason('');
                  }}
                  disabled={!reportReason}
                  className="flex-1 bg-red-500/80 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Submit Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
