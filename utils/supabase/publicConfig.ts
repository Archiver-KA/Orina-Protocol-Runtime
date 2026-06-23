export type SupabasePublicEnv = Record<string, string | undefined>;

export interface SupabasePublicFallback {
  projectId: string;
  publicKey: string;
}

export interface ResolvedSupabasePublicConfig {
  projectId: string;
  publicKey: string;
  publishableKey: string;
  supabaseUrl: string;
  source: 'environment' | 'fallback' | 'disabled';
  warning: string;
}

function readValue(env: SupabasePublicEnv, name: string): string {
  return String(env[name] || '').trim();
}

function projectIdFromUrl(value: string): string {
  if (!value) return '';
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    const suffix = '.supabase.co';
    return hostname.endsWith(suffix) ? hostname.slice(0, -suffix.length) : '';
  } catch {
    return '';
  }
}

function projectIdFromJwt(value: string): string {
  const payload = value.split('.')[1];
  if (!payload) return '';
  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const decoded = typeof atob === 'function'
      ? atob(padded)
      : '';
    return String(JSON.parse(decoded)?.ref || '').trim();
  } catch {
    return '';
  }
}

export function resolveSupabasePublicConfig(
  env: SupabasePublicEnv,
  fallback: SupabasePublicFallback,
  fallbackEnabled: boolean,
): ResolvedSupabasePublicConfig {
  const configuredUrl = readValue(env, 'VITE_SUPABASE_URL').replace(/\/+$/, '');
  const configuredProjectId = readValue(env, 'VITE_SUPABASE_PROJECT_ID');
  const configuredPublishableKey = readValue(env, 'VITE_SUPABASE_PUBLISHABLE_KEY');
  const configuredKey =
    readValue(env, 'VITE_SUPABASE_ANON_KEY') ||
    readValue(env, 'VITE_SUPABASE_LEGACY_ANON_KEY') ||
    configuredPublishableKey;
  const urlProjectId = projectIdFromUrl(configuredUrl);
  const jwtProjectId = projectIdFromJwt(configuredKey);
  const effectiveProjectId = urlProjectId || configuredProjectId;

  const invalidUrl = Boolean(configuredUrl && !urlProjectId);
  const identityMismatch = Boolean(
    urlProjectId && configuredProjectId && urlProjectId !== configuredProjectId,
  );
  const keyMismatch = Boolean(jwtProjectId && effectiveProjectId && jwtProjectId !== effectiveProjectId);
  const nonCanonicalProject = Boolean(
    fallbackEnabled && effectiveProjectId && effectiveProjectId !== fallback.projectId,
  );
  const incomplete = !effectiveProjectId || !configuredKey;
  const shouldUseFallback = fallbackEnabled && (
    invalidUrl || identityMismatch || keyMismatch || nonCanonicalProject || incomplete
  );

  if (shouldUseFallback) {
    return {
      projectId: fallback.projectId,
      publicKey: fallback.publicKey,
      publishableKey: '',
      supabaseUrl: `https://${fallback.projectId}.supabase.co`,
      source: 'fallback',
      warning: 'Supabase environment config was missing, stale, or inconsistent; canonical fallback applied.',
    };
  }

  if (invalidUrl || identityMismatch || keyMismatch || incomplete) {
    return {
      projectId: '',
      publicKey: '',
      publishableKey: '',
      supabaseUrl: '',
      source: 'disabled',
      warning: 'Supabase environment config is incomplete or inconsistent; remote access disabled.',
    };
  }

  return {
    projectId: effectiveProjectId,
    publicKey: configuredKey,
    publishableKey: configuredPublishableKey,
    supabaseUrl: configuredUrl || `https://${effectiveProjectId}.supabase.co`,
    source: 'environment',
    warning: '',
  };
}
