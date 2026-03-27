import type { AssetDraft, MarketAnalysis, SellerMintingRequest } from '@/app/types/ai-agent';
import { projectId, publicAnonKey } from '/utils/supabase/info';

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
      headers: {
        Authorization: `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
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
