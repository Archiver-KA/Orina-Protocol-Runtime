import { Hono } from 'npm:hono';
import { ORINAEngine } from './orina-ai-engine-v2.tsx';
import { callNvidiaNIMVision, parseJSONFromLLM } from './nvidia-nim-client.ts';
import { assertAuthenticatedWalletMatch, requireAuthenticatedWallet } from './request-auth.ts';
import type { AIAssistContext, AIAssistRequest, AIDisputeContext } from './types.ts';
// kv_store import removed — ownership checks now via ORINAEngine.hasConversationAccess
import { checkRateLimit, rateLimitExceededResponse } from './rate-limiter.ts';


// ─── Image size guard ────────────────────────────────────────────────────────
const MAX_IMAGE_BASE64_BYTES = 4 * 1024 * 1024; // 3 MB raw ≈ 4 MB base64

function validateImageUrls(imageUrls: string[]): { valid: boolean; error?: string } {
  for (const url of imageUrls) {
    if (url.startsWith('data:') && url.length > MAX_IMAGE_BASE64_BYTES) {
      return { valid: false, error: `Image exceeds 3 MB limit (${Math.round(url.length / 1024)}KB encoded). Please compress or resize.` };
    }
  }
  return { valid: true };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const aiAssist = new Hono();

/**
 * POST /ai/assist
 * Unified AI endpoint — ORINA Engine v2 only.
 * Body: walletAddress, message, conversationId, agentContext, imageUrls?, disputeContext?, activePage?, clarificationSelections?, originalMessage?
 */
aiAssist.post('/assist', async (c) => {
  try {
    const auth = await requireAuthenticatedWallet(c);
    if (!auth.ok) return auth.response;

    const body = await c.req.json();
    const {
      walletAddress, message, conversationId, agentContext,
      imageUrls, disputeContext, activePage, clarificationSelections, originalMessage,
    } = body;

    const walletMismatch = assertAuthenticatedWalletMatch(c, auth.identity, walletAddress, 'walletAddress');
    if (walletMismatch) return walletMismatch;

    // ── Validation ───────────────────────────────────────────────────────────
    if (!message || !conversationId || !agentContext) {
      return c.json({ error: 'Missing required fields: walletAddress, message, conversationId, agentContext' }, 400);
    }

    const validContexts: AIAssistContext[] = ['buyer', 'seller', 'arbiter', 'guest'];
    if (!validContexts.includes(agentContext)) {
      return c.json({ error: `Invalid agentContext. Must be one of: ${validContexts.join(', ')}` }, 400);
    }

    // ── Rate limit ───────────────────────────────────────────────────────────
    const resolvedWalletAddress = auth.identity.walletAddress;
    const rateCheck = await checkRateLimit('ai_assist', resolvedWalletAddress);
    if (!rateCheck.allowed) return rateLimitExceededResponse(c, rateCheck);

    // ── Image size guard ─────────────────────────────────────────────────────
    const imgs = Array.isArray(imageUrls) ? imageUrls : [];
    if (imgs.length > 0) {
      // Additional rate limit for image requests
      const imgRateCheck = await checkRateLimit('ai_assist_image', resolvedWalletAddress);
      if (!imgRateCheck.allowed) return rateLimitExceededResponse(c, imgRateCheck);

      const imgCheck = validateImageUrls(imgs);
      if (!imgCheck.valid) {
        return c.json({ error: imgCheck.error }, 413);
      }
    }

    const request: AIAssistRequest = {
      walletAddress: resolvedWalletAddress,
      message,
      conversationId,
      agentContext,
      imageUrls: imgs.length > 0 ? imgs : undefined,
      disputeContext: disputeContext as AIDisputeContext | undefined,
      activePage: activePage ? String(activePage) : undefined,
      clarificationSelections: Array.isArray(clarificationSelections) ? clarificationSelections : undefined,
      originalMessage: originalMessage ? String(originalMessage) : undefined,
    };

    const response = await ORINAEngine.processAssist(request);

    if (!response.text) {
      const isVietnamese = /[àáảãạăắằẳẵặâấầẩẫậđêếềểễệíìỉĩịôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵ]/.test(message);
      return c.json({
        success: true,
        response: {
          text: isVietnamese
            ? 'Xin chào! Tôi là ORINA AI. Tôi có thể giúp bạn tìm kiếm sản phẩm, quản lý đơn hàng, phân tích thị trường. Bạn cần hỗ trợ gì?'
            : "Hello! I'm ORINA AI. I can help you find products, manage orders, or analyze market trends. What do you need?",
          action: 'general',
        },
      });
    }

    return c.json({ success: true, response });
  } catch (error) {
    console.error('AI Assist error:', error);
    return c.json({
      success: false,
      error: getErrorMessage(error) || 'Internal server error',
      response: {
        text: 'The AI service encountered an error. Please try again in a moment.',
        action: 'error_fallback',
      },
    }, 500);
  }
});

/**
 * GET /ai/conversations/:walletAddress
 * Returns the list of recent AI conversations for a wallet (sorted most-recent first).
 */
aiAssist.get('/conversations/:walletAddress', async (c) => {
  try {
    const auth = await requireAuthenticatedWallet(c);
    if (!auth.ok) return auth.response;

    const walletAddress = c.req.param('walletAddress');
    const walletMismatch = assertAuthenticatedWalletMatch(c, auth.identity, walletAddress, 'walletAddress');
    if (walletMismatch) return walletMismatch;

    const conversations = await ORINAEngine.getConversationList(auth.identity.walletAddress);
    return c.json({ success: true, conversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    return c.json({ error: 'Error retrieving conversations' }, 500);
  }
});

/**
 * GET /ai/conversation/:conversationId
 * Returns all messages for a specific conversation thread.
 */
aiAssist.get('/conversation/:conversationId', async (c) => {
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
    console.error('Get conversation messages error:', error);
    return c.json({ error: 'Error retrieving conversation' }, 500);
  }
});

/**
 * DELETE /ai/conversation/:conversationId
 * Deletes a conversation for the authenticated wallet only.
 */
aiAssist.delete('/conversation/:conversationId', async (c) => {
  try {
    const auth = await requireAuthenticatedWallet(c);
    if (!auth.ok) return auth.response;

    const conversationId = c.req.param('conversationId');
    const walletAddress = c.req.query('walletAddress');

    if (walletAddress) {
      const walletMismatch = assertAuthenticatedWalletMatch(c, auth.identity, walletAddress, 'walletAddress');
      if (walletMismatch) return walletMismatch;
    }

    // ── Ownership check (relational) ────────────────────────────────────────
    const hasAccess = await ORINAEngine.hasConversationAccess(auth.identity.walletAddress, conversationId);
    if (!hasAccess) {
      return c.json({ error: 'Conversation not found or access denied' }, 403);
    }

    await ORINAEngine.deleteConversation(auth.identity.walletAddress, conversationId);
    return c.json({ success: true });
  } catch (error) {
    console.error('Delete conversation error:', error);
    return c.json({ error: 'Error deleting conversation' }, 500);
  }
});

/**
 * POST /ai/search
 * Standalone semantic product search.
 * Body: query?, imageBase64?, category?, limit?, lang?
 */
aiAssist.post('/search', async (c) => {
  try {
    const { query, category, limit, lang, imageBase64 } = await c.req.json();
    let resolvedQuery: string = (query ?? '').trim();

    // Image search: extract product keywords via NIM Vision
    if (imageBase64 && !resolvedQuery) {
      if (imageBase64.length > MAX_IMAGE_BASE64_BYTES) {
        return c.json({ success: false, error: 'Image exceeds 3 MB limit' }, 413);
      }
      console.log('📷 Image search: extracting keywords via NIM Vision');
      try {
        const visionResult = await callNvidiaNIMVision(
          'You are a product recognition AI. Identify the main product in the image and output ONLY valid JSON.',
          'What product is in this image? Reply ONLY with this exact JSON (no other text): {"keywords": "product-name synonym1 synonym2 synonym3", "category": "category name"}',
          [imageBase64],
          { maxTokens: 80, temperature: 0.1, enableDenoising: false },
        );
        if (visionResult.success) {
          const parsed = parseJSONFromLLM<{ keywords: string; category?: string }>(visionResult.content);
          if (parsed?.keywords) {
            resolvedQuery = parsed.keywords.trim();
            console.log('📷 Vision extracted query:', resolvedQuery);
          }
        }
      } catch (err) {
        console.error('⚠️ Vision keyword extraction failed (non-fatal):', err);
      }
    }

    if (!resolvedQuery) {
      return c.json({ success: false, error: 'query or imageBase64 is required' }, 400);
    }

    const searchResults = await ORINAEngine.searchQuery(
      resolvedQuery,
      category ? String(category) : undefined,
      typeof limit === 'number' ? limit : 12,
      lang ? String(lang) : undefined,
    );

    const { results, isVectorSearch, chatResponse } = searchResults as {
      results: any[]; isVectorSearch: boolean; chatResponse?: string;
    };

    return c.json({
      success: true, results, isVectorSearch,
      chatResponse: chatResponse || '',
      extractedQuery: resolvedQuery,
    });
  } catch (error) {
    console.error('AI search error:', error);
    return c.json({ success: false, error: 'Search failed' }, 500);
  }
});

export default aiAssist;
