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
