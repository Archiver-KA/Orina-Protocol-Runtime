import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import apiEndpoints from "./api-endpoints.tsx";
import aiChat from "./ai-chat.tsx";
import ipfsRouter from "./ipfs-upload.tsx";
import { storeAPIKey, getAllKeysForWallet } from "./api-auth.tsx";
import { APIKey } from "./types.ts";
import * as messagesHandler from "./messages-handler.ts";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-b0d68fc8/health", (c) => {
  return c.json({ status: "ok" });
});

// API Key management endpoints
app.post("/make-server-b0d68fc8/keys/generate", async (c) => {
  try {
    const body = await c.req.json();
    const { walletAddress, name, permissions, expiresInDays } = body;

    if (!walletAddress || !name || !permissions) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    // Generate API key
    const keyId = `key_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const apiKey = `sk_seller_${generateRandomToken(32)}`;
    
    const now = new Date().toISOString();
    const expiresAt = expiresInDays 
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const newKey: APIKey = {
      id: keyId,
      key: apiKey,
      name,
      walletAddress,
      permissions,
      createdAt: now,
      lastUsedAt: null,
      expiresAt,
      isActive: true,
      usageStats: {
        totalRequests: 0,
        successRate: 100,
        lastDayRequests: 0
      }
    };

    await storeAPIKey(newKey);

    return c.json({ success: true, key: newKey });
  } catch (error) {
    console.error("Error generating API key:", error);
    return c.json({ error: "Failed to generate API key" }, 500);
  }
});

app.get("/make-server-b0d68fc8/keys/:walletAddress", async (c) => {
  try {
    const walletAddress = c.req.param("walletAddress");
    const keys = await getAllKeysForWallet(walletAddress);
    
    return c.json({ success: true, keys });
  } catch (error) {
    console.error("Error fetching API keys:", error);
    return c.json({ error: "Failed to fetch API keys" }, 500);
  }
});

app.post("/make-server-b0d68fc8/keys/:keyId/revoke", async (c) => {
  try {
    const keyId = c.req.param("keyId");
    const { walletAddress } = await c.req.json();

    // Get all keys for wallet
    const keys = await getAllKeysForWallet(walletAddress);
    const key = keys.find(k => k.id === keyId);

    if (!key) {
      return c.json({ error: "Key not found" }, 404);
    }

    // Revoke key
    key.isActive = false;
    await storeAPIKey(key);

    return c.json({ success: true });
  } catch (error) {
    console.error("Error revoking API key:", error);
    return c.json({ error: "Failed to revoke API key" }, 500);
  }
});

// Mount API endpoints (prefixed with /make-server-b0d68fc8/api/v1)
app.route("/make-server-b0d68fc8/api/v1", apiEndpoints);

// Mount AI chat endpoints (prefixed with /make-server-b0d68fc8/ai)
app.route("/make-server-b0d68fc8/ai", aiChat);

// Mount IPFS upload endpoints (prefixed with /make-server-b0d68fc8/ipfs)
app.route("/make-server-b0d68fc8/ipfs", ipfsRouter);

// Messages endpoints
app.post("/make-server-b0d68fc8/messages/send", messagesHandler.handleSendMessage);
app.get("/make-server-b0d68fc8/messages/conversations/:address", messagesHandler.handleGetConversations);
app.get("/make-server-b0d68fc8/messages/:conversationId", messagesHandler.handleGetMessages);
app.post("/make-server-b0d68fc8/messages/read", messagesHandler.handleMarkAsRead);
app.delete("/make-server-b0d68fc8/messages/:conversationId", messagesHandler.handleDeleteConversation);

// Helper function
function generateRandomToken(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

Deno.serve(app.fetch);