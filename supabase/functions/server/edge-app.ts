import { Hono, type Context } from "npm:hono@4.12.29";
import { readBoundedResponseBytes } from "./bounded-response.ts";
import { registerIdempotencyReplayMiddleware } from "./idempotency-replay.ts";

const EXACT_ALLOWED_ORIGINS = new Set([
  "https://app.orina.io",
  "https://orina.io",
  "https://www.orina.io",
]);

const PREVIEW_ORIGIN_PATTERNS = [
  /https:\/\/.*\.supabase\.co$/,
  /https:\/\/.*\.vercel\.app$/,
  /https:\/\/.*\.netlify\.app$/,
  /https:\/\/.*\.workers\.dev$/,
];

const LOCAL_ORIGIN_PATTERNS = [
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
];

const CORS_ALLOW_HEADERS =
  "authorization, x-client-info, apikey, content-type, x-orina-request-id, x-orina-operation, x-orina-attempt, idempotency-key";
const CORS_ALLOW_METHODS = "GET,POST,PUT,PATCH,DELETE,OPTIONS";
const CORS_EXPOSE_HEADERS = "Content-Length, X-Orina-Request-Id, Retry-After";
const CORS_MAX_AGE = "600";
const DEFAULT_REQUEST_BODY_LIMIT_BYTES = 2 * 1024 * 1024;
const IPFS_REQUEST_BODY_LIMIT_BYTES = 55 * 1024 * 1024;
const METHODS_WITH_BODY = new Set(["POST", "PUT", "PATCH"]);

function readEdgeEnv(name: string): string {
  try {
    return String(Deno.env.get(name) || "").trim();
  } catch {
    return "";
  }
}

function readEdgeFlag(name: string): boolean {
  return readEdgeEnv(name).toLowerCase() === "true";
}

function readConfiguredAllowedOrigins(): Set<string> {
  const configured = new Set<string>();
  for (const entry of readEdgeEnv("ORINA_CORS_ALLOWED_ORIGINS").split(",")) {
    const candidate = entry.trim().replace(/\/+$/, "");
    if (!candidate) continue;
    try {
      const url = new URL(candidate);
      if (url.origin !== candidate || url.username || url.password) continue;
      if (isProductionCorsMode() && url.protocol !== "https:") continue;
      if (isProductionCorsMode() && LOCAL_ORIGIN_PATTERNS.some((rule) => rule.test(url.origin))) continue;
      configured.add(url.origin);
    } catch {
      // Invalid configured origins are ignored rather than broadening access.
    }
  }
  return configured;
}

function isProductionCorsMode(): boolean {
  return readEdgeEnv("ORINA_CORS_ENV").toLowerCase() === "production";
}

function isLocalOriginAllowed(origin: string): boolean {
  return !isProductionCorsMode() && LOCAL_ORIGIN_PATTERNS.some((rule) => rule.test(origin));
}

function isPreviewOriginAllowed(origin: string): boolean {
  return readEdgeFlag("ORINA_CORS_ALLOW_PREVIEW_ORIGINS") &&
    PREVIEW_ORIGIN_PATTERNS.some((rule) => rule.test(origin));
}

export function resolveAllowedCorsOrigin(origin?: string | null) {
  const normalizedOrigin = String(origin || "").trim();
  if (!normalizedOrigin) return "";
  if (EXACT_ALLOWED_ORIGINS.has(normalizedOrigin)) {
    return normalizedOrigin;
  }
  if (readConfiguredAllowedOrigins().has(normalizedOrigin)) {
    return normalizedOrigin;
  }
  return isLocalOriginAllowed(normalizedOrigin) || isPreviewOriginAllowed(normalizedOrigin)
    ? normalizedOrigin
    : "";
}

function createCorsHeaders(origin?: string | null) {
  const headers = new Headers({
    "Access-Control-Allow-Headers": CORS_ALLOW_HEADERS,
    "Access-Control-Allow-Methods": CORS_ALLOW_METHODS,
    "Access-Control-Expose-Headers": CORS_EXPOSE_HEADERS,
    "Access-Control-Max-Age": CORS_MAX_AGE,
    Vary: "Origin, Access-Control-Request-Headers",
  });

  const allowedOrigin = resolveAllowedCorsOrigin(origin);
  if (allowedOrigin) {
    headers.set("Access-Control-Allow-Origin", allowedOrigin);
  }

  return headers;
}

function readRequestId(context: Context) {
  return String(context.req.header("X-Orina-Request-Id") || "").trim();
}

export function applyCorsHeaders(context: Context) {
  const headers = createCorsHeaders(context.req.header("Origin"));
  headers.forEach((value, key) => {
    context.header(key, value);
  });
}

export function registerCorsMiddleware(app: Hono) {
  app.use("/*", async (c, next) => {
    if (c.req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: createCorsHeaders(c.req.header("Origin")),
      });
    }

    await next();

    const corsHeaders = createCorsHeaders(c.req.header("Origin"));
    const responseHeaders = new Headers(c.res.headers);
    const requestId = readRequestId(c);
    corsHeaders.forEach((value, key) => {
      responseHeaders.set(key, value);
    });
    if (requestId) {
      responseHeaders.set("X-Orina-Request-Id", requestId);
    }

    c.res = new Response(c.res.body, {
      status: c.res.status,
      statusText: c.res.statusText,
      headers: responseHeaders,
    });
  });
}

export function registerSafeRequestLogging(app: Hono) {
  app.use("*", async (c, next) => {
    const startedAt = performance.now();
    await next();
    console.log("[Edge Request]", {
      method: c.req.method,
      status: c.res.status,
      durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
    });
  });
}

export function registerRequestBodyLimitMiddleware(app: Hono) {
  app.use("*", async (c, next) => {
    if (!METHODS_WITH_BODY.has(c.req.method)) {
      await next();
      return;
    }
    const pathname = new URL(c.req.url).pathname;
    const maxBytes = /\/ipfs\/upload(?:-multiple)?$/.test(pathname)
      ? IPFS_REQUEST_BODY_LIMIT_BYTES
      : DEFAULT_REQUEST_BODY_LIMIT_BYTES;
    try {
      const clonedRequest = c.req.raw.clone();
      await readBoundedResponseBytes(
        new Response(clonedRequest.body, { headers: clonedRequest.headers }),
        maxBytes,
      );
    } catch {
      return c.json({ error: "Request body exceeds the allowed size" }, 413);
    }
    await next();
  });
}

export function createEdgeApp() {
  const app = new Hono();

  registerSafeRequestLogging(app);
  registerCorsMiddleware(app);
  registerRequestBodyLimitMiddleware(app);
  registerIdempotencyReplayMiddleware(app);

  return app;
}

export function registerHealthRoute(
  app: Hono,
  path: string,
  payload: Record<string, unknown>,
) {
  app.get(path, (c) => c.json(payload));
}
