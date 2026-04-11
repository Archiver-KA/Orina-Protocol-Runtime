import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";

export function createEdgeApp() {
  const app = new Hono();

  app.use("*", logger(console.log));
  app.use(
    "/*",
    cors({
      origin: (origin) => {
        if (!origin) return "*";
        const allowed = [
          /https:\/\/.*\.supabase\.co$/,
          /https:\/\/.*\.vercel\.app$/,
          /https:\/\/.*\.netlify\.app$/,
          /^http:\/\/localhost(:\d+)?$/,
          /^http:\/\/127\.0\.0\.1(:\d+)?$/,
        ];
        return allowed.some((rule) => rule.test(origin)) ? origin : "";
      },
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