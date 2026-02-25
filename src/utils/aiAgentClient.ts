import { AIConversationMessage, AIAgentConfig } from '@/app/types/ai-agent';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-b0d68fc8`;

export class AIAgentClient {
  /**
   * Send message to AI Agent and get response
   */
  static async sendMessage(
    sellerAddress: string,
    message: string,
    conversationId: string
  ): Promise<AIConversationMessage | null> {
    try {
      const response = await fetch(`${BASE_URL}/ai/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sellerAddress,
          message,
          conversationId
        })
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('AI Agent error:', error);
        return null;
      }

      const data = await response.json();
      return data.success ? data.response : null;
    } catch (error) {
      console.error('Error sending message to AI Agent:', error);
      return null;
    }
  }

  /**
   * Get AI Agent config for seller
   */
  static async getConfig(walletAddress: string): Promise<AIAgentConfig | null> {
    try {
      const response = await fetch(`${BASE_URL}/ai/config/${walletAddress}`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.success ? data.config : null;
    } catch (error) {
      console.error('Error fetching AI Agent config:', error);
      return null;
    }
  }

  /**
   * Save AI Agent config
   */
  static async saveConfig(config: Partial<AIAgentConfig> & { walletAddress: string }): Promise<boolean> {
    try {
      const response = await fetch(`${BASE_URL}/ai/config`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Error saving AI Agent config:', error);
      return false;
    }
  }

  /**
   * Get conversation history
   */
  static async getConversationHistory(conversationId: string): Promise<AIConversationMessage[]> {
    try {
      const response = await fetch(`${BASE_URL}/ai/conversation/${conversationId}`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.success ? data.messages : [];
    } catch (error) {
      console.error('Error fetching conversation history:', error);
      return [];
    }
  }

  /**
   * Check if seller has AI Agent enabled
   */
  static async isAIAgentEnabled(walletAddress: string): Promise<boolean> {
    const config = await this.getConfig(walletAddress);
    return config ? config.enabled : false;
  }
}
