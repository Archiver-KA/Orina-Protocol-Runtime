import type { AssetDraft, MarketAnalysis, SellerMintingRequest } from '@/app/types/ai-agent';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import {
  exchangeWalletAuthForSupabaseClaimSession,
  getSupabaseBridgeAccessToken,
  isSupabaseAuthClaimBridgeEnabled,
} from '@/utils/supabaseAuthClaimBridge';

export async function getSellerAIHeaders(walletAddress: string, json = false): Promise<Record<string, string>> {
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
    ...(json ? { 'Content-Type': 'application/json' } : {}),
  };
}

/**
 * Call the AI generate-draft endpoint.
 * Returns LLM-generated name, description, attributes, price + market analysis.
 */
export async function generateAssetDraft(
  sellerId: string,
  imageUrls: string[],
  category: string,
  subcategory?: string,
  overrideName?: string,
  overrideDescription?: string
): Promise<{ draft: AssetDraft; analysis: MarketAnalysis }> {
  const request: SellerMintingRequest = {
    sellerId,
    imageUrls,
    category,
    subcategory,
    overrideName,
    overrideDescription,
  };

  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-b0d68fc8/ai/seller/generate-draft`,
    {
      method: 'POST',
      headers: await getSellerAIHeaders(sellerId, true),
      body: JSON.stringify(request),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to generate asset draft');
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Draft generation failed');
  }

  return { draft: data.draft, analysis: data.analysis };
}
