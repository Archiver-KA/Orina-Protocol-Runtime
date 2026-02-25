import { AIAgentConfig, AIAgentRule, AIConversationMessage, APIKey } from './types.ts';
import * as kv from './kv_store.tsx';

// AI Agent Rules Database
const AI_AGENT_RULES: AIAgentRule[] = [
  {
    id: 'greeting_1',
    patterns: ['hi', 'hello', 'hey', 'morning', 'afternoon', 'evening', 'greetings'],
    category: 'greeting',
    responseTemplate: "Hello! I'm {agentName}, your AI assistant. How can I help you today? Feel free to ask about available assets, pricing, or place an order.",
    requiresApiCall: false,
    permissions: []
  },
  {
    id: 'asset_inquiry_1',
    patterns: ['sell', 'asset', 'listing', 'product', 'have', 'inventory', 'catalog', 'show', 'available'],
    category: 'asset_inquiry',
    action: 'fetch_assets',
    responseTemplate: "I have {assetCount} assets available. Here are some highlights:\n\n{assetList}\n\nWould you like details on any of these?",
    requiresApiCall: true,
    permissions: ['read']
  },
  {
    id: 'pricing_1',
    patterns: ['price', 'cost', 'much', 'expensive', 'cheap', 'affordable', 'pricing'],
    category: 'pricing',
    action: 'get_pricing',
    responseTemplate: "Here's the pricing information:\n\n{pricingDetails}\n\nAll prices include blockchain verification and smart contract escrow. Would you like to make an offer?",
    requiresApiCall: true,
    permissions: ['read']
  },
  {
    id: 'order_1',
    patterns: ['buy', 'purchase', 'order', 'checkout', 'want'],
    category: 'order',
    responseTemplate: "Great! I can help you create an order. To proceed, I'll need:\n\n1. Which asset you're interested in\n2. Your payment method (ETH, USDC, or USDT)\n\nWhich asset would you like to purchase?",
    requiresApiCall: false,
    permissions: []
  },
  {
    id: 'shipping_1',
    patterns: ['ship', 'deliver', 'arrive', 'delivery', 'tracking'],
    category: 'shipping',
    responseTemplate: "📦 Shipping Information:\n\n• Standard shipping: 3-5 business days\n• Express shipping: 1-2 business days (+$25)\n• Free shipping on orders over $100\n• Real-time tracking provided after shipment\n\nAll shipments are insured and require signature confirmation.",
    requiresApiCall: false,
    permissions: []
  },
  {
    id: 'payment_1',
    patterns: ['payment', 'crypto', 'escrow', 'pay', 'accept'],
    category: 'payment',
    responseTemplate: "💰 Payment & Security:\n\n✅ Accepted: ETH, USDC, USDT\n✅ Smart contract escrow (1% fee)\n✅ Funds held until delivery confirmed\n✅ Automatic release after confirmation\n\nYour payment is protected by blockchain technology. Funds are only released when you confirm receipt.",
    requiresApiCall: false,
    permissions: []
  },
  {
    id: 'general_help',
    patterns: ['help', 'support', 'question', 'work', 'explain'],
    category: 'general',
    responseTemplate: "I'm here to help! I can assist with:\n\n🔍 Viewing available assets\n💵 Pricing information\n🛒 Creating orders\n📦 Shipping details\n💳 Payment methods\n\nWhat would you like to know more about?",
    requiresApiCall: false,
    permissions: []
  }
];

export class AIAgentEngine {
  // Process customer message and generate response
  static async processMessage(
    config: AIAgentConfig,
    message: string,
    conversationId: string,
    apiKey?: APIKey
  ): Promise<AIConversationMessage> {
    const startTime = Date.now();
    
    console.log('🤖 AI Agent processing message:', message);
    
    // Analyze intent
    const { rule, confidence } = this.matchIntent(message);
    
    console.log('📊 Matched rule:', rule?.id, 'Category:', rule?.category, 'Confidence:', confidence);
    
    let responseContent = '';
    let metadata: any = {
      intent: rule?.category || 'unknown',
      confidence: confidence
    };

    if (rule) {
      // Check if action requires API call
      if (rule.requiresApiCall && rule.action) {
        console.log('⚙️ Rule requires API call. Action:', rule.action, 'Has API key:', !!apiKey);
        
        if (!apiKey) {
          console.warn('❌ No API key available for action:', rule.action);
          responseContent = "I'm sorry, but I'm not properly configured to access asset data. Please contact the seller directly.";
        } else if (!this.hasRequiredPermissions(apiKey, rule.permissions)) {
          console.warn('❌ API key lacks permissions:', rule.permissions);
          responseContent = "I don't have the required permissions to perform this action. Please contact support.";
        } else {
          // Execute API action
          console.log('✅ Executing action:', rule.action);
          const apiResult = await this.executeAction(rule.action, apiKey);
          console.log('📦 API result:', apiResult);
          responseContent = this.formatResponse(rule.responseTemplate, {
            agentName: config.name,
            ...apiResult
          });
          metadata.apiCallMade = true;
          metadata.assetIds = apiResult.assetIds;
        }
      } else {
        // Simple text response
        console.log('💬 Simple text response (no API call needed)');
        responseContent = this.formatResponse(rule.responseTemplate, {
          agentName: config.name
        });
      }
    } else {
      // No matching rule - fallback response based on behavior
      console.log('❓ No matching rule, using fallback response');
      responseContent = this.getFallbackResponse(config.behavior, message);
    }

    console.log('✉️ Final response:', responseContent.substring(0, 100) + '...');

    const responseTime = Date.now() - startTime;
    console.log(`AI Agent response time: ${responseTime}ms`);

    // Create response message
    const response: AIConversationMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      conversationId,
      senderId: config.id,
      senderType: 'ai_agent',
      content: responseContent,
      timestamp: new Date().toISOString(),
      metadata
    };

