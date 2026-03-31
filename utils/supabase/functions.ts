import { supabaseUrl } from '/utils/supabase/info';
import { runtimeConfig } from '/utils/runtimeConfig';

export function getSupabaseFunctionsNamespace(): string {
  return runtimeConfig.supabaseFunctionsNamespace;
}

export function getSupabaseFunctionsBaseUrl(): string {
  const namespace = getSupabaseFunctionsNamespace();
  if (!supabaseUrl || !namespace) return '';
  return `${supabaseUrl.replace(/\/+$/, '')}/functions/v1/${namespace}`;
}

export function getSupabaseFunctionUrl(path = ''): string {
  const baseUrl = getSupabaseFunctionsBaseUrl();
  if (!baseUrl) return '';

  const normalizedPath = String(path || '').replace(/^\/+/, '');
  return normalizedPath ? `${baseUrl}/${normalizedPath}` : baseUrl;
}
