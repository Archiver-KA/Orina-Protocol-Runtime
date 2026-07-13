import type { Context, Hono, Next } from "npm:hono@4.12.29";
import { createClient } from "npm:@supabase/supabase-js@2.100.1";

const IDEMPOTENCY_TABLE = "edge_idempotency_records";
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_IDEMPOTENCY_KEY_LENGTH = 200;
const MAX_JSON_BODY_BYTES = 128 * 1024;
const MAX_REPLAY_BODY_BYTES = 128 * 1024;
const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const REPLAY_HEADER_ALLOWLIST = new Set(["content-type", "cache-control"]);

type IdempotencyStatus = "in_progress" | "completed" | "completed_no_replay";

type IdempotencyRecord = {
  key_hash: string;
  request_fingerprint: string;
  method: string;
  path: string;
  status: IdempotencyStatus;
  response_status: number | null;
  response_headers: Record<string, string> | null;
  response_body: string | null;
  expires_at: string;
};

type ClaimResult =
  | { kind: "claimed"; keyHash: string; fingerprint: string }
  | { kind: "response"; response: Response };

function getServiceSupabaseClient() {
  const url = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!url || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function jsonResponse(payload: Record<string, unknown>, status: number, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });
}

function isDuplicateKeyError(error: unknown): boolean {
  const candidate = error as { code?: string; message?: string } | null;
  return candidate?.code === "23505" || /duplicate key/i.test(candidate?.message || "");
}

function isExpired(record: Pick<IdempotencyRecord, "expires_at">): boolean {
  return Date.parse(record.expires_at) <= Date.now();
}

function readIdempotencyKey(c: Context): string {
  return String(c.req.header("Idempotency-Key") || "").trim();
}

function hasInvalidHeaderValueChars(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 0x21 || code > 0x7e) return true;
  }
  return false;
}

function validateIdempotencyKey(value: string): string | null {
  if (!value) return "Idempotency-Key is empty.";
  if (value.length > MAX_IDEMPOTENCY_KEY_LENGTH) return "Idempotency-Key is too long.";
  if (hasInvalidHeaderValueChars(value)) return "Idempotency-Key contains invalid characters.";
  return null;
}

function readAuthScope(c: Context): string {
  return String(c.req.header("Authorization") || "").trim();
}

function hexEncode(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return hexEncode(digest);
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function isJsonWrite(c: Context): boolean {
  const contentType = String(c.req.header("Content-Type") || "").toLowerCase();
  return !contentType || contentType.includes("application/json");
}

async function buildRequestFingerprint(c: Context): Promise<string | Response> {
  if (!isJsonWrite(c)) {
    return jsonResponse(
      { error: "Idempotency-Key is only supported for JSON write requests." },
      415,
      { "X-Orina-Idempotency": "unsupported-media-type" },
    );
  }

  const contentLength = Number(c.req.header("Content-Length") || 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_JSON_BODY_BYTES) {
    return jsonResponse(
      { error: "Idempotent request body is too large." },
      413,
      { "X-Orina-Idempotency": "body-too-large" },
    );
  }

  const bodyText = await c.req.raw.clone().text();
  if (byteLength(bodyText) > MAX_JSON_BODY_BYTES) {
    return jsonResponse(
      { error: "Idempotent request body is too large." },
      413,
      { "X-Orina-Idempotency": "body-too-large" },
    );
  }

  const url = new URL(c.req.url);
  const bodyHash = await sha256Hex(bodyText);
  return sha256Hex(JSON.stringify({
    method: c.req.method.toUpperCase(),
    path: url.pathname,
    queryHash: await sha256Hex(url.search),
    contentType: String(c.req.header("Content-Type") || "").split(";")[0].trim().toLowerCase(),
    bodyHash,
  }));
}

function replayHeaders(record: IdempotencyRecord): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(record.response_headers || {})) {
    if (REPLAY_HEADER_ALLOWLIST.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  }
  headers.set("X-Orina-Idempotency", "replayed");
  return headers;
}

function collectReplayHeaders(headers: Headers): Record<string, string> {
  const replayable: Record<string, string> = {};
  headers.forEach((value, key) => {
    if (REPLAY_HEADER_ALLOWLIST.has(key.toLowerCase())) {
      replayable[key] = value;
    }
  });
  return replayable;
}

function containsNonReplayableSecret(bodyText: string): boolean {
  return /"rawKey"\s*:/i.test(bodyText) ||
    /"accessToken"\s*:/i.test(bodyText) ||
    /\beyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\b/.test(bodyText) ||
    /\bsk_orina_[a-f0-9]{16,}\b/i.test(bodyText) ||
    /"privateKey"\s*:/i.test(bodyText) ||
    /"ciphertextHex"\s*:/i.test(bodyText);
}

function canReplayResponse(response: Response, bodyText: string): boolean {
  return byteLength(bodyText) <= MAX_REPLAY_BODY_BYTES &&
    !containsNonReplayableSecret(bodyText) &&
    response.status >= 200 &&
    response.status < 500;
}

