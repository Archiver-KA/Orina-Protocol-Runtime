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
    version?: string;
    disputeSuggestion?: AIDisputeSuggestion;
    [key: string]: unknown;
  };
}

export type AIAssistContext = 'buyer' | 'seller' | 'arbiter' | 'guest';

export interface AIDisputeContext {
  orderId?: string;
  disputeReasons?: string[];
  buyerReasons?: string[];
  evidenceUrls?: string[];
  buyerComment?: string;
  sellerResponse?: string;
  grossPriceFormatted?: string;
  orderAmount?: string;
  openedAt?: string;
  deadline?: string;
  deliveryConfirmed?: boolean;
  transactionHash?: string;
  messages?: { sender: string; content: string }[];
  [key: string]: unknown;
}

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

export interface AIConversationMeta {
  conversationId: string;
  title: string;
  lastMessage: string;
  lastAt: string;
  agentContext: AIAssistContext;
}

export interface AIDisputeSuggestion {
  verdict: 'buyer_win' | 'seller_win' | 'split';
  buyerSharePercent?: number;
  confidence: number;
  reasoning: string;
  buyerScore: number;
  sellerScore: number;
  reasoningFactors: string[];
}

export interface AIOrderSummary {
  orderId: string;
  status: string;
  assetName: string;
  totalValue: string;
  currencySymbol?: string;
  createdAt: string;
  role: 'buyer' | 'seller';
}

export interface AIProductResult {
  id: string;
  title: string;
  category: string;
  price?: string;
  imageUrl?: string;
  similarity?: number;
}

export interface MarketAnalysis {
  category: string;
  priceAverage: number;
  priceRange: {
    min: number;
    max: number;
  };
  demandScore: number;
  competitiveSellers: number;
  sellThroughRate: number;
  listingVelocity: number;
  recommendations: string[];
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
}

export interface AIStructuredResponse {
  text: string;
  action?: string;
  products?: AIProductResult[];
  orders?: AIOrderSummary[];
  marketAnalysis?: MarketAnalysis;
  disputeSuggestion?: AIDisputeSuggestion;
  clarificationQuestion?: string | null;
  clarificationOptions?: string[];
  preview?: string;
  hasMore?: boolean;
  totalLength?: number;
  [key: string]: unknown;
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
