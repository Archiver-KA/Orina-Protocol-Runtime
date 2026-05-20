import { publicAnonKey, supabaseUrl } from '/utils/supabase/info';
import {
  ensureSupabaseBridgeAccessToken,
  getSupabaseBridgeAccessToken,
  isSupabaseAuthClaimBridgeEnabled,
} from '@/utils/supabaseAuthClaimBridge';
import {
  isResilienceError,
  resilientFetch,
  type ResilientFetchPolicy,
} from '@/utils/resilience';

type Json = Record<string, any> | any[];

export class SupabaseRestError extends Error {
  status?: number;
  payload?: any;

  constructor(message: string, status?: number, payload?: any) {
    super(message);
    this.name = 'SupabaseRestError';
    this.status = status;
    this.payload = payload;
  }
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof fetch === 'function';
}

export function isSupabaseRestEnabled(): boolean {
  return isBrowser() && !!supabaseUrl && !!publicAnonKey;
}

function restBase(): string {
  return `${supabaseUrl.replace(/\/+$/, '')}/rest/v1`;
}

function buildHeaders(extra?: Record<string, string>): Record<string, string> {
  const bearerToken = getSupabaseBridgeAccessToken() || publicAnonKey;
  return {
    apikey: publicAnonKey,
    Authorization: `Bearer ${bearerToken}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

function buildUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${restBase()}${normalized}`;
}

function buildRestResiliencePolicy(path: string, init: RequestInit): ResilientFetchPolicy {
  const method = String(init.method || 'GET').toUpperCase();
  const isRead = method === 'GET' || method === 'HEAD';
  const tableOrRpc = path.split('?')[0]?.replace(/^\/+/, '').replace(/\//g, ':') || 'unknown';
  return {
    operation: `supabase-rest:${method.toLowerCase()}:${tableOrRpc}`,
    timeoutMs: isRead ? 8_000 : 10_000,
    retry: {
      maxAttempts: isRead ? 3 : 1,
      baseDelayMs: 250,
      maxDelayMs: 1_500,
    },
    circuit: {
      key: isRead ? 'supabase-rest-read' : 'supabase-rest-write',
      failureThreshold: isRead ? 4 : 2,
      openMs: isRead ? 15_000 : 30_000,
    },
  };
}

async function requestJson<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  if (!isSupabaseRestEnabled()) {
    throw new SupabaseRestError('Supabase REST is not configured');
  }

  if (isSupabaseAuthClaimBridgeEnabled() && !getSupabaseBridgeAccessToken()) {
    try {
      await ensureSupabaseBridgeAccessToken({ promptOnAuthMissing: false });
    } catch (error) {
      // Fall back to anon key path until bridge is fully deployed/available.
      console.debug('[SupabaseRest] Claim bridge exchange skipped:', error);
    }
  }

  let res: Response;
  try {
    res = await resilientFetch(
      buildUrl(path),
      {
        ...init,
        headers: buildHeaders(init.headers as Record<string, string> | undefined),
      },
      buildRestResiliencePolicy(path, init),
    );
  } catch (error) {
    if (isResilienceError(error)) {
      throw new SupabaseRestError(error.message, undefined, {
        resilienceCode: error.code,
        operation: error.operation,
        requestId: error.requestId,
      });
    }
    throw error;
  }

  const text = await res.text();
  let payload: any = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!res.ok) {
    const message =
      payload?.message ||
      payload?.error ||
      payload?.hint ||
      `Supabase REST error ${res.status}`;
    throw new SupabaseRestError(message, res.status, payload);
  }

  return payload as T;
}

export function encodeEq(value: string | number | boolean | null): string {
  if (value === null) return 'is.null';
  return `eq.${encodeURIComponent(String(value))}`;
}

export function encodeIn(values: string[]): string {
  if (values.length === 0) return 'in.()';
  const encoded = values.map((v) => `"${String(v).replace(/"/g, '\\"')}"`).join(',');
  return `in.(${encoded})`;
}

export function toQuery(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => typeof v === 'string' && v.length > 0);
  if (entries.length === 0) return '';
  return `?${entries.map(([k, v]) => `${k}=${v}`).join('&')}`;
}

export async function restSelect<T = any>(table: string, query = ''): Promise<T[]> {
  return requestJson<T[]>(`/${table}${query}`);
}

export async function restInsert<T = any>(table: string, rows: Json, query = ''): Promise<T[]> {
  return requestJson<T[]>(`/${table}${query}`, {
    method: 'POST',
    headers: {
      Prefer: 'return=representation',
    },
    body: JSON.stringify(rows),
  });
}

export async function restUpsert<T = any>(
  table: string,
  rows: Json,
  opts?: { onConflict?: string; ignoreDuplicates?: boolean }
): Promise<T[]> {
  const query = opts?.onConflict ? toQuery({ on_conflict: opts.onConflict }) : '';
  const prefer = [
    'return=representation',
    opts?.ignoreDuplicates ? 'resolution=ignore-duplicates' : 'resolution=merge-duplicates',
  ].join(',');

  return requestJson<T[]>(`/${table}${query}`, {
    method: 'POST',
    headers: {
      Prefer: prefer,
    },
    body: JSON.stringify(rows),
  });
}

export async function restPatch<T = any>(table: string, query: string, patch: Record<string, any>): Promise<T[]> {
  return requestJson<T[]>(`/${table}${query}`, {
    method: 'PATCH',
    headers: {
      Prefer: 'return=representation',
    },
    body: JSON.stringify(patch),
  });
}

export async function restDelete<T = any>(table: string, query: string): Promise<T[]> {
  return requestJson<T[]>(`/${table}${query}`, {
    method: 'DELETE',
    headers: {
      Prefer: 'return=representation',
    },
  });
}

export async function restRpc<T = any>(fnName: string, args: Record<string, any> = {}): Promise<T> {
  return requestJson<T>(`/rpc/${fnName}`, {
    method: 'POST',
    body: JSON.stringify(args),
  });
}

export function isSupabaseWriteBlocked(error: unknown): boolean {
  if (!(error instanceof SupabaseRestError)) return false;
  return error.status === 401 || error.status === 403 || error.status === 42501;
}

export function isSupabaseConnectivityIssue(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (!(error instanceof SupabaseRestError)) return isResilienceError(error);
  if (error.payload?.resilienceCode) return true;
  return (error.status ?? 0) >= 500;
}

function localMapKey(kind: string, key: string): string {
  return `orina_supabase_map_${kind}_${key}`;
}

export function getLocalSupabaseId(kind: string, key: string): string | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(localMapKey(kind, key));
  } catch {
    return null;
  }
}

export function setLocalSupabaseId(kind: string, key: string, value: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(localMapKey(kind, key), value);
  } catch {
    // ignore storage failures
  }
}

export function dispatchSyncEvent(name: string): void {
  if (!isBrowser()) return;
  window.dispatchEvent(new Event(name));
}
