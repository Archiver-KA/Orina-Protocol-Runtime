import { projectId, publicAnonKey } from '/utils/supabase/info';
import { getSupabaseFunctionUrl } from '/utils/supabase/functions';

/**
 * Check if IPFS upload is configured (PINATA_JWT is set)
 */
export async function checkIPFSConfigured(): Promise<boolean> {
  try {
    const checkUrl = getSupabaseFunctionUrl('ipfs/check');
    if (!checkUrl || !publicAnonKey) return false;

    const response = await fetch(
      checkUrl,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      }
    );

    const result = await response.json();
    
    return result.configured === true;

  } catch (error) {
    console.error('Error checking IPFS configuration:', error);
    return false;
  }
}

/**
 * Get IPFS setup instructions URL
 */
export function getIPFSSetupUrl(): string {
  return projectId
    ? `https://supabase.com/dashboard/project/${projectId}/settings/functions`
    : 'https://supabase.com/dashboard/projects';
}

/**
 * IPFS Configuration status
 */
export interface IPFSConfig {
  isConfigured: boolean;
  setupUrl: string;
  documentationUrl: string;
}

/**
 * Get IPFS configuration status and URLs
 */
export async function getIPFSConfig(): Promise<IPFSConfig> {
  const isConfigured = await checkIPFSConfigured();
  
  return {
    isConfigured,
    setupUrl: getIPFSSetupUrl(),
    documentationUrl: 'https://docs.pinata.cloud/docs/getting-started',
  };
}
