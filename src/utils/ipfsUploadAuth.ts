import { publicAnonKey } from '/utils/supabase/info';
import {
  ensureSupabaseBridgeAccessToken,
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
    const token = await ensureSupabaseBridgeAccessToken({
      walletAddress: w,
      promptOnAuthMissing: true,
      securityCheck: {
        title: 'Unlock Secure Uploads',
        description: 'Uploading files to Orina needs a one-time wallet security check before protected IPFS upload routes can start.',
        surfaceLabel: 'IPFS file upload',
        confirmLabel: 'Unlock Uploads',
        helpText: 'This signature unlocks protected uploads in Orina. No gas fee, transaction, or token approval is involved.',
        successMessage: 'Secure uploads unlocked.',
        successDescription: 'Retry the upload to continue.',
      },
    });
    if (!token) {
      throw new Error('Sign in with your wallet (wallet auth message) to upload files.');
    }
    return {
      Authorization: `Bearer ${token}`,
      apikey: publicAnonKey,
    };
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
