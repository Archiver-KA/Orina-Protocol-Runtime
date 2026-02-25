/**
 * ORINA Chat v1 (Clean Routes)
 *
 * Goals:
 * - No duplicated prefix routing.
 * - Backward compatible with current frontend (simple REST).
 * - CORS-friendly (avoid preflight surprises).
 *
 * NOTE:
 * - This function uses the existing kv_store_b0d68fc8 table via kv_store.tsx.
 * - That module uses SERVICE_ROLE on the server side (safe for Edge Function only).
 */

import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";

import * as messagesHandler from "../server/messages-handler.ts";

const app = new Hono();
const PREFIX = "/orina-chat-v1";

app.use("*", logger(console.log));

app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "apikey", "x-client-info"],
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Supabase forwards the function slug as part of the request pathname:
//   /functions/v1/<slug>/health   -> pathname seen by the function: /<slug>/health
// So routes must include the slug prefix to match.
app.get(`${PREFIX}/health`, (c) => c.json({ ok: true, name: "orina-chat-v1" }));

// Clean messages endpoints (no extra prefix).
app.post(`${PREFIX}/messages/send`, messagesHandler.handleSendMessage);
app.get(`${PREFIX}/messages/conversations/:address`, messagesHandler.handleGetConversations);
app.get(`${PREFIX}/messages/:conversationId`, messagesHandler.handleGetMessages);
app.post(`${PREFIX}/messages/read`, messagesHandler.handleMarkAsRead);
app.delete(`${PREFIX}/messages/:conversationId`, messagesHandler.handleDeleteConversation);

Deno.serve(app.fetch);