    // Save message to conversation history
    await this.saveMessage(response);

    return response;
  }

  // Match user message to intent
  private static matchIntent(message: string): { rule: AIAgentRule | null; confidence: number } {
    const messageLower = message.toLowerCase().trim();
    let bestMatch: AIAgentRule | null = null;
    let highestConfidence = 0;

    for (const rule of AI_AGENT_RULES) {
      for (const pattern of rule.patterns) {
        // Simple substring matching for better accuracy
        const patternLower = pattern.toLowerCase();
        
        // Check if message contains the pattern
        if (messageLower.includes(patternLower)) {
          const confidence = 0.9; // High confidence for direct match
          if (confidence > highestConfidence) {
            highestConfidence = confidence;
            bestMatch = rule;
          }
        }
        
        // Also try regex for more flexible matching
        try {
          const regex = new RegExp(pattern, 'i');
          if (regex.test(messageLower)) {
            const confidence = 0.85;
            if (confidence > highestConfidence) {
              highestConfidence = confidence;
              bestMatch = rule;
            }
          }
        } catch {
          // Invalid regex, skip
        }
      }
    }

    return { rule: bestMatch, confidence: highestConfidence };
  }

  // Execute API actions
  private static async executeAction(action: string, apiKey: APIKey): Promise<any> {
    switch (action) {
      case 'fetch_assets':
        return await this.fetchAssets(apiKey);
      case 'get_pricing':
        return await this.getPricing(apiKey);
      case 'check_availability':
        return await this.checkAvailability(apiKey);
      default:
        return {};
    }
  }

  private static async fetchAssets(apiKey: APIKey): Promise<any> {
    // Mock asset data - in production, this would call real API
    const mockAssets = [
      { id: 'asset_1', name: 'Tesla Model 3 (2023)', price: '$35,000', category: 'Vehicle' },
      { id: 'asset_2', name: 'Miami Condo Unit 405', price: '$450,000', category: 'Real Estate' },
      { id: 'asset_3', name: 'Gold Reserve 1kg Bar', price: '$65,000', category: 'Commodity' },
      { id: 'asset_4', name: 'Rolex Submariner', price: '$12,000', category: 'Luxury Goods' }
    ];

    const assetList = mockAssets
      .map((a, i) => `${i + 1}. ${a.name} - ${a.price}`)
      .join('\n');

    return {
      assetCount: mockAssets.length,
      assetList,
      assetIds: mockAssets.map(a => a.id)
    };
  }

  private static async getPricing(apiKey: APIKey): Promise<any> {
    return {
      pricingDetails: `• Base price includes on-chain verification
• Smart contract escrow fee: 1%
• Payment accepted in: ETH, USDC, USDT
• No hidden fees or charges`
    };
  }

  private static async checkAvailability(apiKey: APIKey): Promise<any> {
    return {
      available: true,
      stockCount: 3
    };
  }

  // Format response template
  private static formatResponse(template: string, data: Record<string, any>): string {
    let result = template;
    for (const [key, value] of Object.entries(data)) {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
    }
    return result;
  }

  // Fallback response based on behavior
  private static getFallbackResponse(behavior: string, message: string): string {
    switch (behavior) {
      case 'conservative':
        return "I'm not sure I understand. Could you rephrase your question? I can help with viewing assets, pricing, orders, shipping, and payment methods.";
      case 'moderate':
        return "I'm not entirely sure what you're asking about, but I'd be happy to help! Here are some things I can assist with:\n\n• View available assets\n• Get pricing information\n• Create an order\n• Shipping details\n• Payment methods\n\nWhat interests you most?";
      case 'aggressive':
        return "Great question! While I process that, let me show you our featured assets:\n\n✨ Tesla Model 3 (2023) - $35,000\n✨ Miami Condo - $450,000\n✨ Gold Reserve 1kg - $65,000\n\nAny of these catch your eye? I can provide more details or start an order right away!";
      default:
        return "I'm here to help! What would you like to know?";
    }
  }

  private static hasRequiredPermissions(apiKey: APIKey, permissions: string[]): boolean {
    return permissions.every(p => apiKey.permissions.includes(p as any));
  }

  // Save message to conversation history
  private static async saveMessage(message: AIConversationMessage): Promise<void> {
    try {
      const key = `conversation:${message.conversationId}:messages`;
      const messages = await kv.get<AIConversationMessage[]>(key) || [];
      messages.push(message);
      await kv.set(key, messages);
    } catch (error) {
      console.error('Error saving message to conversation:', error);
      // Don't throw - just log error. Message will be lost but app continues
    }
  }

  // Get conversation history
  static async getConversationHistory(conversationId: string): Promise<AIConversationMessage[]> {
    try {
      const key = `conversation:${conversationId}:messages`;
      const messages = await kv.get<AIConversationMessage[]>(key);
      return messages || [];
    } catch (error) {
      console.error('Error loading conversation history:', error);
      // Return empty array on error instead of throwing
      return [];
    }
  }

  // Save AI Agent config
  static async saveConfig(config: AIAgentConfig): Promise<void> {
    try {
      await kv.set(`ai_agent_config:${config.walletAddress}`, config);
    } catch (error) {
      console.error('Error saving AI Agent config:', error);
      throw error; // Re-throw because config save is critical
    }
  }

  // Get AI Agent config
  static async getConfig(walletAddress: string): Promise<AIAgentConfig | null> {
    try {
      return await kv.get<AIAgentConfig>(`ai_agent_config:${walletAddress}`);
    } catch (error) {
      console.error('Error loading AI Agent config:', error);
      return null; // Return null on error instead of throwing
    }
  }
}