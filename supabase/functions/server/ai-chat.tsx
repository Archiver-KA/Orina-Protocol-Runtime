// ai-chat.tsx — v2 rewrite: uses ORINAEngine + agent_configs table directly
// Legacy AIAgentEngine (rule-based) fully removed.

import { Hono } from 'npm:hono';
import { AIAgentConfig } from './types.ts';
import { createClient } from 'npm:@supabase/supabase-js';
import { ORINAEngine } from './orina-ai-engine-v2.tsx';
import { assertAuthenticatedWalletMatch, requireAuthenticatedWallet } from './request-auth.ts';

const aiChat = new Hono();

function getSupabaseClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) throw new Error('Missing Supabase env vars');
  return createClient(url, serviceKey);
}

async function getStoredConfig(walletAddress: string): Promise<AIAgentConfig | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('agent_configs')
    .select('*')
    .eq('wallet_address', walletAddress)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: String(data.id),
    walletAddress: data.wallet_address,
    enabled: data.auto_reply ?? false,
    name: data.persona || 'AI Assistant',
    behavior: 'moderate',
    autoReplyEnabled: data.auto_reply ?? false,
    greetingMessage: (data.metadata as any)?.greetingMessage,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  } as AIAgentConfig;
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

    const resolvedWalletAddress = auth.identity.walletAddress;
    const supabase = getSupabaseClient();
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

    await supabase
      .from('agent_configs')
      .upsert({
        wallet_address: resolvedWalletAddress,
        persona: config.name || 'AI Assistant',
        auto_reply: config.autoReplyEnabled ?? config.enabled,
        metadata: {
          behavior: config.behavior,
          greetingMessage: config.greetingMessage,
          enabled: config.enabled,
        },
      }, { onConflict: 'wallet_address' });

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
