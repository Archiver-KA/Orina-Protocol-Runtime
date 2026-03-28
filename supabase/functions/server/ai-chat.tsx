// ai-chat.tsx — v2 rewrite: uses ORINAEngine + kv_store directly
// Legacy AIAgentEngine (rule-based) fully removed.

import { Hono } from 'npm:hono';
import { AIAgentConfig } from './types.ts';
import * as kv from './kv_store.tsx';
import { ORINAEngine } from './orina-ai-engine-v2.tsx';
import { assertAuthenticatedWalletMatch, requireAuthenticatedWallet } from './request-auth.ts';

const aiChat = new Hono();

// ─── Helper: KV keys ─────────────────────────────────────────────────────────
const configKey = (wallet: string) => `ai_agent_config:${wallet}`;

async function getStoredConfig(walletAddress: string): Promise<AIAgentConfig | null> {
  const config = await kv.get(configKey(walletAddress));
  if (!config || typeof config !== 'object') {
    return null;
  }
  return config as AIAgentConfig;
}

// ─── POST /ai/chat ─── Legacy seller AI message route ────────────────────────
// NOTE: main buyer/seller chat now goes through /ai/assist (orina-ai-engine-v2).
// This endpoint remains only for authenticated seller-owned legacy flows.
aiChat.post('/chat', async (c) => {
  try {
    const auth = await requireAuthenticatedWallet(c);
    if (!auth.ok) return auth.response;

    const body = await c.req.json();
    const { sellerAddress, message, conversationId } = body;

    if (!sellerAddress || !message || !conversationId) {
      return c.json({
        error: 'Missing required fields: sellerAddress, message, conversationId'
      }, 400);
    }

    const walletMismatch = assertAuthenticatedWalletMatch(c, auth.identity, sellerAddress, 'sellerAddress');
    if (walletMismatch) return walletMismatch;

    // Check if seller has AI agent enabled
    const config = await getStoredConfig(auth.identity.walletAddress);

    if (!config || !config.enabled) {
      return c.json({
        error: 'AI Agent is not enabled for this seller'
      }, 404);
    }

    // Delegate to v2 engine in 'seller' context
    const result = await ORINAEngine.processAssist({
      walletAddress: auth.identity.walletAddress,
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
    const auth = await requireAuthenticatedWallet(c);
    if (!auth.ok) return auth.response;

    const walletAddress = c.req.param('walletAddress');
    const walletMismatch = assertAuthenticatedWalletMatch(c, auth.identity, walletAddress, 'walletAddress');
    if (walletMismatch) return walletMismatch;

    const config = await getStoredConfig(auth.identity.walletAddress);

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
    const auth = await requireAuthenticatedWallet(c);
    if (!auth.ok) return auth.response;

    const body = await c.req.json();
    const { walletAddress, name, behavior, enabled, autoReplyEnabled, greetingMessage } = body;

    const walletMismatch = assertAuthenticatedWalletMatch(c, auth.identity, walletAddress, 'walletAddress');
    if (walletMismatch) return walletMismatch;

    // Merge with existing config (or create new)
    const resolvedWalletAddress = auth.identity.walletAddress;
    const existing = await getStoredConfig(resolvedWalletAddress);
    const config: AIAgentConfig = {
      id: existing?.id ?? `ai_agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      walletAddress: resolvedWalletAddress,
      enabled:           enabled           !== undefined ? enabled           : (existing?.enabled ?? false),
      name:              name              !== undefined ? name              : (existing?.name ?? 'AI Assistant'),
      behavior:          behavior          !== undefined ? behavior          : (existing?.behavior ?? 'moderate'),
      autoReplyEnabled:  autoReplyEnabled  !== undefined ? autoReplyEnabled  : (existing?.autoReplyEnabled ?? true),
      greetingMessage:   greetingMessage   !== undefined ? greetingMessage   : existing?.greetingMessage,
      createdAt:         existing?.createdAt ?? new Date().toISOString(),
      updatedAt:         new Date().toISOString(),
    };

    await kv.set(configKey(resolvedWalletAddress), config);

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
    const auth = await requireAuthenticatedWallet(c);
    if (!auth.ok) return auth.response;

    const conversationId = c.req.param('conversationId');
    const canAccess = await ORINAEngine.hasConversationAccess(auth.identity.walletAddress, conversationId);
    if (!canAccess) {
      return c.json({ error: 'Conversation not found or access denied' }, 403);
    }

    const messages = await ORINAEngine.getConversationHistory(auth.identity.walletAddress, conversationId);

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
