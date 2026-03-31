import {
  AIAgentConfig,
  AIAssistContext,
  AIAssistRequest,
  AIConversationMessage,
  AIConversationMeta,
  AIDisputeContext,
  AIProductResult,
  AIStructuredResponse,
} from '@/app/types/ai-agent';
import { publicAnonKey } from '/utils/supabase/info';
import { getSupabaseFunctionsBaseUrl } from '/utils/supabase/functions';
import {
  ensureSupabaseBridgeAccessToken,
  getSupabaseBridgeAccessToken,
  isBridgeAuthRequiredError,
  isSupabaseAuthClaimBridgeEnabled,
} from '@/utils/supabaseAuthClaimBridge';

const BASE_URL = getSupabaseFunctionsBaseUrl();
const AI_AGENT_CONFIG_CACHE = new Map<string, AIAgentConfig>();

const publicHeaders = publicAnonKey ? { Authorization: `Bearer ${publicAnonKey}` } : {};
const publicJsonHeaders = { ...publicHeaders, 'Content-Type': 'application/json' };

function buildAISecurityCheck(surfaceLabel: string, confirmLabel = 'Unlock AI') {
  return {
    title: 'Unlock AI Workspace',
    description: 'AI assistants and AI settings need a one-time wallet security check before Orina can load protected AI data.',
    surfaceLabel,
    confirmLabel,
    helpText: 'This signature only unlocks your protected AI workspace in Orina. No gas fee, transaction, or token approval is involved.',
    successMessage: 'AI workspace unlocked.',
    successDescription: 'Retry the AI action to continue.',
  } as const;
}