async function claimIdempotency(c: Context): Promise<ClaimResult> {
  const method = c.req.method.toUpperCase();
  const idempotencyKey = readIdempotencyKey(c);
  if (!idempotencyKey || !UNSAFE_METHODS.has(method)) {
    return { kind: "claimed", keyHash: "", fingerprint: "" };
  }

  const keyError = validateIdempotencyKey(idempotencyKey);
  if (keyError) {
    return {
      kind: "response",
      response: jsonResponse({ error: keyError }, 400, { "X-Orina-Idempotency": "invalid-key" }),
    };
  }

  const authScope = readAuthScope(c);
  if (!authScope) {
    return {
      kind: "response",
      response: jsonResponse(
        { error: "Idempotency-Key requires an authenticated Authorization scope." },
        400,
        { "X-Orina-Idempotency": "missing-auth-scope" },
      ),
    };
  }

  const fingerprint = await buildRequestFingerprint(c);
  if (fingerprint instanceof Response) {
    return { kind: "response", response: fingerprint };
  }

  const url = new URL(c.req.url);
  const keyHash = await sha256Hex(`orina-idempotency-v1\n${authScope}\n${idempotencyKey}`);
  const nowIso = new Date().toISOString();
  const expiresAt = new Date(Date.now() + IDEMPOTENCY_TTL_MS).toISOString();
  const supabase = getServiceSupabaseClient();

  const { error: insertError } = await supabase
    .from(IDEMPOTENCY_TABLE)
    .insert({
      key_hash: keyHash,
      request_fingerprint: fingerprint,
      method,
      path: url.pathname,
      status: "in_progress",
      expires_at: expiresAt,
      created_at: nowIso,
      updated_at: nowIso,
    });

  if (!insertError) {
    return { kind: "claimed", keyHash, fingerprint };
  }
  if (!isDuplicateKeyError(insertError)) {
    throw new Error(`Idempotency claim failed: ${insertError.message}`);
  }

  const { data, error: selectError } = await supabase
    .from(IDEMPOTENCY_TABLE)
    .select("key_hash,request_fingerprint,method,path,status,response_status,response_headers,response_body,expires_at")
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (selectError) {
    throw new Error(`Idempotency lookup failed: ${selectError.message}`);
  }

  const record = data as IdempotencyRecord | null;
  if (!record || isExpired(record)) {
    return {
      kind: "response",
      response: jsonResponse(
        { error: "Idempotency-Key is expired or no longer replayable. Generate a new key." },
        409,
        { "X-Orina-Idempotency": "expired" },
      ),
    };
  }
  if (record.request_fingerprint !== fingerprint) {
    return {
      kind: "response",
      response: jsonResponse(
        { error: "Idempotency-Key was already used for a different request." },
        409,
        { "X-Orina-Idempotency": "fingerprint-mismatch" },
      ),
    };
  }
  if (record.status === "completed" && record.response_status !== null) {
    return {
      kind: "response",
      response: new Response(record.response_body || "", {
        status: record.response_status,
        headers: replayHeaders(record),
      }),
    };
  }
  if (record.status === "completed_no_replay") {
    return {
      kind: "response",
      response: jsonResponse(
        { error: "Idempotent operation already completed, but its response is not replayable." },
        409,
        { "X-Orina-Idempotency": "completed-no-replay" },
      ),
    };
  }

  return {
    kind: "response",
    response: jsonResponse(
      { error: "Idempotent operation is still in progress. Retry after the indicated delay." },
      425,
      {
        "Retry-After": "1",
        "X-Orina-Idempotency": "in-progress",
      },
    ),
  };
}

async function completeIdempotency(
  keyHash: string,
  fingerprint: string,
  response: Response,
  bodyText: string,
): Promise<"stored" | "stored-no-replay"> {
  const replayable = canReplayResponse(response, bodyText);
  const nowIso = new Date().toISOString();
  const payload = replayable
    ? {
      status: "completed",
      response_status: response.status,
      response_headers: collectReplayHeaders(response.headers),
      response_body: bodyText,
      updated_at: nowIso,
    }
    : {
      status: "completed_no_replay",
      response_status: null,
      response_headers: {},
      response_body: null,
      updated_at: nowIso,
    };

  const supabase = getServiceSupabaseClient();
  const { error } = await supabase
    .from(IDEMPOTENCY_TABLE)
    .update(payload)
    .eq("key_hash", keyHash)
    .eq("request_fingerprint", fingerprint);

  if (error) {
    throw new Error(`Idempotency completion failed: ${error.message}`);
  }

  return replayable ? "stored" : "stored-no-replay";
}

async function completeUncaughtIdempotency(keyHash: string, fingerprint: string): Promise<void> {
  const supabase = getServiceSupabaseClient();
  await supabase
    .from(IDEMPOTENCY_TABLE)
    .update({
      status: "completed_no_replay",
      response_status: null,
      response_headers: {},
      response_body: null,
      updated_at: new Date().toISOString(),
    })
    .eq("key_hash", keyHash)
    .eq("request_fingerprint", fingerprint);
}

export function registerIdempotencyReplayMiddleware(app: Hono) {
  app.use("*", async (c: Context, next: Next) => {
    const claim = await claimIdempotency(c);
    if (claim.kind === "response") {
      return claim.response;
    }
    if (!claim.keyHash) {
      await next();
      return;
    }

    try {
      await next();
    } catch (error) {
      await completeUncaughtIdempotency(claim.keyHash, claim.fingerprint);
      throw error;
    }

    const bodyText = await c.res.clone().text();
    try {
      const storedState = await completeIdempotency(claim.keyHash, claim.fingerprint, c.res, bodyText);
      const headers = new Headers(c.res.headers);
      headers.set("X-Orina-Idempotency", storedState);
      c.res = new Response(bodyText, {
        status: c.res.status,
        statusText: c.res.statusText,
        headers,
      });
    } catch (error) {
      console.error("[Idempotency] Failed to persist replay state:", error);
    }
  });
}
