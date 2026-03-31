import { Search, Smile, Paperclip, Send, Copy, Diamond, Coins, Zap, Flag, ArrowRight, Bot, Star, Plus, AlertTriangle, X, ArrowUp, ShieldCheck, LockKeyhole } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { getAvatarByUserId } from '@/app/components/user-avatars';
import { formatUserDisplayName, shortenUserDisplayName } from '@/utils/profileUtils';
import { useUser } from '@/contexts/UserContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { useAccessMode } from '@/hooks/useAccessMode';
import { useWalletSecurityPrompt } from '@/hooks/useWalletSecurityPrompt';
import { NewConversationModal } from '@/app/components/new-conversation-modal';
import * as MessagesClient from '@/utils/messagesClient';
import { toast } from 'sonner';
import { REPUTATION_SYNC_EVENT, hydrateReputationFromSupabase } from '@/utils/profileReputationSync';
import { getWalletIdentity } from '@/utils/walletIdentityStore';
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
import { isBridgeAuthRequiredError } from '@/utils/supabaseAuthClaimBridge';
import { hasWalletAuthSession } from '@/utils/walletAuthSession';
import { BorderlessTextarea } from '@/app/components/ai/borderless-textarea';

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

const defaultConversations: any[] = [];

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
  initialConversationId?: string | null;
}

type CreateConversationResult = 'created' | 'pending';

