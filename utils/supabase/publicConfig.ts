export type SupabasePublicEnv = Record<string, string | undefined>;

export interface ResolvedSupabasePublicConfig {
  projectId: string;
  publicKey: string;
  publishableKey: string;
  supabaseUrl: string;
  source: 'environment' | 'disabled';
  warning: string;
}

function readValue(env: SupabasePublicEnv, name: string): string {
  return String(env[name] || '').trim();
}

function projectIdFromUrl(value: string): string {
  if (!value) return '';
  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname.toLowerCase();
    const suffix = '.supabase.co';
    const projectId = hostname.endsWith(suffix) ? hostname.slice(0, -suffix.length) : '';
    if (
      parsed.protocol !== 'https:'
      || parsed.username
      || parsed.password
      || parsed.port && parsed.port !== '443'
      || parsed.pathname !== '/'
      || parsed.search
      || parsed.hash
      || !/^[a-z0-9]{10,64}$/.test(projectId)
    ) return '';
    return projectId;
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
  const incomplete = !effectiveProjectId || !configuredKey;

  if (invalidUrl || identityMismatch || keyMismatch || incomplete) {
    return {
      projectId: '',
      publicKey: '',
      publishableKey: '',
      supabaseUrl: '',
      source: 'disabled',
      warning: 'Supabase environment config is incomplete or inconsistent; remote access is disabled to prevent cross-environment data access.',
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
