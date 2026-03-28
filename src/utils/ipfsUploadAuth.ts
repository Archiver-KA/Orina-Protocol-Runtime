import { publicAnonKey } from '/utils/supabase/info';
import {
  exchangeWalletAuthForSupabaseClaimSession,
  getSupabaseBridgeAccessToken,
  isSupabaseAuthClaimBridgeEnabled,
} from '@/utils/supabaseAuthClaimBridge';

/**
 * Headers for authenticated IPFS uploads (Edge requires H1 bridge JWT, not anon-only).
 */
export async function getIpfsUploadAuthHeaders(walletAddress: string): Promise<Record<string, string>> {
  const w = String(walletAddress || '').trim();
  if (!w) {
    throw new Error('Wallet address is required to upload to IPFS.');
  }

  if (isSupabaseAuthClaimBridgeEnabled()) {
    await exchangeWalletAuthForSupabaseClaimSession(w);
  }

  const token = getSupabaseBridgeAccessToken();
  if (!token) {
    throw new Error('Sign in with your wallet (wallet auth message) to upload files.');
  }

  return {
    Authorization: `Bearer ${token}`,
    apikey: publicAnonKey,
  };
}
