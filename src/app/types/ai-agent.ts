// ─── Legacy config types (used by ai-agent-settings.tsx) ─────────────────────
export type AIAgentBehavior = 'conservative' | 'moderate' | 'aggressive';

export interface AIAgentConfig {
  id: string;
  walletAddress: string;
  enabled: boolean;
  name: string;
  behavior: AIAgentBehavior;
  autoReplyEnabled: boolean;
  greetingMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AIConversationMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderType: 'customer' | 'ai_agent' | 'seller';
  content: string;
  timestamp: string;
  metadata?: {
    intent?: string;
    confidence?: number;
    apiCallMade?: boolean;
    assetIds?: string[];
  };
}

export interface AIAgentRule {
  id: string;
  patterns: string[];
  category: 'greeting' | 'asset_inquiry' | 'pricing' | 'order' | 'shipping' | 'payment' | 'general';
  action?: 'fetch_assets' | 'get_pricing' | 'create_order' | 'check_availability';
  responseTemplate: string;
  requiresApiCall: boolean;
  permissions: string[];
}

// ─── V2 types — ORINA AI Engine ──────────────────────────────────────────────
export type AIAssistContext = 'buyer' | 'seller' | 'arbiter' | 'guest';

export interface AIAssistRequest {
  walletAddress: string;
  message: string;
  conversationId: string;
  agentContext: AIAssistContext;
  imageUrls?: string[];
  disputeContext?: AIDisputeContext;
  activePage?: string;
  clarificationSelections?: string[];
  originalMessage?: string;
}

export interface AIProductResult {
  id: string;
  title: string;
  category: string;
  price?: string;
  imageUrl?: string;
  similarity?: number;
}

export interface AIOrderSummary {
  orderId: string;
  status: string;
  assetName: string;
  totalValue: string;
  currencySymbol: string;
  createdAt: string;
  role: 'buyer' | 'seller';
}

export interface AIDisputeSuggestion {
  verdict: 'buyer_win' | 'seller_win' | 'split';
  buyerSharePercent?: number;
  confidence: number;
  reasoning: string;
  buyerScore?: number;
  sellerScore?: number;
  reasoningFactors?: string[];
}

export interface AIDisputeContext {
  orderId: string;
  disputeReasons?: string[];
  buyerReasons?: string[];
  evidenceUrls?: string[];
  buyerComment?: string;
  sellerResponse?: string;
  grossPriceFormatted?: string;
  orderAmount?: string;
  openedAt?: string;
  deadline?: string;
  buyerTrustScore?: number;
  sellerTrustScore?: number;
  deliveryConfirmed?: boolean;
  transactionHash?: string;
  messages?: { sender: string; content: string }[];
}

export interface MarketAnalysis {
  category: string;
  priceAverage: number;
  priceRange: { min: number; max: number };
  demandScore: number;
  competitiveSellers: number;
  sellThroughRate: number;
  listingVelocity: number;
  recommendations: string[];
}

export interface AIStructuredResponse {
  text: string;
  action?: 'show_products' | 'show_orders' | 'mint_draft_ready' | 'market_analysis' | 'clarification' | 'general' | 'error_fallback';
  products?: AIProductResult[];
  orders?: AIOrderSummary[];
  dispute?: AIDisputeSuggestion;
  draft?: any;
  marketAnalysis?: MarketAnalysis;
  clarificationQuestion?: string;
  clarificationOptions?: string[];
  chunks?: { total: number; current: number; text: string; remaining?: string[] };
}

export interface AIConversationMeta {
  conversationId: string;
  title: string;
  lastMessage: string;
  lastAt: string;
  agentContext: AIAssistContext;
}

export interface AIUserSnapshot {
  walletAddress: string;
  agentContext: AIAssistContext;
  orderCount: number;
  recentOrderStatuses: string[];
  assetCount: number;
  topCategories: string[];
  totalSalesVolume: number;
  activePage?: string;
  memberSince?: string;
}

// ─── Frontend-only chat entry (used inside ai-sidebar.tsx) ───────────────────
export interface AIChatEntry {
  id: string;
  role: 'user' | 'ai';
  text: string;
  action?: string;
  products?: AIProductResult[];
  orders?: AIOrderSummary[];
  dispute?: AIDisputeSuggestion;
  draft?: any;
  marketAnalysis?: MarketAnalysis;
  clarificationQuestion?: string;
  clarificationOptions?: string[];
  clarificationResolved?: boolean;
  clarificationSelections?: string[];
  imageUrls?: string[];
  timestamp: number;
}
