import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";

const EXACT_ALLOWED_ORIGINS = new Set([
  "https://app.orina.io",
  "https://orina.io",
  "https://www.orina.io",
]);

const ALLOWED_ORIGIN_PATTERNS = [
  /https:\/\/.*\.supabase\.co$/,
  /https:\/\/.*\.vercel\.app$/,
  /https:\/\/.*\.netlify\.app$/,
  /https:\/\/.*\.workers\.dev$/,
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
];

export function resolveAllowedCorsOrigin(origin?: string | null) {
  const normalizedOrigin = String(origin || "").trim();
  if (!normalizedOrigin) return "*";
  if (EXACT_ALLOWED_ORIGINS.has(normalizedOrigin)) {
    return normalizedOrigin;
  }
  return ALLOWED_ORIGIN_PATTERNS.some((rule) => rule.test(normalizedOrigin))
    ? normalizedOrigin
    : "";
}

export function createEdgeApp() {
  const app = new Hono();

  app.use("*", logger(console.log));
  app.use(
    "/*",
    cors({
      origin: resolveAllowedCorsOrigin,
      allowHeaders: ["Content-Type", "Authorization", "apikey"],
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      exposeHeaders: ["Content-Length"],
      maxAge: 600,
    }),
  );

  return app;
}

export function registerHealthRoute(
  app: Hono,
  path: string,
  payload: Record<string, unknown>,
) {
  app.get(path, (c) => c.json(payload));
}
