import { Hono } from 'npm:hono@4.12.29';
import { ORINAEngine } from './orina-ai-engine-v2.tsx';
import { callNvidiaNIMVision, parseJSONFromLLM, validateVisionImageUrl, validateVisionImageUrls } from './nvidia-nim-client.ts';
import { assertAuthenticatedWalletMatch, requireAuthenticatedWallet } from './request-auth.ts';
import type { AIAssistContext, AIAssistRequest, AIDisputeContext } from './types.ts';
// kv_store import removed — ownership checks now via ORINAEngine.hasConversationAccess
import { checkRateLimit, rateLimitExceededResponse } from './rate-limiter.ts';


// ─── Image size guard ────────────────────────────────────────────────────────
const MAX_IMAGE_BASE64_BYTES = 4 * 1024 * 1024; // 3 MB raw ≈ 4 MB base64

function serializedLength(value: unknown): number {
  try {
    return JSON.stringify(value ?? null).length;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
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
    if (typeof message !== 'string' || message.length > 20_000 || String(conversationId).length > 200) {
      return c.json({ error: 'message or conversationId exceeds the allowed length' }, 413);
    }

    const validContexts: AIAssistContext[] = ['buyer', 'seller', 'arbiter', 'guest'];
    if (!validContexts.includes(agentContext)) {
      return c.json({ error: `Invalid agentContext. Must be one of: ${validContexts.join(', ')}` }, 400);
    }

    // ── Rate limit ───────────────────────────────────────────────────────────
    const resolvedWalletAddress = auth.identity.walletAddress;
    const rateCheck = await checkRateLimit('ai_assist', resolvedWalletAddress);
    if (!rateCheck.allowed) return rateLimitExceededResponse(c, rateCheck);
    const dailyRateCheck = await checkRateLimit('ai_assist_daily', resolvedWalletAddress);
    if (!dailyRateCheck.allowed) return rateLimitExceededResponse(c, dailyRateCheck);

    // ── Image size guard ─────────────────────────────────────────────────────
    const imgs = Array.isArray(imageUrls) ? imageUrls : [];
    if (imgs.length > 0) {
      // Additional rate limit for image requests
      const imgRateCheck = await checkRateLimit('ai_assist_image', resolvedWalletAddress);
      if (!imgRateCheck.allowed) return rateLimitExceededResponse(c, imgRateCheck);
      const imgDailyRateCheck = await checkRateLimit('ai_assist_image_daily', resolvedWalletAddress);
      if (!imgDailyRateCheck.allowed) return rateLimitExceededResponse(c, imgDailyRateCheck);

      const imgCheck = validateVisionImageUrls(imgs);
      if (!imgCheck.valid) {
        return c.json({ error: imgCheck.error }, 413);
      }
    }
    if (
      String(activePage || '').length > 500
      || String(originalMessage || '').length > 20_000
      || serializedLength(clarificationSelections) > 20_000
      || serializedLength(disputeContext) > 50_000
    ) {
      return c.json({ error: 'AI context exceeds the allowed size' }, 413);
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
      error: 'Internal server error',
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
    const rate = await checkRateLimit('ai_conversation_read', auth.identity.walletAddress);
    if (!rate.allowed) return rateLimitExceededResponse(c, rate);

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
    const rate = await checkRateLimit('ai_conversation_read', auth.identity.walletAddress);
    if (!rate.allowed) return rateLimitExceededResponse(c, rate);

    const conversationId = c.req.param('conversationId');
    if (!conversationId || conversationId.length > 200) {
      return c.json({ error: 'Invalid conversationId' }, 400);
    }
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
    const rate = await checkRateLimit('ai_conversation_delete', auth.identity.walletAddress);
    if (!rate.allowed) return rateLimitExceededResponse(c, rate);

    const conversationId = c.req.param('conversationId');
    if (!conversationId || conversationId.length > 200) {
      return c.json({ error: 'Invalid conversationId' }, 400);
    }
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
    const auth = await requireAuthenticatedWallet(c);
    if (!auth.ok) return auth.response;
    const rateCheck = await checkRateLimit('ai_search', auth.identity.walletAddress);
    if (!rateCheck.allowed) return rateLimitExceededResponse(c, rateCheck);

    const { query, category, limit, lang, imageBase64 } = await c.req.json();
    if (
      query !== undefined && typeof query !== 'string'
      || category !== undefined && typeof category !== 'string'
      || lang !== undefined && typeof lang !== 'string'
      || limit !== undefined && (typeof limit !== 'number' || !Number.isFinite(limit))
    ) {
      return c.json({ success: false, error: 'Invalid search input types' }, 400);
    }
    let resolvedQuery = String(query || '').trim();

    // Image search: extract product keywords via NIM Vision
    if (imageBase64 && !resolvedQuery) {
      const imageRate = await checkRateLimit('ai_assist_image', auth.identity.walletAddress);
      if (!imageRate.allowed) return rateLimitExceededResponse(c, imageRate);
      const imageDailyRate = await checkRateLimit('ai_assist_image_daily', auth.identity.walletAddress);
      if (!imageDailyRate.allowed) return rateLimitExceededResponse(c, imageDailyRate);
      if (typeof imageBase64 !== 'string' || imageBase64.length > MAX_IMAGE_BASE64_BYTES) {
        return c.json({ success: false, error: 'Image exceeds 3 MB limit' }, 413);
      }
      const validation = validateVisionImageUrl(imageBase64);
      if (!validation.valid) return c.json({ success: false, error: validation.error }, 400);
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
            console.log('📷 Vision query extraction completed');
          }
        }
      } catch (err) {
        console.error('⚠️ Vision keyword extraction failed (non-fatal):', err);
      }
    }

    if (!resolvedQuery) {
      return c.json({ success: false, error: 'query or imageBase64 is required' }, 400);
    }
    if (resolvedQuery.length > 2_000) {
      return c.json({ success: false, error: 'Search query exceeds 2000 characters' }, 413);
    }
    if (String(category || '').length > 120 || String(lang || '').length > 20) {
      return c.json({ success: false, error: 'Search category or language exceeds the allowed length' }, 413);
    }

    const searchResults = await ORINAEngine.searchQuery(
      resolvedQuery,
      category ? String(category) : undefined,
      typeof limit === 'number' && Number.isFinite(limit) ? Math.min(Math.max(Math.floor(limit), 1), 50) : 12,
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
