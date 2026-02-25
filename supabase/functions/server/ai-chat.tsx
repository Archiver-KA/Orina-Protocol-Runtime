import { Hono } from 'npm:hono';
import { AIAgentEngine } from './ai-agent-engine.tsx';
import { AIAgentConfig } from './types.ts';
import { getAPIKeyById } from './api-auth.tsx';
import * as kv from './kv_store.tsx';

const aiChat = new Hono();

// POST /ai/chat - Send message to AI agent
aiChat.post('/chat', async (c) => {
  try {
    const body = await c.req.json();
    const { sellerAddress, message, conversationId } = body;

    if (!sellerAddress || !message || !conversationId) {
      return c.json({ 
        error: 'Missing required fields: sellerAddress, message, conversationId' 
      }, 400);
    }

    // Get seller's AI Agent config
    const config = await AIAgentEngine.getConfig(sellerAddress);

    if (!config || !config.enabled) {
      return c.json({ 
        error: 'AI Agent is not enabled for this seller' 
      }, 404);
    }

    // Get seller's primary API key (first active key with read permission)
    const apiKeyIds = await kv.get<string[]>(`wallet_keys:${sellerAddress}`) || [];
    let apiKey = null;
    
    for (const keyId of apiKeyIds) {
      const key = await getAPIKeyById(keyId);
      if (key && key.isActive && key.permissions.includes('read')) {
        apiKey = key;
        break;
      }
    }
    
    // If no API key found in test mode, create a mock one for demo purposes
    if (!apiKey && conversationId.startsWith('test_conv_')) {
      console.log('🧪 Test mode detected - creating mock API key');
      apiKey = {
        id: 'test_api_key',
        walletAddress: sellerAddress,
        name: 'Test API Key',
        key: 'test_key',
        permissions: ['read', 'write'],
        isActive: true,
        createdAt: new Date().toISOString(),
        usageCount: 0
      };
    }

    // Process message with AI Agent
    const response = await AIAgentEngine.processMessage(
      config,
      message,
      conversationId,
      apiKey || undefined
    );

    return c.json({
      success: true,
      response
    });

  } catch (error) {
    console.error('AI Chat error:', error);
    return c.json({ 
      error: 'Internal server error processing AI chat',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// GET /ai/config/:walletAddress - Get AI Agent config
aiChat.get('/config/:walletAddress', async (c) => {
  try {
    const walletAddress = c.req.param('walletAddress');
    const config = await AIAgentEngine.getConfig(walletAddress);

    if (!config) {
      return c.json({ 
        error: 'AI Agent config not found' 
      }, 404);
    }

    return c.json({
      success: true,
      config
    });

  } catch (error) {
    console.error('Get AI config error:', error);
    return c.json({ 
      error: 'Error retrieving AI config',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// POST /ai/config - Save AI Agent config
aiChat.post('/config', async (c) => {
  try {
    const body = await c.req.json();
    const { walletAddress, name, behavior, enabled, autoReplyEnabled, greetingMessage } = body;

    if (!walletAddress) {
      return c.json({ error: 'Missing walletAddress' }, 400);
    }

    // Get existing config or create new
    let config = await AIAgentEngine.getConfig(walletAddress);
    
    if (!config) {
      config = {
        id: `ai_agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        walletAddress,
        enabled: enabled ?? false,
        name: name || 'AI Assistant',
        behavior: behavior || 'moderate',
        autoReplyEnabled: autoReplyEnabled ?? true,
        greetingMessage: greetingMessage || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } else {
      // Update existing config
      config = {
        ...config,
        name: name !== undefined ? name : config.name,
        behavior: behavior !== undefined ? behavior : config.behavior,
        enabled: enabled !== undefined ? enabled : config.enabled,
        autoReplyEnabled: autoReplyEnabled !== undefined ? autoReplyEnabled : config.autoReplyEnabled,
        greetingMessage: greetingMessage !== undefined ? greetingMessage : config.greetingMessage,
        updatedAt: new Date().toISOString()
      };
    }

    await AIAgentEngine.saveConfig(config);

    return c.json({
      success: true,
      config
    });

  } catch (error) {
    console.error('Save AI config error:', error);
    return c.json({ 
      error: 'Error saving AI config',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// GET /ai/conversation/:conversationId - Get conversation history
aiChat.get('/conversation/:conversationId', async (c) => {
  try {
    const conversationId = c.req.param('conversationId');
    const messages = await AIAgentEngine.getConversationHistory(conversationId);

    return c.json({
      success: true,
      messages
    });

  } catch (error) {
    console.error('Get conversation error:', error);
    return c.json({ 
      error: 'Error retrieving conversation',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

export default aiChat;