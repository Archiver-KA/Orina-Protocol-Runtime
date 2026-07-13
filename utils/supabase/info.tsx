import { resolveSupabasePublicConfig } from './publicConfig';

const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};

const resolved = resolveSupabasePublicConfig(env);

if (resolved.warning && typeof console !== 'undefined') {
  console.warn(`[SupabaseConfig] ${resolved.warning}`);
}

export const projectId = resolved.projectId;
export const publicAnonKey = resolved.publicKey;
export const supabaseUrl = resolved.supabaseUrl;
export const publishableKey = resolved.publishableKey;
