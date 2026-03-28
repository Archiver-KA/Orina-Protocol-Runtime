import { APIKey, APIKeyPermission } from './types.ts';
import * as kv from './kv_store.tsx';

// Authentication middleware
export async function authenticateAPIKey(apiKey: string): Promise<{ valid: boolean; key?: APIKey; error?: string }> {
  if (!apiKey || !apiKey.startsWith('sk_seller_')) {
    return { valid: false, error: 'Invalid API key format' };
  }

  // Get from KV store
  const storedKey = await kv.get<APIKey>(`api_key:${apiKey}`);
  
  if (!storedKey) {
    return { valid: false, error: 'API key not found' };
  }

  if (!storedKey.isActive) {
    return { valid: false, error: 'API key has been revoked' };
  }

  if (storedKey.expiresAt && new Date(storedKey.expiresAt) < new Date()) {
    return { valid: false, error: 'API key has expired' };
  }

  // Update last used timestamp
  await updateKeyLastUsed(apiKey, storedKey);

  return { valid: true, key: storedKey };
}

export function hasPermission(key: APIKey, required: APIKeyPermission): boolean {
  return key.permissions.includes(required);
}

// Store API key in KV store
export async function storeAPIKey(key: APIKey): Promise<void> {
  const kvKey = `api_key:${key.key}`;
  const kvIdKey = `api_key_id:${key.id}`;
  const walletKeysKey = `wallet_keys:${key.walletAddress}`;

  // Store key data
  await kv.set(kvKey, key);

  // Store ID mapping
  await kv.set(kvIdKey, key.key);

  // Update wallet's key list
  const walletKeys = await getWalletKeys(key.walletAddress);
  if (!walletKeys.includes(key.id)) {
    walletKeys.push(key.id);
    await kv.set(walletKeysKey, walletKeys);
  }
}

export async function getAPIKeyById(keyId: string): Promise<APIKey | null> {
  try {
    const apiKey = await kv.get<string>(`api_key_id:${keyId}`);
    if (!apiKey) return null;
    
    return await kv.get<APIKey>(`api_key:${apiKey}`);
  } catch {
    return null;
  }
}

export async function getWalletKeys(walletAddress: string): Promise<string[]> {
  try {
    const keys = await kv.get<string[]>(`wallet_keys:${walletAddress}`);
    return keys || [];
  } catch {
    return [];
  }
}

export async function getAllKeysForWallet(walletAddress: string): Promise<APIKey[]> {
  const keyIds = await getWalletKeys(walletAddress);
  const keys: APIKey[] = [];
  
  for (const keyId of keyIds) {
    const key = await getAPIKeyById(keyId);
    if (key) {
      keys.push(key);
    }
  }
  
  return keys;
}

async function updateKeyLastUsed(apiKey: string, key: APIKey): Promise<void> {
  key.lastUsedAt = new Date().toISOString();
  key.usageStats.totalRequests += 1;
  await kv.set(`api_key:${apiKey}`, key);
}

export async function logAPIUsage(
  keyId: string,
  endpoint: string,
  success: boolean,
  responseTime: number
): Promise<void> {
  const logKey = `api_usage:${keyId}:${Date.now()}`;
  const logData = {
    keyId,
    endpoint,
    success,
    responseTime,
    timestamp: new Date().toISOString()
  };

  await kv.set(logKey, logData);
  console.log('API Usage:', logData);
}