export function Messages({ onNavigateToUserProfile, initialConversationId }: MessagesProps) {
  // ✅ Get wallet address for backend communication
  const { address } = useAccount();
  const { isAuthPending } = useAccessMode();
  const { promptChatSecurityCheck } = useWalletSecurityPrompt();
  
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
  const [activeConversation, setActiveConversation] = useState<string | null>(initialConversationId || null);
  const [messagesByConversation, setMessagesByConversation] = useState<Record<string, any[]>>(initialMessagesByConversation);
  const [userInput, setUserInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
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
  const pendingConversationDraftRef = useRef<{ walletAddress: string; displayName?: string } | null>(null);
  
  // ✅ FIX: Cooldown after sending to prevent immediate poll overwrite for backend conversations
  const sendCooldownRef = useRef<number>(0);
  // ✅ FIX: Ref to always have the latest activeConversation for polling (prevents stale closure)
  const activeConversationRef = useRef<string | null>(activeConversation);
  activeConversationRef.current = activeConversation;
  // ✅ FIX: Ref for address to prevent stale closure in polling
  const addressRef = useRef(address);
  addressRef.current = address;
  // ✅ Report modal state
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportTarget, setReportTarget] = useState<{ name: string; address: string } | null>(null);
  const [reputationRevision, setReputationRevision] = useState(0);
  const activeConversationKey = activeConversation ? String(activeConversation) : null;
  const conversationMessages = activeConversationKey ? (messagesByConversation[activeConversationKey] || EMPTY_MESSAGES) : EMPTY_MESSAGES;
  const activeConversationRecord = activeConversation
    ? conversations.find((conversation) => conversation.id === activeConversation) || null
    : null;
  const requiresChatSecurityCheck = Boolean(address && isAuthPending);
  const hasLiveChatSecuritySession = () => {
    const currentAddress = addressRef.current;
    return Boolean(currentAddress && hasWalletAuthSession(currentAddress));
  };

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

  useEffect(() => {
    const handleReputationSync = () => setReputationRevision((value) => value + 1);
    window.addEventListener(REPUTATION_SYNC_EVENT, handleReputationSync as EventListener);
    return () => {
      window.removeEventListener(REPUTATION_SYNC_EVENT, handleReputationSync as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!activeConversationRecord?.address) return;
    void hydrateReputationFromSupabase(activeConversationRecord.address);
  }, [activeConversationRecord?.address]);
  
  // ✅ Get reputation score for active conversation partner
  const getPartnerReputation = useCallback((walletAddress: string | null): { score: number | null; reviewCount: number } => {
    if (!walletAddress) return { score: null, reviewCount: 0 };
    try {
      const identity = getWalletIdentity(walletAddress);
      if (identity.reputation.totalReviews === 0) {
        return { score: null, reviewCount: 0 };
      }
      return {
        score: Math.round(identity.reputation.averageRating * 10) / 10,
        reviewCount: identity.reputation.totalReviews,
      };
    } catch {
      return { score: null, reviewCount: 0 };
    }
  }, [reputationRevision]);
  
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
    if (!hasLiveChatSecuritySession()) return;
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
        const displayLabel = formatUserDisplayName(conv.displayName, otherAddress);
        
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
          displayName: displayLabel || shortenUserDisplayName(otherAddress || ''),
          avatar: conv.avatar || undefined,
          AvatarComponent: getAvatarByUserId(otherAddress || ''),
          lastMessage: conv.lastMessage,
          timestamp: formatTimestamp(conv.lastMessageTime),
          // C6 currently has no true presence service; use backend flag if present,
          // otherwise fallback to recent-message activity as a practical online heuristic.
          online: recentlyActive,
          unread: unreadCount,
          userInfo: {
            displayName: displayLabel || shortenUserDisplayName(otherAddress || ''),
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
        if (!uiConv.id) continue;

        const unread = Number(uiConv.unread || 0);
        nextUnreadSnapshot[String(uiConv.id)] = unread;

        if (!chatNotificationBaselineReadyRef.current) continue;

        const prevUnread = Number(chatUnreadSnapshotRef.current[String(uiConv.id)] || 0);
        if (unread <= prevUnread || unread <= 0) continue;

        const otherAddress = String(uiConv.address || '').toLowerCase();
        const actorName = formatUserDisplayName(uiConv.displayName, otherAddress) ||
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
      
      setConversations(transformed);

      // Reconcile active conversation with the latest backend list.
      // This prevents the thread pane from staying on a stale/deleted UUID after DB reset or cleanup.
      setActiveConversation((prev) => {
        if (prev && transformed.some((c: any) => c.id === prev)) return prev;
        if (transformed.length > 0) return transformed[0].id;
        return null;
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
  const loadBackendMessages = async (conversationId: string, silent: boolean = false, force: boolean = false) => {
    const conversationKey = String(conversationId);
    if (!hasLiveChatSecuritySession()) return;

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
    if (!address || requiresChatSecurityCheck) {
      setConversations([]);
      setActiveConversation(null);
      setMessagesByConversation({});
      messagesByConversationRef.current = {};
      setLoading(false);
      return;
    }

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
  }, [address, requiresChatSecurityCheck]);

  // C6.3.1: chat invalidation events (no-payload bus). Coalesce rapid emits (send/create/read)
  // to avoid duplicate polling requests and keep sidebar/thread in sync across chat entry points.
  useEffect(() => {
    if (requiresChatSecurityCheck) return;

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
  }, [activeConversation, requiresChatSecurityCheck]);

  // C6.3.2.3: realtime/presence adapter boundary (polling fallback-safe)
  // Default adapter is no-op; future realtime implementation can invalidate via callbacks.
  useEffect(() => {
    if (!address || requiresChatSecurityCheck) return;

    const unsubscribe = subscribeChatConversationList(address, () => {
      if (typeof window === 'undefined') return;
      window.dispatchEvent(new Event(MessagesClient.CHAT_CONVERSATIONS_CHANGED_EVENT));
    });

    return () => unsubscribe();
  }, [address, requiresChatSecurityCheck]);

  useEffect(() => {
    if (!activeConversation || requiresChatSecurityCheck) {
      return;
    }

    const conversationId = String(activeConversation);
    const unsubscribe = subscribeChatConversationThread(conversationId, () => {
      if (typeof window === 'undefined') return;
      window.dispatchEvent(new Event(MessagesClient.CHAT_MESSAGES_CHANGED_EVENT));
    });

    return () => unsubscribe();
  }, [activeConversation, requiresChatSecurityCheck]);
  
  // Load messages when active conversation changes
  useEffect(() => {
    if (activeConversation && !requiresChatSecurityCheck) {
      // Force jump to latest message when switching conversation tab
      forceScrollOnNextRenderRef.current = true;
      shouldAutoScrollRef.current = true;
      setShowEmojiPicker(false);
      loadBackendMessages(activeConversation); // NOT silent - user-initiated
    }
  }, [activeConversation, address, requiresChatSecurityCheck]);

  // Allow external navigation (e.g. notification click) to switch the active thread after mount.
  useEffect(() => {
    if (!initialConversationId) return;
    const target = String(initialConversationId);
    if (!target) return;

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

  const handleSendMessage = async () => {
    // Must have either text or image
    if ((!userInput.trim() && !attachedImage) || sendingMessage || !address) return;
    if (!activeConversation) return;
    if (requiresChatSecurityCheck) {
      promptChatSecurityCheck();
      return;
    }

    const messageText = userInput.trim();
    
    // Clear input immediately for better UX
    setUserInput('');
    setAttachedImage(null);
    setShowEmojiPicker(false);

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
      if (requiresChatSecurityCheck) return;
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
  }, [requiresChatSecurityCheck]);

  const finalizeConversationCreation = useCallback(
    async (
      walletAddress: string,
      displayName?: string,
      options?: { fromSecurityCheck?: boolean },
    ): Promise<CreateConversationResult> => {
      const currentAddress = addressRef.current;
      if (!currentAddress) {
        throw new Error('Please connect your wallet first');
      }

      const conversation = await MessagesClient.createConversation(
        currentAddress,
        walletAddress,
        displayName
      );

      pendingConversationDraftRef.current = null;
      setActiveConversation(conversation.id);
      setConversationMessagesFor(conversation.id, []);

      if (options?.fromSecurityCheck) {
        await loadBackendConversations(true, true);
        await loadBackendMessages(conversation.id, true, true);
        setIsNewConversationModalOpen(false);
      } else {
        await loadBackendConversations();
        await loadBackendMessages(conversation.id, true);
      }

      toast.success('Conversation created!');
      return 'created';
    },
    [loadBackendConversations, loadBackendMessages, setConversationMessagesFor]
  );

  const resumePendingConversationCreation = useCallback(async () => {
    const draft = pendingConversationDraftRef.current;
    if (!draft) return;

    try {
      await finalizeConversationCreation(draft.walletAddress, draft.displayName, {
        fromSecurityCheck: true,
      });
    } catch (error) {
      console.error('[Messages] Resume conversation creation error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to create conversation'
      );
    }
  }, [finalizeConversationCreation]);
  
  // Handle create new conversation
  const handleCreateConversation = useCallback(
    async (walletAddress: string, displayName?: string): Promise<CreateConversationResult> => {
      const trimmedWalletAddress = walletAddress.trim();
      const trimmedDisplayName = displayName?.trim() || undefined;

      if (!addressRef.current) {
        throw new Error('Please connect your wallet first');
      }

      if (requiresChatSecurityCheck) {
        pendingConversationDraftRef.current = {
          walletAddress: trimmedWalletAddress,
          displayName: trimmedDisplayName,
        };
        promptChatSecurityCheck(resumePendingConversationCreation);
        return 'pending';
      }

      try {
        return await finalizeConversationCreation(trimmedWalletAddress, trimmedDisplayName);
      } catch (error) {
        if (isBridgeAuthRequiredError(error)) {
          pendingConversationDraftRef.current = {
            walletAddress: trimmedWalletAddress,
            displayName: trimmedDisplayName,
          };
          promptChatSecurityCheck(resumePendingConversationCreation);
          return 'pending';
        }

        console.error('[Messages] Create conversation error:', error);
        throw (error instanceof Error
          ? error
          : new Error('Failed to create conversation'));
      }
    },
    [
      finalizeConversationCreation,
      promptChatSecurityCheck,
      requiresChatSecurityCheck,
      resumePendingConversationCreation,
    ]
  );

  if (requiresChatSecurityCheck) {
    return (
      <section className="h-full bg-ui-page overflow-hidden p-6">
        <div className="flex h-full items-center justify-center">
          <div className="w-full max-w-[560px] rounded-[32px] border border-white/8 bg-[var(--t-card-bg)] p-8 shadow-[0_30px_80px_rgba(0,0,0,0.32)]">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#2CC295]/20 bg-[#2CC295]/10 px-3 py-1">
              <ShieldCheck size={14} className="text-[#78E5BF]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#78E5BF]">Protected Area</span>
            </div>

            <h2 className="text-[28px] font-extrabold tracking-tight text-white">Unlock Secure Messages</h2>
            <p className="mt-3 max-w-[460px] text-sm leading-6 text-zinc-400">
              Messages and conversations need a one-time wallet security check before Orina can sync your chat session. This is where the first signature should happen, not during wallet login.
            </p>

            <div className="mt-6 grid gap-3">
              <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">What you are approving</p>
                <p className="mt-1 text-sm font-semibold text-white">Wallet session unlock for Messages & conversations</p>
              </div>
              <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">Wallet request</p>
                    <p className="mt-1 text-sm font-semibold text-white">One-time signature</p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-black/20 px-3 py-1.5">
                    <LockKeyhole size={14} className="text-zinc-300" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-300">No Gas</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/6 bg-black/20 px-4 py-3">
              <p className="text-[11px] leading-5 text-zinc-400">
                After you sign once, Orina will load your conversation list automatically. No transaction is sent and no token approval is requested.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => promptChatSecurityCheck()}
                className="rounded-full bg-[#2CC295] px-5 py-3 text-sm font-black uppercase tracking-[0.08em] text-black transition-colors hover:bg-[#34d3a3]"
              >
                Unlock Messages
              </button>
              <p className="text-xs text-zinc-500">Conversations stay hidden until the wallet security check is complete.</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

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
              <h2 className="text-sm font-bold text-ui-primary uppercase tracking-wider">Messages</h2>
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ui-muted" size={14} />
              <input
                className="w-full bg-ui-input border border-ui-border rounded-[999px] pl-9 pr-4 py-2 text-xs text-ui-primary focus:ring-primary/35 focus:border-primary placeholder:text-ui-muted"
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
                    : 'hover:bg-ui-pill'
                }`}
              >
                <div className="flex gap-2">
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-full border overflow-hidden flex items-center justify-center bg-ui-input border-ui-border-subtle">
                      {(() => {
                        const AvatarComp = conv.AvatarComponent || getAvatarByUserId(conv.address || conv.id);
                        return conv.avatar ? (
                          <img src={conv.avatar} alt={conv.displayName} className="w-full h-full object-cover" />
                        ) : (
                          <AvatarComp className="w-full h-full" />
                        );
                      })()}
                    </div>
                    <div
                      className={`absolute bottom-0 right-0 w-2.5 h-2.5 border-2 border-[var(--t-card-bg)] rounded-full ${
                        conv.online ? 'bg-[#2CC295]' : 'bg-ui-muted'
                      }`}
                    ></div>
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-ui-primary truncate">
                          {conv.displayName || shortenUserDisplayName(conv.address)}
                        </span>
                      </div>
                      <span className="text-[9px] text-ui-muted">{conv.timestamp}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <p
                        className={`text-[11px] truncate font-medium ${
                          conv.unread > 0 ? 'text-ui-secondary' : 'text-ui-muted'
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
        {!activeConversationRecord ? (
          <div className="flex-1 flex items-center justify-center bg-transparent">
            <div className="max-w-sm text-center px-8">
              <h3 className="text-lg font-bold text-ui-primary">No Conversation Selected</h3>
              <p className="text-sm text-ui-muted mt-2">
                Choose an existing thread or start a new conversation to continue messaging.
              </p>
              <button
                type="button"
                onClick={() => setIsNewConversationModalOpen(true)}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#2CC295] px-4 py-2.5 text-sm font-bold text-black transition-all hover:shadow-lg hover:shadow-[#2CC295]/20"
              >
                <Plus size={16} />
                New Conversation
              </button>
            </div>
          </div>
        ) : (
          /* Normal Chat Interface */
          <div className="flex-1 flex flex-col overflow-hidden bg-transparent relative">
            {/* Chat Header */}
            <div className="p-5 border-b border-[var(--t-border-subtle)] flex items-center justify-between bg-ui-input backdrop-blur-[6px] flex-shrink-0 relative">
              {(() => {
                const activeConv = activeConversationRecord;
                const AvatarComp = activeConv?.AvatarComponent;
                const displayName = activeConv?.displayName || shortenUserDisplayName(activeConv?.address || '');
                const isOnline = activeConv?.online || false;
                
                return (
                  <>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-ui-input border border-ui-border-subtle overflow-hidden flex items-center justify-center">
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
                        <h3 className="text-sm font-bold text-ui-primary flex items-center gap-2">
                          {displayName}
                        </h3>
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-[#2CC295]' : 'bg-ui-muted'}`}></span>
                          <span className={`text-[10px] uppercase font-bold tracking-widest ${isOnline ? 'text-[#2CC295]' : 'text-ui-muted'}`}>{isOnline ? 'Online' : 'Offline'}</span>
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
                <span className="text-[10px] px-3 py-1 bg-ui-pill border border-ui-border-subtle rounded-full text-ui-muted uppercase tracking-widest font-bold">
                  Today
                </span>
              </div>

              {/* Message Bubbles */}
              {(() => {
                const activeConv = activeConversationRecord;
                // Get avatar component for the active conversation
                const ConvAvatarComp = activeConv?.AvatarComponent || (activeConv?.address ? getAvatarByUserId(activeConv.address) : null);
                
                return conversationMessages.map((message) =>
                  message.sender !== 'me' ? (
                    <div key={message.id} className="flex min-w-0 max-w-[80%] items-end gap-3">
                      <div className="w-8 h-8 rounded-full bg-ui-input overflow-hidden flex-shrink-0 self-end">
                        {activeConv?.avatar ? (
                          <img src={activeConv.avatar} alt="User" className="w-full h-full object-cover" />
                        ) : ConvAvatarComp ? (
                          <ConvAvatarComp className="w-full h-full" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-[var(--t-surface-10)] to-[var(--t-surface-5)] flex items-center justify-center text-ui-primary text-xs font-bold">
                            {activeConv?.displayName?.charAt(0).toUpperCase() || 'U'}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 max-w-full overflow-hidden rounded-2xl rounded-bl-none bg-ui-input p-4 backdrop-blur-lg !border-0 !shadow-none ring-0">
                        {message.image && (
                          <div className="mb-2">
                            <div className="w-[220px] sm:w-[260px] aspect-[4/3] rounded-lg overflow-hidden bg-ui-input">
                              <img src={message.image.url} alt="Attached" className="w-full h-full object-cover" />
                            </div>
                          </div>
                        )}
                        <p className="text-sm leading-relaxed text-ui-primary [overflow-wrap:anywhere] break-all whitespace-pre-wrap">
                          {message.text}
                        </p>
                        <span className="text-[10px] text-ui-muted mt-1 block">{message.timestamp}</span>
                        {message.isAI && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-[#2CC295]" title="AI Agent Response">
                            <Bot size={12} />
                            <span>AI Agent</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div key={message.id} className="ml-auto flex min-w-0 max-w-[80%] flex-row-reverse items-end gap-3">
                      <div className="w-8 h-8 rounded-full bg-ui-input overflow-hidden flex-shrink-0 self-end">
                        {currentUser.avatarUrl ? (
                          <img src={currentUser.avatarUrl} alt={currentUser.displayName || currentUser.username} className="w-full h-full object-cover" />
                        ) : (() => {
                          // Use SVG avatar system for current user
                          const CurrentUserAvatar = getAvatarByUserId(currentUser.address || 'default');
                          return <CurrentUserAvatar className="w-full h-full" />;
                        })()}
                      </div>
                      <div className="min-w-0 max-w-full overflow-hidden rounded-2xl rounded-br-none bg-[#2CC295]/15 p-4 backdrop-blur-lg !border-0 !shadow-none ring-0">
                        {message.image && (
                          <div className="mb-2">
                            <div className="w-[220px] sm:w-[260px] aspect-[4/3] rounded-lg overflow-hidden bg-ui-input">
                              <img src={message.image.url} alt="Attached" className="w-full h-full object-cover" />
                            </div>
                          </div>
                        )}
                        <p className="text-sm leading-relaxed text-ui-primary [overflow-wrap:anywhere] break-all whitespace-pre-wrap">
                          {message.text}
                        </p>
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
                const activeConv = activeConversationRecord;
                const ConvAvatarComp = activeConv?.AvatarComponent || (activeConv?.address ? getAvatarByUserId(activeConv.address) : null);
                
                return (
                  <div className="flex items-end gap-3 max-w-[80%]">
                    <div className="w-8 h-8 rounded-full bg-ui-input overflow-hidden flex-shrink-0 self-end">
                      {activeConv?.avatar ? (
                        <img src={activeConv.avatar} alt="User" className="w-full h-full object-cover" />
                      ) : ConvAvatarComp ? (
                        <ConvAvatarComp className="w-full h-full" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[var(--t-surface-10)] to-[var(--t-surface-5)] flex items-center justify-center text-ui-primary text-xs font-bold">
                          {activeConv?.displayName?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      )}
                    </div>
                    <div className="bg-ui-input backdrop-blur-lg p-4 rounded-2xl rounded-bl-none !border-0 !shadow-none ring-0">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-ui-muted rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-2 h-2 bg-ui-muted rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-2 h-2 bg-ui-muted rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Auto-scroll anchor */}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-6 bg-transparent">
              <div className="flex items-end gap-2 bg-[var(--t-input-bg)] rounded-[24px] px-2 py-2 transition-colors !border-0 !shadow-none ring-0 max-w-4xl mx-auto w-full">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-7 h-7 flex items-center justify-center shrink-0 rounded-lg text-ui-muted hover:text-ui-primary transition-colors mb-[1px]"
                  title="Attach file"
                >
                  <Plus size={18} />
                </button>
                <div className="relative flex-1 flex flex-col justify-center">
                  <BorderlessTextarea
                    id="message-inbox-input"
                    rows={1}
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    onFocus={handleTyping}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
                    }}
                    placeholder="Type a secure message..."
                    className="flex-1 resize-none bg-transparent text-[14px] font-medium text-ui-primary placeholder:text-ui-muted overflow-y-auto leading-relaxed py-1.5 px-1 self-center"
                    style={{ minHeight: '22px', maxHeight: '120px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  />
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 flex gap-1">
                    <button
                      ref={emojiButtonRef}
                      className={`w-7 h-7 flex items-center justify-center shrink-0 rounded-lg transition-colors ${showEmojiPicker ? 'text-[#2CC295]' : 'text-ui-muted hover:text-ui-primary'}`}
                      onClick={() => setShowEmojiPicker(prev => !prev)}
                      type="button"
                    >
                      <Smile size={18} />
                    </button>
                  </div>
                  {/* Emoji Picker - anchored inside input wrapper to prevent overflow */}
                  {showEmojiPicker && (
                    <div
                      ref={emojiPickerRef}
                      className="absolute bottom-[calc(100%+0.5rem)] right-0 mb-2 bg-ui-dropdown border border-ui-border-subtle rounded-xl p-3 shadow-2xl shadow-black/40 backdrop-blur-[20px] z-[120]"
                    >
                      <div className="flex flex-col gap-1.5">
                        {emojiRows.map((row, rowIdx) => (
                          <div key={rowIdx} className="flex gap-1">
                              {row.map((emoji) => (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() => handleEmojiSelect(emoji)}
                                  className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-ui-pill transition-colors text-xl cursor-pointer"
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
                <div className="flex items-center gap-2 shrink-0 mb-[1px]">
                  <button
                    type="button"
                    onClick={handleSendMessage}
                    disabled={(!userInput.trim() && !attachedImage) || sendingMessage}
                    className="w-7 h-7 flex flex-col items-center justify-center shrink-0 rounded-full bg-ui-primary hover:opacity-80 text-[var(--t-page-bg)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
                  >
                    <ArrowUp size={15} strokeWidth={3} />
                  </button>
                </div>
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
            const activeConv = activeConversationRecord;
            const userInfo = activeConv?.userInfo;
            const AvatarComp = activeConv?.AvatarComponent;

            if (!userInfo) return null;

            return (
              <>
                {/* User Profile */}
                <StudioSidebarHeader className="p-5 text-center border-b border-[var(--t-border-subtle)]">
                  <div className="w-16 h-16 rounded-full border-2 mx-auto mb-3 overflow-hidden flex items-center justify-center bg-ui-input border-ui-border-subtle">
                    {userInfo.avatarUrl ? (
                      <img src={userInfo.avatarUrl} alt={userInfo.displayName} className="w-full h-full object-cover" />
                    ) : AvatarComp ? (
                      <AvatarComp className="w-full h-full" />
                    ) : (
                      <Bot className="text-white" size={32} />
                    )}
                  </div>
                  <h3 className="text-ui-primary font-bold text-sm">{userInfo.displayName}</h3>
                  <p className="text-[10px] text-ui-muted mt-1 uppercase tracking-widest font-bold">
                    {userInfo.role}
                  </p>
                  <div className="mt-3 flex justify-center gap-2">
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const targetAddress = userInfo?.walletAddress;
                        
                        if (targetAddress && onNavigateToUserProfile) {
                          onNavigateToUserProfile(targetAddress);
                        }
                      }}
                      className="px-4 py-2 bg-ui-input border border-ui-border-subtle rounded-lg text-xs font-bold text-ui-secondary hover:text-ui-primary hover:border-[#2CC295]/50 transition-all flex items-center gap-1.5"
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
                      className="p-2 bg-ui-input border border-ui-border-subtle rounded-lg text-ui-secondary hover:text-red-400 hover:border-red-500/30 transition-colors"
                      title="Report User"
                    >
                      <Flag size={14} />
                    </button>
                  </div>
                </StudioSidebarHeader>

                {/* Scrollable Info */}
                <StudioSidebarScroll className="p-6 space-y-6">
                  {/* Wallet Address - Only for non-AI users */}
                  {userInfo.walletAddress && (
                    <div>
                      <h4 className="text-[10px] text-ui-muted font-bold uppercase tracking-widest mb-4">Wallet Address</h4>
                      <div 
                        className="bg-ui-input p-3 rounded-lg border border-ui-border-subtle flex items-center justify-between group cursor-pointer hover:border-[#2CC295]/50 transition-colors"
                        onClick={() => copyToClipboard(userInfo.walletAddress)}
                      >
                        <span className="text-xs font-mono text-ui-secondary">{shortenUserDisplayName(userInfo.walletAddress)}</span>
                        <Copy className="text-ui-muted group-hover:text-[#2CC295] transition-colors" size={14} />
                      </div>
                    </div>
                  )}

                  {/* Mutual Holdings */}
                  {userInfo.mutualHoldings && userInfo.mutualHoldings.length > 0 && (
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-[10px] text-ui-muted font-bold uppercase tracking-widest">Mutual Holdings</h4>
                        <span className="text-[10px] text-[#2CC295] font-bold">{userInfo.mutualHoldings.length} Assets</span>
                      </div>
                      <div className="space-y-3">
                        {userInfo.mutualHoldings.map((holding, index) => {
                          const IconComponent = holding.icon === 'Diamond' ? Diamond : holding.icon === 'Coins' ? Coins : Zap;
                          return (
                            <div key={index} className="p-3 bg-ui-input rounded-xl border border-ui-border-subtle flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ 
                                backgroundColor: `${holding.color}33` 
                              }}>
                                <IconComponent style={{ color: holding.color }} size={14} />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-ui-primary">{holding.name}</p>
                                <p className="text-[10px] text-ui-muted">{holding.amount}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                </StudioSidebarScroll>

                {/* Footer - Rating from reputation system */}
                {userInfo.walletAddress && (() => {
                  const rep = getPartnerReputation(userInfo.walletAddress);
                  return (
                    <StudioSidebarFooter className="p-6 bg-ui-input border-t border-[var(--t-border-subtle)]">
                      {rep.score !== null ? (
                        <>
                          <div className="flex items-center justify-center gap-1.5 mb-1">
                            <span className="text-xl font-bold text-ui-primary">{rep.score}</span>
                            <div className="flex items-center">
                              {renderStars(Math.round(rep.score))}
                            </div>
                          </div>
                          <p className="text-[10px] text-ui-muted text-center">Based on {rep.reviewCount} reviews</p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-bold text-ui-primary text-center">No reviews yet</p>
                          <p className="mt-1 text-[10px] text-ui-muted text-center">This profile has not received any reviews yet.</p>
                        </>
                      )}
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
                      Reports are submitted securely to the server for moderation review. Blockchain addresses associated with reports are flagged for community safety.
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
                  onClick={async () => {
                    if (!reportReason) {
                      toast.error('Please select a reason');
                      return;
                    }
                    // Submit report to server-side moderation table
                    try {
                      const { SUPABASE_EDGE_URL } = await import('/utils/supabase/info');
                      await fetch(`${SUPABASE_EDGE_URL}/orina-chat-v1/messages/report`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          targetWallet: reportTarget.address,
                          targetName: reportTarget.name,
                          reason: reportReason,
                        }),
                      });
                      toast.success('Report submitted successfully');
                    } catch (err) {
                      console.error('[Messages] Report submit error:', err);
                      toast.error('Failed to submit report');
                    }
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
