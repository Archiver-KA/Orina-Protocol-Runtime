import { projectId, publicAnonKey } from '/utils/supabase/info';

/**
 * Check if IPFS upload is configured (PINATA_JWT is set)
 */
export async function checkIPFSConfigured(): Promise<boolean> {
  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-b0d68fc8/ipfs/check`,
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
  return `https://supabase.com/dashboard/project/${projectId}/settings/functions`;
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