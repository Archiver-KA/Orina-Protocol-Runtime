import type { AssetDraft, MarketAnalysis, SellerMintingRequest } from '@/app/types/ai-agent';
import { getSupabaseFunctionUrl } from '/utils/supabase/functions';
import { runtimeConfig } from '/utils/runtimeConfig';
import {
  ensureSupabaseBridgeAccessToken,
  getSupabaseBridgeAccessToken,
  isSupabaseAuthClaimBridgeEnabled,
} from '@/utils/supabaseAuthClaimBridge';

export function getSellerMintingFunctionUrl(path = ''): string {
  return getSupabaseFunctionUrl(path, runtimeConfig.supabaseSellerMintingFunctionName);
}

export async function getSellerAIHeaders(walletAddress: string, json = false): Promise<Record<string, string>> {
  if (!walletAddress) {
    throw new Error('Wallet address is required');
  }

  if (isSupabaseAuthClaimBridgeEnabled()) {
    const accessToken = await ensureSupabaseBridgeAccessToken({
      walletAddress,
      promptOnAuthMissing: true,
      securityCheck: {
        title: 'Unlock Seller AI',
        description: 'Seller AI draft generation needs a one-time wallet security check before Orina can call the protected AI service.',
        surfaceLabel: 'Seller AI draft generation',
        confirmLabel: 'Unlock Seller AI',
        helpText: 'This signature unlocks protected Seller AI calls in Orina. No gas fee, transaction, or token approval is involved.',
        successMessage: 'Seller AI unlocked.',
        successDescription: 'Retry the AI draft generation to continue.',
      },
    });
    if (!accessToken) {
      throw new Error('Wallet session authentication required');
    }

    return {
      Authorization: `Bearer ${accessToken}`,
      ...(json ? { 'Content-Type': 'application/json' } : {}),
    };
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

  const draftUrl = getSellerMintingFunctionUrl('generate-draft');
  if (!draftUrl) {
    throw new Error('Supabase function configuration is missing in this environment.');
  }

  const response = await fetch(
    draftUrl,
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
