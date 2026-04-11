import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, History, MessageSquare, Trash2, Image, Sparkles, ChevronRight, ArrowLeft, Plus, ArrowUp, Clock, Loader2, Maximize2, Minimize2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffectiveViewer } from '@/hooks/useEffectiveViewer';
import {
  AIChatEntry,
  AIAssistContext,
  AIConversationMeta,
  AIProductResult,
  AIOrderSummary,
  AIDisputeSuggestion,
  MarketAnalysis,
  OrderAction,
} from '@/app/types/ai-agent';
import { AIAgentClient } from '@/utils/aiAgentClient';
import { BorderlessTextarea } from './borderless-textarea';
import { StudioLoadingIndicator } from '@/app/components/ui/studio-loading-indicator';
import { getCategoryDisplayLabel } from '@/utils/taxonomy';
import {
  dispatchAppNavigation,
  navigateToSearchCategory,
  navigateToSearchResults,
} from '@/utils/appNavigation';
import {
  getMarketplaceCatalogAssetById,
  loadMarketplaceCatalogSync,
} from '@/utils/marketplaceCatalog';

// ─── Props ────────────────────────────────────────────────────────────────────

interface AISidebarProps {
  activePage: string;
  onClose: () => void;
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function AIFlowerIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="120 120 160 160"
      aria-hidden="true"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g fill="currentColor">
        <ellipse cx="200" cy="251" rx="11" ry="22" transform="rotate(22, 200, 200) rotate(-45, 200, 251)" />
        <ellipse cx="200" cy="251" rx="11" ry="22" transform="rotate(67, 200, 200) rotate(-45, 200, 251)" />
        <ellipse cx="200" cy="251" rx="11" ry="22" transform="rotate(112, 200, 200) rotate(-45, 200, 251)" />
        <ellipse cx="200" cy="251" rx="11" ry="22" transform="rotate(157, 200, 200) rotate(-45, 200, 251)" />
        <ellipse cx="200" cy="251" rx="11" ry="22" transform="rotate(202, 200, 200) rotate(-45, 200, 251)" />
        <ellipse cx="200" cy="251" rx="11" ry="22" transform="rotate(247, 200, 200) rotate(-45, 200, 251)" />
        <ellipse cx="200" cy="251" rx="11" ry="22" transform="rotate(292, 200, 200) rotate(-45, 200, 251)" />
        <ellipse cx="200" cy="251" rx="11" ry="22" transform="rotate(337, 200, 200) rotate(-45, 200, 251)" />
      </g>
    </svg>
  );
}

const AI_SIDEBAR_PILL_CLASS =
  'studio-glass-chip rounded-full border-0 bg-[var(--t-surface-10)] text-ui-secondary transition-colors hover:bg-[var(--t-input-focus-bg)] hover:text-ui-primary';

// ── Simple inline markdown renderer ─────────────────────────────────────────
function renderMarkdown(text: string) {
  // Split into lines, handle each
  return text.split('\n').map((line, li) => {
    // Parse inline: **bold**, *italic*, [label](url)
    const parts: React.ReactNode[] = [];
    const regex = /\*\*(.+?)\*\*|\*(.+?)\*|\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;
    let last = 0, m: RegExpExecArray | null;
    while ((m = regex.exec(line)) !== null) {
      if (m.index > last) parts.push(line.slice(last, m.index));
      if (m[1] !== undefined) parts.push(<strong key={m.index} className="font-semibold">{m[1]}</strong>);
      else if (m[2] !== undefined) parts.push(<em key={m.index} className="italic">{m[2]}</em>);
      else if (m[3] !== undefined) parts.push(
        <a key={m.index} href={m[4]} target="_blank" rel="noopener noreferrer"
          className="text-primary underline underline-offset-2 hover:opacity-80 break-all">
          {m[3]}
        </a>
      );
      last = m.index + m[0].length;
    }
    if (last < line.length) parts.push(line.slice(last));
    return <span key={li}>{parts}{li < text.split('\n').length - 1 && <br />}</span>;
  });
}