async function getProtectedHeaders(
  walletAddress: string,
  opts?: { promptOnAuthMissing?: boolean; securityCheckLabel?: string; confirmLabel?: string },
): Promise<Record<string, string>> {
  if (!walletAddress) {
    throw new Error('Wallet address is required');
  }

  if (isSupabaseAuthClaimBridgeEnabled()) {
    const accessToken = await ensureSupabaseBridgeAccessToken({
      walletAddress,
      promptOnAuthMissing: opts?.promptOnAuthMissing,
      securityCheck: buildAISecurityCheck(
        opts?.securityCheckLabel || 'AI workspace',
        opts?.confirmLabel || 'Unlock AI',
      ),
    });
    if (!accessToken) {
      throw new Error('Wallet session authentication required');
    }
    return {
      Authorization: `Bearer ${accessToken}`,
    };
  }

  const accessToken = getSupabaseBridgeAccessToken();
  if (!accessToken) {
    throw new Error('Wallet session authentication required');
  }

  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

async function getProtectedJsonHeaders(
  walletAddress: string,
  opts?: { promptOnAuthMissing?: boolean; securityCheckLabel?: string; confirmLabel?: string },
): Promise<Record<string, string>> {
  return {
    ...(await getProtectedHeaders(walletAddress, opts)),
    'Content-Type': 'application/json',
  };
}

export class AIAgentClient {
  static peekConfig(walletAddress: string): AIAgentConfig | null {
    return AI_AGENT_CONFIG_CACHE.get(walletAddress.toLowerCase()) || null;
  }

  // ─── V2 — ORINA AI Assist ───────────────────────────────────────────────────

  /**
   * Send a message to the ORINA AI assistant and get a structured response.
   */
  static async sendAssist(params: {
    walletAddress: string;
    message: string;
    conversationId: string;
    agentContext: AIAssistContext;
    imageUrls?: string[];
    disputeContext?: AIDisputeContext;
    activePage?: string;
    clarificationSelections?: string[];
    originalMessage?: string;
  }): Promise<AIStructuredResponse | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 55000); // 55s timeout

    /** Inner fetch with HTTP status validation */
    const attempt = async (headers: Record<string, string>): Promise<AIStructuredResponse | null> => {
      if (!BASE_URL) return null;
      const response = await fetch(`${BASE_URL}/ai/assist`, {
        method: 'POST',
        headers,
        body: JSON.stringify(params),
        signal: controller.signal,
      });

      // Validate HTTP status BEFORE calling .json() — prevents crash on HTML error pages
      if (!response.ok) {
        const statusText = await response.text().catch(() => '');
        console.error(`[AI] /ai/assist HTTP ${response.status}:`, statusText.slice(0, 200));
        // Try to extract JSON error if the body is valid JSON
        try {
          const parsed = JSON.parse(statusText);
          if (parsed.response?.text) return parsed.response as AIStructuredResponse;
        } catch { /* not JSON — continue to error fallback */ }
        return null; // signals transient failure for retry
      }

      const data = await response.json();
      return data.success ? (data.response as AIStructuredResponse) : null;
    };

    try {
      const headers = await getProtectedJsonHeaders(params.walletAddress, {
        promptOnAuthMissing: true,
        securityCheckLabel: 'AI assistant',
        confirmLabel: 'Unlock AI',
      });

      // First attempt
      const result = await attempt(headers);
      if (result) return result;

      // Retry once after 2s delay on transient failure (null result = HTTP error or success:false)
      console.warn('[AI] First attempt failed, retrying in 2s...');
      await new Promise(r => setTimeout(r, 2000));
      if (controller.signal.aborted) {
        return { action: 'error_fallback', text: 'Connection timed out. The server is taking too long to respond. Please try again.' };
      }

      const retryResult = await attempt(headers);
      if (retryResult) return retryResult;

      // Both attempts failed — return descriptive error instead of null
      return { action: 'error_fallback', text: 'The AI service is temporarily unavailable. Please try again in a moment.' };
    } catch (err: any) {
      if (isBridgeAuthRequiredError(err)) {
        return {
          action: 'error_fallback',
          text: 'Confirm the wallet security check in Orina, then send your AI request again.',
        };
      }
      if (err.message === 'Wallet session authentication required') {
        return {
          action: 'error_fallback',
          text: 'Your wallet session is not authenticated. Please sign in with your wallet and try again.',
        };
      }
      if (err.name === 'AbortError') {
        return { action: 'error_fallback', text: 'Connection timed out. The server is taking too long to respond. Please try again.' };
      }
      console.error('[AI] sendAssist error:', err);
      return { action: 'error_fallback', text: 'A network error occurred. Please check your connection and try again.' };
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * List all conversation threads for a wallet address.
   */
  static async getConversations(walletAddress: string): Promise<AIConversationMeta[]> {
    try {
      if (!BASE_URL) return [];
      const headers = await getProtectedHeaders(walletAddress);
      const response = await fetch(`${BASE_URL}/ai/conversations/${walletAddress}`, {
        headers,
      });
      const data = await response.json();
      return data.success ? (data.conversations as AIConversationMeta[]) : [];
    } catch {
      return [];
    }
  }

  /**
   * Get all messages for a specific conversation thread.
   */
  static async getConversationMessages(walletAddress: string, conversationId: string): Promise<AIConversationMessage[]> {
    try {
      if (!BASE_URL) return [];
      const headers = await getProtectedHeaders(walletAddress);
      const response = await fetch(`${BASE_URL}/ai/conversation/${conversationId}`, {
        headers,
      });
      const data = await response.json();
      return data.success ? (data.messages as AIConversationMessage[]) : [];
    } catch {
      return [];
    }
  }

  /**
   * Delete a conversation thread from the wallet's history.
   */
  static async deleteConversation(walletAddress: string, conversationId: string): Promise<boolean> {
    try {
      if (!BASE_URL) return false;
      const headers = await getProtectedHeaders(walletAddress, {
        promptOnAuthMissing: true,
        securityCheckLabel: 'AI conversations',
        confirmLabel: 'Unlock AI',
      });
      const response = await fetch(
        `${BASE_URL}/ai/conversation/${conversationId}?walletAddress=${walletAddress}`,
        { method: 'DELETE', headers },
      );
      const data = await response.json();
      return data.success === true;
    } catch {
      return false;
    }
  }

  /**
   * Semantic / vector product search.
   * Supports text queries (multilingual) and image search (base64).
   */
  static async searchProducts(
    query: string,
    options?: { category?: string; limit?: number; lang?: string; imageBase64?: string },
  ): Promise<{ results: AIProductResult[]; isVectorSearch: boolean; chatResponse?: string; extractedQuery?: string } | null> {
    try {
      if (!BASE_URL || !publicAnonKey) return null;
      const response = await fetch(`${BASE_URL}/ai/search`, {
        method: 'POST',
        headers: publicJsonHeaders,
        body: JSON.stringify({ query, ...options }),
      });
      const data = await response.json();
      return data.success
        ? {
            results: data.results ?? [],
            isVectorSearch: data.isVectorSearch ?? false,
            chatResponse: data.chatResponse,
            extractedQuery: data.extractedQuery,
          }
        : null;
    } catch {
      return null;
    }
  }

  // ─── Legacy methods (kept for backwards compatibility) ──────────────────────

  static async sendMessage(
    sellerAddress: string,
    message: string,
    conversationId: string,
    ): Promise<AIConversationMessage | null> {
    try {
      if (!BASE_URL) return null;
      const headers = await getProtectedJsonHeaders(sellerAddress, {
        promptOnAuthMissing: true,
        securityCheckLabel: 'AI chat',
        confirmLabel: 'Unlock AI',
      });
      const response = await fetch(`${BASE_URL}/ai/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ sellerAddress, message, conversationId }),
      });
      const data = await response.json();
      return data.success ? data.response : null;
    } catch {
      return null;
    }
  }

  static async getConfig(walletAddress: string): Promise<AIAgentConfig | null> {
    try {
      if (!BASE_URL) return null;
      const headers = await getProtectedHeaders(walletAddress);
      const response = await fetch(`${BASE_URL}/ai/config/${walletAddress}`, { headers });
      const data = await response.json();
      if (!data.success || !data.config) return null;
      AI_AGENT_CONFIG_CACHE.set(walletAddress.toLowerCase(), data.config as AIAgentConfig);
      return data.config as AIAgentConfig;
    } catch {
      return null;
    }
  }

  static async saveConfig(config: Partial<AIAgentConfig> & { walletAddress: string }): Promise<boolean> {
    try {
      if (!BASE_URL) return false;
      const headers = await getProtectedJsonHeaders(config.walletAddress, {
        promptOnAuthMissing: true,
        securityCheckLabel: 'AI settings',
        confirmLabel: 'Unlock AI',
      });
      const response = await fetch(`${BASE_URL}/ai/config`, {
        method: 'POST',
        headers,
        body: JSON.stringify(config),
      });
      const data = await response.json();
      return data.success;
    } catch {
      return false;
    }
  }

  static async getConversationHistory(walletAddress: string, conversationId: string): Promise<AIConversationMessage[]> {
    return this.getConversationMessages(walletAddress, conversationId);
  }

  static async isAIAgentEnabled(walletAddress: string): Promise<boolean> {
    const config = await this.getConfig(walletAddress);
    return config ? config.enabled : false;
  }
}
