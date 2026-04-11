import { supabaseUrl } from '/utils/supabase/info';
import { runtimeConfig } from '/utils/runtimeConfig';

export function getSupabaseFunctionsNamespace(): string {
  return runtimeConfig.supabaseFunctionsNamespace;
}

export function getSupabaseFunctionsBaseUrl(functionName?: string): string {
  const namespace = String(functionName || '').trim() || getSupabaseFunctionsNamespace();
  if (!supabaseUrl || !namespace) return '';
  return `${supabaseUrl.replace(/\/+$/, '')}/functions/v1/${namespace}`;
}

export function getSupabaseFunctionUrl(path = '', functionName?: string): string {
  const baseUrl = getSupabaseFunctionsBaseUrl(functionName);
  if (!baseUrl) return '';

  const normalizedPath = String(path || '').replace(/^\/+/, '');
  return normalizedPath ? `${baseUrl}/${normalizedPath}` : baseUrl;
}
