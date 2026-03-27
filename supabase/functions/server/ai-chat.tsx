// ai-chat.tsx — v2 rewrite: uses ORINAEngine + kv_store directly
// Legacy AIAgentEngine (rule-based) fully removed.

import { Hono } from 'npm:hono';
import { AIAgentConfig } from './types.ts';
import * as kv from './kv_store.tsx';
import { ORINAEngine } from './orina-ai-engine-v2.tsx';

const aiChat = new Hono();

// ─── Helper: KV keys ─────────────────────────────────────────────────────────
const configKey = (wallet: string) => `ai_agent_config:${wallet}`;
const convKey    = (id: string)     => `conversation:${id}:messages`;

// ─── POST /ai/chat ─── Send message to seller AI agent (buyer-facing) ─────────
// NOTE: main buyer/seller chat now goes through /ai/assist (orina-ai-engine-v2).
// This endpoint remains for backwards-compatible seller auto-reply agent.
aiChat.post('/chat', async (c) => {
  try {
    const body = await c.req.json();
    const { sellerAddress, message, conversationId } = body;

    if (!sellerAddress || !message || !conversationId) {
      return c.json({
        error: 'Missing required fields: sellerAddress, message, conversationId'
      }, 400);
    }

    // Check if seller has AI agent enabled
    const config = await kv.get<AIAgentConfig>(configKey(sellerAddress));

    if (!config || !config.enabled) {
      return c.json({
        error: 'AI Agent is not enabled for this seller'
      }, 404);
    }

    // Delegate to v2 engine in 'seller' context
    const result = await ORINAEngine.processAssist({
      walletAddress: sellerAddress,
      message,
      conversationId,
      agentContext: 'seller',
    });

    // Wrap in legacy AIConversationMessage shape for API compatibility
    const response = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      conversationId,
      senderId: config.id,
      senderType: 'ai_agent',
      content: result.text,
      timestamp: new Date().toISOString(),
      metadata: { intent: result.action, apiCallMade: false }
    };

    return c.json({ success: true, response });

  } catch (error) {
    console.error('AI Chat error:', error);
    return c.json({
      error: 'Internal server error processing AI chat',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// ─── GET /ai/config/:walletAddress ─── Get seller AI agent config ─────────────
aiChat.get('/config/:walletAddress', async (c) => {
  try {
    const walletAddress = c.req.param('walletAddress');
    const config = await kv.get<AIAgentConfig>(configKey(walletAddress));

    if (!config) {
      return c.json({ error: 'AI Agent config not found' }, 404);
    }

    return c.json({ success: true, config });

  } catch (error) {
    console.error('Get AI config error:', error);
    return c.json({
      error: 'Error retrieving AI config',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// ─── POST /ai/config ─── Save seller AI agent config ─────────────────────────
aiChat.post('/config', async (c) => {
  try {
    const body = await c.req.json();
    const { walletAddress, name, behavior, enabled, autoReplyEnabled, greetingMessage } = body;

    if (!walletAddress) {
      return c.json({ error: 'Missing walletAddress' }, 400);
    }

    // Merge with existing config (or create new)
    const existing = await kv.get<AIAgentConfig>(configKey(walletAddress));
    const config: AIAgentConfig = {
      id: existing?.id ?? `ai_agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      walletAddress,
      enabled:           enabled           !== undefined ? enabled           : (existing?.enabled ?? false),
      name:              name              !== undefined ? name              : (existing?.name ?? 'AI Assistant'),
      behavior:          behavior          !== undefined ? behavior          : (existing?.behavior ?? 'moderate'),
      autoReplyEnabled:  autoReplyEnabled  !== undefined ? autoReplyEnabled  : (existing?.autoReplyEnabled ?? true),
      greetingMessage:   greetingMessage   !== undefined ? greetingMessage   : existing?.greetingMessage,
      createdAt:         existing?.createdAt ?? new Date().toISOString(),
      updatedAt:         new Date().toISOString(),
    };

    await kv.set(configKey(walletAddress), config);

    return c.json({ success: true, config });

  } catch (error) {
    console.error('Save AI config error:', error);
    return c.json({
      error: 'Error saving AI config',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// ─── GET /ai/conversation/:conversationId ─── Get conversation history ─────────
aiChat.get('/conversation/:conversationId', async (c) => {
  try {
    const conversationId = c.req.param('conversationId');
    const messages = await kv.get(convKey(conversationId)) ?? [];

    return c.json({ success: true, messages });

  } catch (error) {
    console.error('Get conversation error:', error);
    return c.json({
      error: 'Error retrieving conversation',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

export default aiChat;