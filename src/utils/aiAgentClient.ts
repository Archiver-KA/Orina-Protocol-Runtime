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
import { projectId, publicAnonKey } from '/utils/supabase/info';
import {
  exchangeWalletAuthForSupabaseClaimSession,
  getSupabaseBridgeAccessToken,
  isSupabaseAuthClaimBridgeEnabled,
} from '@/utils/supabaseAuthClaimBridge';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-b0d68fc8`;

const publicHeaders = {
  Authorization: `Bearer ${publicAnonKey}`,
};
const publicJsonHeaders = { ...publicHeaders, 'Content-Type': 'application/json' };

async function getProtectedHeaders(walletAddress: string): Promise<Record<string, string>> {
  if (!walletAddress) {
    throw new Error('Wallet address is required');
  }

  if (isSupabaseAuthClaimBridgeEnabled()) {
    await exchangeWalletAuthForSupabaseClaimSession(walletAddress);
  }

  const accessToken = getSupabaseBridgeAccessToken();
  if (!accessToken) {
    throw new Error('Wallet session authentication required');
  }

  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

async function getProtectedJsonHeaders(walletAddress: string): Promise<Record<string, string>> {
  return {
    ...(await getProtectedHeaders(walletAddress)),
    'Content-Type': 'application/json',
  };
}

export class AIAgentClient {
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
      const headers = await getProtectedJsonHeaders(params.walletAddress);

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
      const headers = await getProtectedHeaders(walletAddress);
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
      const headers = await getProtectedJsonHeaders(sellerAddress);
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
      const headers = await getProtectedHeaders(walletAddress);
      const response = await fetch(`${BASE_URL}/ai/config/${walletAddress}`, { headers });
      const data = await response.json();
      return data.success ? data.config : null;
    } catch {
      return null;
    }
  }

  static async saveConfig(config: Partial<AIAgentConfig> & { walletAddress: string }): Promise<boolean> {
    try {
      const headers = await getProtectedJsonHeaders(config.walletAddress);
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
