import { Hono, type Context } from "npm:hono";
import { logger } from "npm:hono/logger";

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
  "authorization, x-client-info, apikey, content-type";
const CORS_ALLOW_METHODS = "GET,POST,PUT,PATCH,DELETE,OPTIONS";
const CORS_EXPOSE_HEADERS = "Content-Length";
const CORS_MAX_AGE = "600";

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
  return new Set(
    readEdgeEnv("ORINA_CORS_ALLOWED_ORIGINS")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
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
    corsHeaders.forEach((value, key) => {
      responseHeaders.set(key, value);
    });

    c.res = new Response(c.res.body, {
      status: c.res.status,
      statusText: c.res.statusText,
      headers: responseHeaders,
    });
  });
}

export function createEdgeApp() {
  const app = new Hono();

  app.use("*", logger(console.log));
  registerCorsMiddleware(app);

  return app;
}

export function registerHealthRoute(
  app: Hono,
  path: string,
  payload: Record<string, unknown>,
) {
  app.get(path, (c) => c.json(payload));
}