function ChatBubble({ entry, animateResponse = false }: { entry: AIChatEntry; animateResponse?: boolean }) {
  const isUser = entry.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-2`}>
      <div
        className={`${isUser ? 'max-w-[82%]' : 'max-w-[96%] w-full'} rounded-[14px] px-3.5 py-2.5 text-[13px] leading-relaxed ${
          isUser
            ? 'ai-user-chat-bubble rounded-br-[4px] font-medium'
            : 'bg-transparent text-ui-primary'
        }`}
      >
        {entry.imageUrls && entry.imageUrls.length > 0 && (
          <div className="flex gap-1.5 mb-2 flex-wrap">
            {entry.imageUrls.map((url: string, i: number) => (
              <img key={i} src={url} alt="" className="w-16 h-16 rounded-lg object-cover" />
            ))}
          </div>
        )}
        <div className={isUser ? undefined : animateResponse ? 'ai-response-text-reveal' : 'ai-response-text'}>
          {renderMarkdown(entry.text)}
        </div>
      </div>
    </div>
  );
}


function AIProductCard({ product, onView }: { product: AIProductResult; onView: (p: AIProductResult) => void }) {
  const categoryLabel = getCategoryDisplayLabel(product.category);
  return (
    <div className="flex items-center gap-2.5 rounded-[24px] border border-[var(--t-border-subtle)] bg-[var(--t-surface-5)] p-5 transition-colors hover:bg-[var(--t-surface-hover)] group">
      <div className="w-10 h-10 rounded-lg bg-[var(--t-input-bg)] overflow-hidden shrink-0">
        {product.imageUrl
          ? <img src={product.imageUrl} alt={product.title} className="w-full h-full object-cover" />
          : <div className="w-full h-full bg-ui-input" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-ui-primary truncate">{product.title}</p>
        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-ui-muted">
          <button
            type="button"
            onClick={() => navigateToSearchCategory({ category: product.category })}
            className="truncate transition-colors hover:text-primary"
          >
            {categoryLabel}
          </button>
          {product.price ? <span className="shrink-0">· {product.price}</span> : null}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onView(product)}
        className="opacity-0 group-hover:opacity-100 shrink-0 text-[11px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 transition-all hover:bg-violet-500/30"
      >
        View
      </button>
    </div>
  );
}

function AIOrderCard({ order }: { order: AIOrderSummary }) {
  const statusColor: Record<string, string> = {
    completed: 'text-emerald-400',
    disputed: 'text-red-400',
    pending: 'text-yellow-400',
    processing: 'text-blue-400',
    cancelled: 'text-ui-muted',
  };
  return (
    <div className="space-y-1 rounded-[24px] border border-[var(--t-border-subtle)] bg-[var(--t-surface-5)] p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] font-semibold text-ui-primary truncate flex-1">{order.assetName}</p>
        <span className={`text-[11px] font-medium shrink-0 ${statusColor[order.status] ?? 'text-ui-muted'}`}>
          {order.status}
        </span>
      </div>
      <div className="flex items-center gap-2 text-[11px] text-ui-muted">
        <span className={order.role === 'seller' ? 'text-[#2CC295]' : 'text-blue-400'}>
          {order.role === 'seller' ? 'Sale' : 'Purchase'}
        </span>
        <span>·</span>
        <span className="text-ui-primary font-semibold">{order.totalValue} {order.currencySymbol}</span>
      </div>
    </div>
  );
}

function AIDisputeCard({ dispute }: { dispute: AIDisputeSuggestion }) {
  const verdictLabel: Record<string, string> = {
    buyer_win: 'Buyer wins',
    seller_win: 'Seller wins',
    split: `Split ${dispute.buyerSharePercent ?? 50}/${100 - (dispute.buyerSharePercent ?? 50)}`,
  };
  const verdictColor: Record<string, string> = {
    buyer_win: 'text-blue-400',
    seller_win: 'text-emerald-400',
    split: 'text-yellow-400',
  };
  return (
    <div className="space-y-2 rounded-[24px] border border-[var(--t-border-subtle)] bg-[var(--t-surface-5)] p-5">
      <div className="flex items-center justify-between">
        <span className={`text-[12px] font-semibold uppercase tracking-wider ${verdictColor[dispute.verdict] ?? 'text-ui-secondary'}`}>
          {verdictLabel[dispute.verdict]}
        </span>
        <span className="text-[11px] font-medium text-ui-muted">{Math.round(dispute.confidence * 100)}% confidence</span>
      </div>
      {(dispute.buyerScore != null || dispute.sellerScore != null) && (
        <div className="flex gap-3 text-[11px] font-semibold">
          <span className="text-blue-400">Buyer {dispute.buyerScore}</span>
          <span className="text-ui-muted">vs</span>
          <span className="text-[#2CC295]">Seller {dispute.sellerScore}</span>
        </div>
      )}
      <p className="text-[12px] text-ui-secondary leading-relaxed">{dispute.reasoning}</p>
    </div>
  );
}

function AIMintDraftCard({ draft }: { draft: any }) {
  const handleFill = () => {
    window.dispatchEvent(new CustomEvent('ai:mint-draft', { detail: draft }));
  };
  return (
    <div className="space-y-2 rounded-[24px] border border-[rgba(44,194,149,0.2)] bg-[rgba(44,194,149,0.08)] p-5">
      <p className="text-[11px] font-semibold text-primary uppercase tracking-wider">Mint Draft Ready</p>
      {draft?.name && <p className="text-[13px] font-semibold text-ui-primary">{draft.name}</p>}
      {draft?.description && <p className="text-[11px] text-ui-muted line-clamp-2">{draft.description}</p>}
      <button
        type="button"
        onClick={handleFill}
        className="flex items-center justify-center gap-1 w-full text-[12px] px-4 py-2 mt-2 rounded-full bg-[#2CC295] text-black hover:bg-[#25a67d] transition-colors font-semibold uppercase tracking-wider"
      >
        Fill form <ChevronRight size={14} />
      </button>
    </div>
  );
}

function MarketAnalysisCard({ analysis }: { analysis: MarketAnalysis }) {
  return (
    <div className="space-y-3 rounded-[24px] border border-[var(--t-border-subtle)] bg-[var(--t-surface-5)] p-5">
      <button
        type="button"
        onClick={() => navigateToSearchCategory({ category: analysis.category })}
        className="text-[11px] font-semibold uppercase tracking-wider text-ui-muted transition-colors hover:text-primary"
      >
        {getCategoryDisplayLabel(analysis.category)}
      </button>
      <div className="grid grid-cols-2 gap-3 text-[11px]">
        <div className="p-3 bg-ui-input rounded-xl border-0">
          <p className="text-ui-muted uppercase mb-1">Avg Price</p>
          <p className="text-ui-primary text-lg font-semibold">${analysis.priceAverage.toLocaleString()}</p>
        </div>
        <div className="p-3 bg-ui-input rounded-xl border-0">
          <p className="text-ui-muted uppercase mb-1">Demand Score</p>
          <p className="text-ui-primary text-lg font-semibold">{analysis.demandScore}/100</p>
        </div>
        <div className="p-3 bg-ui-input rounded-xl border-0">
          <p className="text-ui-muted uppercase mb-1">Sell-through</p>
          <p className="text-ui-primary text-lg font-semibold">{analysis.sellThroughRate}%</p>
        </div>
        <div className="p-3 bg-ui-input rounded-xl border-0">
          <p className="text-ui-muted uppercase mb-1">Competitors</p>
          <p className="text-ui-primary text-lg font-semibold">{analysis.competitiveSellers}</p>
        </div>
      </div>
      {analysis.recommendations?.length > 0 && (
        <ul className="space-y-1.5 mt-2">
          {analysis.recommendations.slice(0, 3).map((r, i) => (
            <li key={i} className="text-[11px] text-ui-secondary flex gap-1.5">
              <span className="text-primary shrink-0 font-semibold">·</span> {r}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AIClarificationCard({
  question,
  options,
  onSubmit,
}: {
  question: string;
  options: string[];
  onSubmit: (selected: string[]) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (opt: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(opt) ? next.delete(opt) : next.add(opt);
      return next;
    });
  };

  return (
    <div className="mx-2 mb-3 space-y-3 rounded-[24px] border border-[var(--t-border-subtle)] bg-[var(--t-surface-5)] p-5">
      <p className="text-[13px] text-ui-primary font-semibold">{question}</p>
      <div className="space-y-2">
        {options.map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`w-full text-left text-[12px] px-4 py-3 rounded-full transition-colors flex items-center gap-2.5 border-0 ${AI_SIDEBAR_PILL_CLASS} ${
              selected.has(opt)
                ? 'bg-[var(--t-input-focus-bg)] text-ui-primary'
                : 'text-ui-secondary'
            }`}
          >
            <span className={`flex h-5 w-5 items-center justify-center rounded-full shrink-0 transition-colors ${selected.has(opt) ? 'bg-ui-primary text-[var(--t-page-bg)]' : 'bg-[var(--t-surface-20)] text-transparent'}`}>
              {selected.has(opt) && <span className="text-[var(--t-page-bg)] text-[10px] font-semibold">✓</span>}
            </span>
            {opt}
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={selected.size === 0}
        onClick={() => onSubmit([...selected])}
        className="w-full text-[12px] font-semibold uppercase tracking-wider py-2.5 rounded-full bg-ui-primary text-[var(--t-page-bg)] hover:opacity-80 transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
      >
        Confirm
      </button>
    </div>
  );
}

// ─── Loading dots ─────────────────────────────────────────────────────────────
function AISidebarLoadingState() {
  return (
    <div className="mb-3 flex justify-start">
      <div className="w-full max-w-[96%] rounded-[24px] bg-[var(--t-surface-5)] px-4 py-4">
        <StudioLoadingIndicator
          layout="stacked"
          tone="primary"
          size={24}
          label="Orina AI is thinking..."
          subLabel="Preparing the next response"
          className="items-start justify-start text-left"
          labelClassName="text-sm font-medium text-ui-primary"
          subLabelClassName="text-xs text-ui-secondary"
        />
      </div>
    </div>
  );
}

// ─── Context label formatter ──────────────────────────────────────────────────
function contextLabel(agentContext: AIAssistContext, activePage: string): string {
  const pageLabel = activePage && activePage !== 'home' ? activePage.replace(/-/g, ' ') : '';
  return [agentContext, pageLabel].filter(Boolean).join(' · ');
}

// ─── Main component ───────────────────────────────────────────────────────────

// ── localStorage key for persisting active conversationId per wallet ──────────
const convStorageKey = (addr: string) => `orina:ai:conv:${addr.toLowerCase()}`;

function createRuntimeId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `orina-ai-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function readStoredConversationId(addr?: string | null) {
  if (!addr || typeof window === 'undefined') {
    return createRuntimeId();
  }

  try {
    return localStorage.getItem(convStorageKey(addr)) ?? createRuntimeId();
  } catch (error) {
    console.debug('[AI Sidebar] Failed to read stored conversation id:', error);
    return createRuntimeId();
  }
}

function persistConversationId(addr: string | undefined, conversationId: string) {
  if (!addr || typeof window === 'undefined') return;

  try {
    localStorage.setItem(convStorageKey(addr), conversationId);
  } catch (error) {
    console.debug('[AI Sidebar] Failed to persist conversation id:', error);
  }
}

function clearStoredConversationId(addr: string | undefined, conversationId: string) {
  if (!addr || typeof window === 'undefined') return;

  try {
    if (localStorage.getItem(convStorageKey(addr)) === conversationId) {
      localStorage.removeItem(convStorageKey(addr));
    }
  } catch (error) {
    console.debug('[AI Sidebar] Failed to clear stored conversation id:', error);
  }
}

export function AISidebar({ activePage, onClose }: AISidebarProps) {
  const { address } = useEffectiveViewer();

  // Auto-detect seller vs buyer context from active page
  // Seller pages: minting, assets, orders (as seller), insights, messages
  const SELLER_PAGES = ['minting', 'assets', 'orders', 'insights', 'messages'];
  const agentContext: AIAssistContext = !address
    ? 'guest'
    : SELLER_PAGES.includes(activePage?.toLowerCase() ?? '')
      ? 'seller'
      : 'buyer';

  const [view, setView] = useState<'chat' | 'history'>('chat');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [entries, setEntries] = useState<AIChatEntry[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState<AIConversationMeta[]>([]);
  // Restore last active conversationId from localStorage (per wallet), or generate a new one
  const [conversationId, setConversationId] = useState<string>(() => {
    return readStoredConversationId(address);
  });
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [sessionRestored, setSessionRestored] = useState(false);
  const [animatedAiEntryId, setAnimatedAiEntryId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleViewProduct = useCallback((product: AIProductResult) => {
    const syncedAsset = getMarketplaceCatalogAssetById(product.id, loadMarketplaceCatalogSync());

    if (syncedAsset) {
      dispatchAppNavigation({
        assetId: syncedAsset.id,
        fromPage: activePage,
      });
      onClose();
      return;
    }

    navigateToSearchResults({
      query: product.title,
      category: product.category,
    });
    onClose();
  }, [activePage, onClose]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries, isLoading]);

  useEffect(() => {
    if (!animatedAiEntryId) return;

    const timeoutId = window.setTimeout(() => {
      setAnimatedAiEntryId((currentId) => (currentId === animatedAiEntryId ? null : currentId));
    }, 900);

    return () => window.clearTimeout(timeoutId);
  }, [animatedAiEntryId]);

  // ── Auto-restore last session on mount (once per address) ─────────────────
  useEffect(() => {
    if (!address || sessionRestored) return;
    setSessionRestored(true);

    let savedConvId: string | null = null;
    try {
      savedConvId = localStorage.getItem(convStorageKey(address));
    } catch (error) {
      console.debug('[AI Sidebar] Failed to restore previous conversation:', error);
    }
    if (!savedConvId) return; // no previous session

    // Silently try to reload the last conversation
    AIAgentClient.getConversationMessages(address, savedConvId).then(messages => {
      if (messages.length === 0) return; // empty or expired
      const rebuilt: AIChatEntry[] = messages.map(m => ({
        id: m.id,
        role: m.senderType === 'ai_agent' ? 'ai' : 'user',
        text: m.content,
        products: m.metadata?.products,
        orders: m.metadata?.orders,
        dispute: (m.metadata?.disputeSuggestion ?? m.metadata?.dispute) as AIDisputeSuggestion | undefined,
        draft: m.metadata?.draft,
        marketAnalysis: m.metadata?.marketAnalysis,
        timestamp: new Date(m.timestamp).getTime(),
      }));
      setConversationId(savedConvId);
      setEntries(rebuilt);
      setAnimatedAiEntryId(null);
    }).catch(() => { /* silently ignore restore errors */ });
  }, [address, sessionRestored]);

  // Load conversation history list when switching to history tab
  useEffect(() => {
    if (view === 'history' && address) {
      AIAgentClient.getConversations(address).then(setConversations);
    }
  }, [view, address]);

  // ── Send message ────────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (
    text?: string,
    overrideImages?: string[],
    clarificationSelections?: string[],
    originalMessage?: string,
  ) => {
    const messageText = (text ?? input).trim();
    const images = overrideImages ?? pendingImages;

    if (!messageText && images.length === 0) return;
    if (!address) {
      const fallbackUserId = createRuntimeId();
      const fallbackAiId = createRuntimeId();
      setEntries(prev => [...prev, {
        id: fallbackUserId,
        role: 'user',
        text: messageText || '🖼️ [image]',
        timestamp: Date.now(),
      }, {
        id: fallbackAiId,
        role: 'ai',
        text: 'Please connect your wallet to use ORINA AI.',
        action: 'error_fallback',
        timestamp: Date.now() + 1,
      }]);
      setAnimatedAiEntryId(fallbackAiId);
      setInput('');
      setPendingImages([]);
      return;
    }

    const userEntry: AIChatEntry = {
      id: createRuntimeId(),
      role: 'user',
      text: messageText || '🖼️ [image]',
      imageUrls: images.length > 0 ? images : undefined,
      timestamp: Date.now(),
    };
    setEntries(prev => [...prev, userEntry]);
    setInput('');
    setPendingImages([]);
    setIsLoading(true);
    // Persist active conversationId for session restore on next open/reload
    persistConversationId(address, conversationId);

    const response = await AIAgentClient.sendAssist({
      walletAddress: address,
      message: messageText,
      conversationId,
      agentContext,
      imageUrls: images.length > 0 ? images : undefined,
      activePage,
      clarificationSelections,
      originalMessage,
    });

    setIsLoading(false);

    if (!response) {
      // Extreme edge case — sendAssist now normally always returns a response
      setEntries(prev => [...prev, {
        id: createRuntimeId(),
        role: 'ai',
        text: 'Unable to reach ORINA AI. Please check your connection and try again.',
        action: 'error_fallback',
        timestamp: Date.now(),
      }]);
      return;
    }

    const aiEntry: AIChatEntry = {
      id: createRuntimeId(),
      role: 'ai',
      text: response.text,
      action: response.action,
      products: response.products,
      orders: response.orders,
      dispute: response.disputeSuggestion ?? response.dispute,
      draft: response.draft,
      marketAnalysis: response.marketAnalysis,
      clarificationQuestion: response.clarificationQuestion,
      clarificationOptions: response.clarificationOptions,
      timestamp: Date.now(),
    };
    setEntries(prev => [...prev, aiEntry]);
    setAnimatedAiEntryId(aiEntry.id);
  }, [input, pendingImages, address, conversationId, agentContext, activePage]);

  // ── Clarification submit ────────────────────────────────────────────────────
  const handleClarificationSubmit = useCallback((selections: string[], originalMsg: string) => {
    // Mark the clarification entry as resolved
    setEntries(prev => prev.map(e =>
      e.role === 'ai' && e.action === 'clarification' && !e.clarificationResolved
        ? { ...e, clarificationResolved: true, clarificationSelections: selections }
        : e,
    ));
    // Create a visible user reply bubble
    const userReply = selections.join(', ');
    const enrichedMessage = `**${userReply}**`;
    sendMessage(enrichedMessage, [], selections, originalMsg);
  }, [sendMessage]);

  // ── Image select ────────────────────────────────────────────────────────────
  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    files.slice(0, 3).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => setPendingImages(prev => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  }, []);

  // ── Load a past conversation ────────────────────────────────────────────────
  const loadConversation = useCallback(async (convId: string) => {
    if (!address) return;
    const messages = await AIAgentClient.getConversationMessages(address, convId);
    const rebuilt: AIChatEntry[] = messages.map(m => ({
      id: m.id,
      role: m.senderType === 'ai_agent' ? 'ai' : 'user',
      text: m.content,
      products: m.metadata?.products,
      orders: m.metadata?.orders,
      dispute: (m.metadata?.disputeSuggestion ?? m.metadata?.dispute) as AIDisputeSuggestion | undefined,
      draft: m.metadata?.draft,
      marketAnalysis: m.metadata?.marketAnalysis,
      timestamp: new Date(m.timestamp).getTime(),
    }));
    setConversationId(convId);
    setEntries(rebuilt);
    setAnimatedAiEntryId(null);
    setView('chat');
    // Persist the loaded conversation as the active session
    persistConversationId(address, convId);
  }, [address]);

  // ── Delete conversation ─────────────────────────────────────────────────────
  const deleteConversation = useCallback(async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!address) return;
    await AIAgentClient.deleteConversation(address, convId);
    setConversations(prev => prev.filter(c => c.conversationId !== convId));
    // If the deleted conversation was the active one, clear localStorage
    clearStoredConversationId(address, convId);
  }, [address]);

  // ── Start new chat ──────────────────────────────────────────────────────────
  const startNewChat = useCallback(() => {
    const newId = createRuntimeId();
    setConversationId(newId);
    setEntries([]);
    setPendingImages([]);
    setAnimatedAiEntryId(null);
    setView('chat');
    // Update localStorage so next open restores this new conversation
    persistConversationId(address, newId);
  }, [address]);

  // ── Keyboard send ───────────────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── Clarification card visibility ───────────────────────────────────────────
  const pendingClarification = !isLoading
    ? entries.findLast(e => e.role === 'ai' && e.action === 'clarification' && !e.clarificationResolved)
    : undefined;
  const originalMsgForClarification = pendingClarification
    ? [...entries].reverse().find(e => e.role === 'user')?.text ?? ''
    : '';

  return (
    <motion.div
      initial={{ x: 360, opacity: 0 }}
      animate={isFullscreen ? { x: 0, y: 0, opacity: 1, scale: 1 } : { x: 0, opacity: 1, scale: 1 }}
      exit={{ x: 360, opacity: 0 }}
      transition={{
        type: 'tween',
        duration: isFullscreen ? 0.18 : 0.16,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={isFullscreen ? "fixed inset-0 z-[60] p-4 sm:p-6 md:p-8 flex items-center justify-center pointer-events-none" : "fixed right-0 top-0 h-[100dvh] w-[344px] z-[60] p-2.5 pointer-events-none"}
      style={{ willChange: 'transform, opacity', backfaceVisibility: 'hidden' }}
    >
      <style>{`
        .ai-sidebar-opaque-shell {
          background: rgb(18, 18, 18);
        }

        [data-theme="light"] .ai-sidebar-opaque-shell {
          background: #fcfdff;
        }

        .ai-user-chat-bubble {
          background: #111111;
          color: #ffffff;
        }

        [data-theme="dark"] .ai-user-chat-bubble {
          background: rgba(255, 255, 255, 0.08);
          color: rgba(248, 250, 252, 0.98);
        }

        .ai-response-text {
          display: block;
        }

        .ai-response-text-reveal {
          display: block;
          will-change: clip-path, opacity, transform;
          animation: ai-response-fade-in 220ms ease-out both, ai-response-type-reveal 540ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        @keyframes ai-response-fade-in {
          from {
            opacity: 0;
            transform: translateY(4px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes ai-response-type-reveal {
          from {
            clip-path: inset(0 100% 0 0);
          }

          to {
            clip-path: inset(0 0 0 0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .ai-response-text-reveal {
            animation: none;
            clip-path: none;
            opacity: 1;
            transform: none;
          }
        }
      `}</style>
      {isFullscreen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/72 pointer-events-auto"
          onClick={onClose}
        />
      )}
      <div
        className={`ai-sidebar-opaque-shell relative h-full ${isFullscreen ? 'w-full max-w-6xl' : 'w-full -translate-y-[1px]'} rounded-[24px] flex flex-col overflow-hidden pointer-events-auto`}
        style={{ contain: 'layout paint' }}
      >
      {/* Header */}
      <div className="flex items-center gap-2.5 p-5 border-b border-[var(--t-border-subtle)] shrink-0">
        <div className="flex items-center justify-center shrink-0 text-ui-primary">
          <AIFlowerIcon className="h-[20px] w-[20px] object-contain" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ui-primary uppercase tracking-wider">ORINA AI</p>
          <p className="text-xs text-ui-muted truncate capitalize">{contextLabel(agentContext, activePage)}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {!isFullscreen && (
            <button
              type="button"
              onClick={() => setView(v => v === 'chat' ? 'history' : 'chat')}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--t-surface-10)] hover:bg-[var(--t-surface-20)] text-ui-primary transition-colors border border-[var(--t-border-subtle)]"
              title={view === 'chat' ? 'View history' : 'Back to chat'}
            >
              {view === 'chat' ? <History size={14} /> : <MessageSquare size={14} />}
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--t-surface-10)] hover:bg-[var(--t-surface-20)] text-ui-primary transition-colors border border-[var(--t-border-subtle)] hidden sm:flex"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--t-surface-10)] hover:bg-[var(--t-surface-20)] text-ui-primary transition-colors border border-[var(--t-border-subtle)]"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-row overflow-hidden relative">
        <AnimatePresence mode="wait">
          {(view === 'history' || isFullscreen) && (
            <motion.div
              key="history"
              initial={isFullscreen ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`${isFullscreen ? 'w-[320px] shrink-0 border-r border-[var(--t-border-subtle)] bg-transparent' : 'absolute inset-0 z-10 bg-transparent'} flex flex-col overflow-hidden`}
            >
              <div className="p-5 border-b border-[var(--t-border-subtle)] flex items-center justify-between shrink-0">
                <span className="text-[12px] font-semibold text-ui-muted uppercase tracking-wider">History</span>
                <button
                type="button"
                onClick={startNewChat}
                className="text-[11px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full bg-ui-primary text-[var(--t-page-bg)] hover:opacity-80 transition-colors"
              >
                + New chat
              </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {conversations.length === 0 ? (
                  <p className="text-[13px] text-ui-muted text-center py-8">No conversation history yet.</p>
                ) : (
                  conversations.map(conv => (
                    <button
                      key={conv.conversationId}
                      type="button"
                      onClick={() => loadConversation(conv.conversationId)}
                      className={`w-full text-left p-4 rounded-[24px] ${conv.conversationId === conversationId ? 'bg-[var(--t-input-focus-bg)] border-[#2CC295]/50' : 'bg-[var(--t-surface-5)] hover:bg-[var(--t-surface-hover)] border-[var(--t-border-subtle)]'} transition-colors group flex items-start gap-3 border`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={`text-[13px] font-semibold truncate ${conv.conversationId === conversationId ? 'text-[#2CC295]' : 'text-ui-primary'}`}>{conv.title}</p>
                        <p className="text-[12px] text-ui-secondary truncate mt-1">{conv.lastMessage}</p>
                        <p className="text-[11px] text-ui-muted mt-1.5 font-medium uppercase tracking-wider">
                          {new Date(conv.lastAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => deleteConversation(conv.conversationId, e)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 text-ui-muted hover:text-red-400 transition-all shrink-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {(view === 'chat' || isFullscreen) && (
            <motion.div
              key="chat"
              initial={isFullscreen ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col overflow-hidden relative"
            >
            {/* Messages */}
            <style>{`.hidden-msgs-scroll::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }`}</style>
            <div 
              className="flex-1 overflow-y-auto px-3 py-3 space-y-1 hidden-msgs-scroll"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {entries.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6 mt-8">
                  <div className="w-[48px] h-[48px] rounded-full flex items-center justify-center bg-[var(--t-surface-5)] text-ui-primary">
                    <AIFlowerIcon className="w-[32px] h-[32px] opacity-60 object-contain" />
                  </div>
                  <p className="text-[13px] text-ui-muted">
                    {agentContext === 'seller'
                      ? 'Ask me about your store, sourcing products, listing assets, or market trends.'
                      : agentContext === 'buyer'
                        ? 'Ask me about products, orders, disputes, or getting help.'
                        : 'Ask me about ORINA Marketplace, digital assets, or how to get started.'}
                  </p>
                  <div className="grid grid-cols-1 gap-1.5 w-full mt-2">
                    {(({
                      buyer: [
                        'Find digital real estate NFT',
                        'Check my orders',
                        'NFT collectibles market',
                        'Help me buy an asset',
                      ],
                      seller: [
                        'Analyze my store sales',
                        'Find products to source',
                        'Help me list an asset',
                        'Market trend analysis',
                      ],
                      arbiter: [
                        'Review this dispute',
                        'Analyze buyer evidence',
                        'Suggest split ratio',
                      ],
                      guest: [
                        'What is ORINA?',
                        'Browse digital assets',
                        'How to buy NFTs',
                      ],
                    } as Record<AIAssistContext, string[]>)[agentContext] ?? [
                      'Find digital real estate NFT',
                      'Check my orders',
                      'Help me list an asset',
                    ]).map(text => (
                      <button
                        key={text}
                        type="button"
                        onClick={() => sendMessage(text)}
                        className={`text-left text-[12px] font-medium px-4 py-2.5 rounded-full ${AI_SIDEBAR_PILL_CLASS}`}
                      >
                        {text}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {entries.map(entry => (
                <div key={entry.id}>
                  <ChatBubble entry={entry} animateResponse={entry.role === 'ai' && entry.id === animatedAiEntryId} />
                  {/* Structured content under AI messages */}
                  {entry.role === 'ai' && (
                    <div className="ml-8 space-y-1.5 mb-2">
                      {entry.products && entry.products.length > 0 && (
                        <div className="space-y-1.5">
                          {entry.products.map(p => (
                            <AIProductCard key={p.id} product={p} onView={handleViewProduct} />
                          ))}
                        </div>
                      )}
                      {entry.orders && entry.orders.length > 0 && (
                        <div className="space-y-1.5">
                          {entry.orders.map(o => (
                            <AIOrderCard key={o.orderId} order={o} />
                          ))}
                        </div>
                      )}
                      {entry.dispute && <AIDisputeCard dispute={entry.dispute} />}
                      {entry.draft && <AIMintDraftCard draft={entry.draft} />}
                      {entry.marketAnalysis && <MarketAnalysisCard analysis={entry.marketAnalysis} />}
                    </div>
                  )}
                </div>
              ))}

              {isLoading && <AISidebarLoadingState />}

              {/* Clarification card */}
              {pendingClarification && (
                <AIClarificationCard
                  question={pendingClarification.clarificationQuestion ?? 'What do you mean?'}
                  options={pendingClarification.clarificationOptions ?? []}
                  onSubmit={sel => handleClarificationSubmit(sel, originalMsgForClarification)}
                />
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Pending images strip */}
            {pendingImages.length > 0 && (
              <div className="flex gap-1.5 px-3 pb-2 flex-wrap">
                {pendingImages.map((img, i) => (
                  <div key={i} className="relative">
                    <img src={img} alt="" className="w-12 h-12 rounded-lg object-cover border border-[var(--t-border-subtle)]" />
                    <button
                      type="button"
                      onClick={() => setPendingImages(prev => prev.filter((_, j) => j !== i))}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[var(--t-surface-10)] border border-[var(--t-border-subtle)] flex items-center justify-center"
                    >
                      <X size={9} className="text-ui-primary" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Input area */}
            <div className="p-4 pt-0 border-t-0 shrink-0 bg-transparent mb-1">
              <div
                className="chat-composer-shell flex min-h-[66px] max-h-[300px] items-end gap-2 overflow-hidden rounded-[26px] px-3 py-2.5 transition-[background-color,border-color,box-shadow] duration-150 ease-out"
              >
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageSelect}
                />
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="mb-[2px] flex h-8 w-8 items-center justify-center shrink-0 rounded-lg text-ui-muted transition-colors hover:text-ui-primary"
                  title="Upload image"
                >
                  <Plus size={19} />
                </button>
                <BorderlessTextarea
                  id="ai-chat-input"
                  ref={inputRef}
                  rows={1}
                  autoResize
                  baseAutoHeight={24}
                  maxAutoHeight={252}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={agentContext === 'seller' ? 'Ask about listings, orders...' : 'Search products, ask questions...'}
                  className="min-w-0 flex-1 resize-none bg-transparent px-1 py-1.5 text-[14px] font-medium leading-relaxed text-ui-primary placeholder:text-ui-muted overflow-y-auto"
                  disabled={isLoading}
                  style={{ minHeight: '24px', maxHeight: '252px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                />
                <div className="mb-[2px] flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => sendMessage()}
                    disabled={isLoading || (!input.trim() && pendingImages.length === 0)}
                    className="chat-send-button"
                  >
                    <ArrowUp size={16} strokeWidth={3} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
          )}
        </AnimatePresence>
      </div>
      </div>
    </motion.div>
  );
}
