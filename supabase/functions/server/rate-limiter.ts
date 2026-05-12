/**
 * Distributed Rate Limiter
 *
 * Uses a Supabase table (`rate_limit_entries`) as the shared store so limits
 * survive Edge Function instance restarts and work across horizontal scale.
 *
 * Each endpoint family has its own budget. The limiter is called with a scope
 * key (wallet + endpoint + window) and returns allow/block + retry-after.
 *
 * Design:
 * - One row per (wallet, endpoint, window) using the `rate_limit_increment`
 *   SECURITY DEFINER RPC for atomic insert/increment.
 * - Window boundaries are computed from truncated timestamps.
 * - Old rows are not auto-deleted here; a periodic cleanup job can DELETE
 *   rows where window_start < now() - interval '24 hours'.
 */

import { createClient } from 'npm:@supabase/supabase-js@2';

export interface RateBudget {
  maxRequests: number;
  windowMs: number;
}

/**
 * All endpoint-family budgets, matching the current Edge Function handlers.
 */
export const RATE_BUDGETS: Record<string, RateBudget> = {
  chat_create: { maxRequests: 10, windowMs: 10 * 60_000 },
  chat_send: { maxRequests: 20, windowMs: 60_000 },
  chat_send_conv: { maxRequests: 5, windowMs: 60_000 },
  chat_read: { maxRequests: 120, windowMs: 60_000 },
  ipfs_upload: { maxRequests: 30, windowMs: 60_000 },
  ipfs_upload_batch: { maxRequests: 10, windowMs: 60_000 },
  ai_assist: { maxRequests: 10, windowMs: 60_000 },
  ai_assist_daily: { maxRequests: 200, windowMs: 24 * 3600_000 },
  ai_assist_image: { maxRequests: 3, windowMs: 60_000 },
  ai_assist_image_daily: { maxRequests: 30, windowMs: 24 * 3600_000 },
  ai_config_write: { maxRequests: 20, windowMs: 3600_000 },
  moderation_report: { maxRequests: 10, windowMs: 24 * 3600_000 },
};

function getServiceClient() {
  const url = Deno.env.get('SUPABASE_URL') || '';
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key);
}

type ServiceSupabaseClient = ReturnType<typeof getServiceClient>;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
  currentCount: number;
}

function windowStart(windowMs: number): string {
  const now = Date.now();
  const aligned = now - (now % windowMs);
  return new Date(aligned).toISOString();
}

function parseIncrementCount(data: unknown): number {
  if (typeof data === 'number' && Number.isFinite(data)) {
    return data;
  }

  if (Array.isArray(data) && data.length > 0) {
    return parseIncrementCount(data[0]);
  }

  if (data && typeof data === 'object') {
    const maybeRecord = data as Record<string, unknown>;
    return parseIncrementCount(
      maybeRecord.rate_limit_increment ??
      maybeRecord.request_count ??
      maybeRecord.count,
    );
  }

  return 0;
}

async function incrementRateLimitCounter(
  supabase: ServiceSupabaseClient,
  scopeKey: string,
  endpoint: string,
  wallet: string,
  windowStartIso: string,
): Promise<number> {
  const { data, error } = await supabase.rpc('rate_limit_increment', {
    p_scope_key: scopeKey,
    p_endpoint: endpoint,
    p_wallet: wallet || null,
    p_window_start: windowStartIso,
  });

  if (error) {
    throw new Error(error.message);
  }

  const currentCount = parseIncrementCount(data);
  if (!Number.isFinite(currentCount) || currentCount <= 0) {
    throw new Error('rate_limit_increment returned an invalid count');
  }

  return currentCount;
}

/**
 * Check and increment the rate limit counter for a given scope.
 *
 * @param endpoint - The budget family (key in `RATE_BUDGETS`).
 * @param wallet - Wallet address (normalized lowercase).
 * @param extra - Optional extra scope segment, such as conversation id.
 */
export async function checkRateLimit(
  endpoint: string,
  wallet: string,
  extra?: string,
): Promise<RateLimitResult> {
  const budget = RATE_BUDGETS[endpoint];
  if (!budget) {
    return { allowed: true, remaining: Infinity, retryAfterMs: 0, currentCount: 0 };
  }

  const ws = windowStart(budget.windowMs);
  const scopeKey = extra
    ? `${endpoint}:${wallet}:${extra}:${ws}`
    : `${endpoint}:${wallet}:${ws}`;
  const supabase = getServiceClient();
  let currentCount = 0;

  try {
    currentCount = await incrementRateLimitCounter(supabase, scopeKey, endpoint, wallet, ws);
  } catch (error) {
    console.error(
      '[RateLimiter] atomic increment error:',
      error instanceof Error ? error.message : String(error),
    );
    // Fail-open on DB errors to avoid blocking legitimate traffic.
    return { allowed: true, remaining: budget.maxRequests, retryAfterMs: 0, currentCount: 0 };
  }

  if (currentCount <= budget.maxRequests) {
    return {
      allowed: true,
      remaining: budget.maxRequests - currentCount,
      retryAfterMs: 0,
      currentCount,
    };
  }

  const windowStartMs = Date.parse(ws);
  const windowEndMs = windowStartMs + budget.windowMs;
  const retryAfterMs = Math.max(windowEndMs - Date.now(), 0);

  const { error: blockedUpdateError } = await supabase
    .from('rate_limit_entries')
    .update({ blocked: true })
    .eq('scope_key', scopeKey);

  if (blockedUpdateError) {
    console.error('[RateLimiter] blocked marker update error:', blockedUpdateError.message);
  }

  return {
    allowed: false,
    remaining: 0,
    retryAfterMs,
    currentCount,
  };
}

/**
 * Convenience: format a rate-limit-exceeded JSON response for Hono handlers.
 */
export function rateLimitExceededResponse(
  c: { json: (body: unknown, status?: number) => Response },
  result: RateLimitResult,
): Response {
  const retryAfterSec = Math.ceil(result.retryAfterMs / 1000);
  return c.json(
    { error: `Rate limit exceeded. Please wait ${retryAfterSec}s before retrying.` },
    429,
  );
}
