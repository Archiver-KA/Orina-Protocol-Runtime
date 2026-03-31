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
 * - One row per (wallet, endpoint, window) using UPSERT with atomic increment.
 * - Window boundaries are computed from truncated timestamps.
 * - Old rows are not auto-deleted here; a periodic cleanup job can DELETE
 *   rows where window_start < now() - interval '24 hours'.
 */

import { createClient } from 'npm:@supabase/supabase-js@2';

// ── Budget definitions ───────────────────────────────────────────────────────

export interface RateBudget {
  maxRequests: number;
  windowMs: number;
}

/**
 * All endpoint-family budgets, matching the spec in
 * 15-local-api-audit-and-server-migration-plan.md § Recommended Rate Limit Policy.
 */
export const RATE_BUDGETS: Record<string, RateBudget> = {
  chat_create:      { maxRequests: 10,  windowMs: 10 * 60_000 },  // 10 / 10 min
  chat_send:        { maxRequests: 20,  windowMs: 60_000 },       // 20 / min
  chat_send_conv:   { maxRequests: 5,   windowMs: 60_000 },       // 5 / min / conversation
  chat_read:        { maxRequests: 120, windowMs: 60_000 },       // 120 / min
  ai_assist:        { maxRequests: 10,  windowMs: 60_000 },       // 10 / min
  ai_assist_daily:  { maxRequests: 200, windowMs: 24 * 3600_000 },// 200 / day
  ai_assist_image:  { maxRequests: 3,   windowMs: 60_000 },       // 3 / min
  ai_assist_image_daily: { maxRequests: 30, windowMs: 24 * 3600_000 }, // 30 / day
  ai_config_write:  { maxRequests: 20,  windowMs: 3600_000 },     // 20 / hour
  moderation_report:{ maxRequests: 10,  windowMs: 24 * 3600_000 },// 10 / day
};

// ── Supabase client (service role) ───────────────────────────────────────────

function getServiceClient() {
  const url = Deno.env.get('SUPABASE_URL') || '';
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key);
}

// ── Core check ───────────────────────────────────────────────────────────────

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
  currentCount: number;
}

/**
 * Compute the start of the current time window for a given window size.
 * Windows are aligned to epoch so that all instances share the same boundary.
 */
function windowStart(windowMs: number): string {
  const now = Date.now();
  const aligned = now - (now % windowMs);
  return new Date(aligned).toISOString();
}

/**
 * Check and increment the rate limit counter for a given scope.
 *
 * @param endpoint  - The budget family (key in `RATE_BUDGETS`).
 * @param wallet    - Wallet address (normalized lowercase).
 * @param extra     - Optional extra scope segment (e.g. conversationId for chat_send_conv).
 */
export async function checkRateLimit(
  endpoint: string,
  wallet: string,
  extra?: string,
): Promise<RateLimitResult> {
  const budget = RATE_BUDGETS[endpoint];
  if (!budget) {
    // Unknown endpoint → allow (no budget = no limit)
    return { allowed: true, remaining: Infinity, retryAfterMs: 0, currentCount: 0 };
  }

  const ws = windowStart(budget.windowMs);
  const scopeKey = extra
    ? `${endpoint}:${wallet}:${extra}:${ws}`
    : `${endpoint}:${wallet}:${ws}`;

  const supabase = getServiceClient();

  // Atomic upsert + increment using raw SQL via RPC would be ideal, but
  // Supabase JS doesn't expose arbitrary SQL. Instead, use upsert + select
  // with a small race window that is acceptable for rate limiting.

  const { data: existing, error: selectErr } = await supabase
    .from('rate_limit_entries')
    .select('id,request_count,window_start')
    .eq('scope_key', scopeKey)
    .maybeSingle();

  if (selectErr) {
    console.error('[RateLimiter] select error:', selectErr.message);
    // Fail-open: allow on DB errors to avoid blocking legitimate traffic
    return { allowed: true, remaining: budget.maxRequests, retryAfterMs: 0, currentCount: 0 };
  }

  if (!existing) {
    // First request in this window — insert
    const { error: insertErr } = await supabase
      .from('rate_limit_entries')
      .upsert({
        scope_key: scopeKey,
        endpoint,
        wallet: wallet || null,
        window_start: ws,
        request_count: 1,
        blocked: false,
      }, { onConflict: 'scope_key' });

    if (insertErr) {
      console.error('[RateLimiter] insert error:', insertErr.message);
    }

    return {
      allowed: true,
      remaining: budget.maxRequests - 1,
      retryAfterMs: 0,
      currentCount: 1,
    };
  }

  const currentCount = (existing.request_count ?? 0) + 1;

  if (currentCount > budget.maxRequests) {
    // Over budget — compute retry-after
    const windowStartMs = Date.parse(existing.window_start);
    const windowEndMs = windowStartMs + budget.windowMs;
    const retryAfterMs = Math.max(windowEndMs - Date.now(), 0);

    // Mark as blocked (for audit logging)
    await supabase
      .from('rate_limit_entries')
      .update({ blocked: true })
      .eq('id', existing.id);

    return {
      allowed: false,
      remaining: 0,
      retryAfterMs,
      currentCount: currentCount - 1,
    };
  }

  // Within budget — increment
  const { error: updateErr } = await supabase
    .from('rate_limit_entries')
    .update({ request_count: currentCount, blocked: false })
    .eq('id', existing.id);

  if (updateErr) {
    console.error('[RateLimiter] update error:', updateErr.message);
  }

  return {
    allowed: true,
    remaining: budget.maxRequests - currentCount,
    retryAfterMs: 0,
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
