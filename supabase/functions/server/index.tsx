import { Hono } from "npm:hono@4.12.29";
import aiChat from "./ai-chat.tsx";
import aiAssist from "./ai-assist.ts";
import aiM2MWallet from "./ai-m2m-wallet.ts";
import apiKeysHandler from "./api-keys-handler.ts";
import {
  registerCorsMiddleware,
  registerRequestBodyLimitMiddleware,
  registerSafeRequestLogging,
} from "./edge-app.ts";
import { registerIdempotencyReplayMiddleware } from "./idempotency-replay.ts";
import ipfsRouter from "./ipfs-upload.tsx";
import sellerMintingRouter from "./seller-ai-minting-handler.ts";
import walletAuthClaimBridge from "./wallet-auth-claim-bridge.tsx";

export const app = new Hono();

const SHARED_FUNCTION_LEGACY_PREFIX = "/make-server-b0d68fc8";
const SHARED_ROUTE_PREFIXES = ["", SHARED_FUNCTION_LEGACY_PREFIX] as const;

function sharedRoutePath(prefix: string, path: string): string {
  const normalizedPath = `/${String(path || "").replace(/^\/+/, "")}`;
  const normalizedPrefix = String(prefix || "").replace(/\/+$/, "");
  return normalizedPrefix ? `${normalizedPrefix}${normalizedPath}` : normalizedPath;
}

function registerSharedRoutes(prefix: string) {
  app.get(sharedRoutePath(prefix, "health"), (c) => {
    return c.json({ status: "ok" });
  });

  // The deployed function slug already scopes requests at /functions/v1/make-server-b0d68fc8.
  // Keep root-mounted routes canonical while preserving the legacy nested prefix for compatibility.
  app.route(sharedRoutePath(prefix, "ai"), aiAssist);
  app.route(sharedRoutePath(prefix, "ai"), aiChat);
  app.route(sharedRoutePath(prefix, "ai"), apiKeysHandler);
  app.route(sharedRoutePath(prefix, "ai/m2m"), aiM2MWallet);
  app.route(sharedRoutePath(prefix, "ai/seller"), sellerMintingRouter);
  app.route(sharedRoutePath(prefix, "ipfs"), ipfsRouter);
  app.route(sharedRoutePath(prefix, "auth/supabase-claim-bridge"), walletAuthClaimBridge);
}

registerSafeRequestLogging(app);

registerCorsMiddleware(app);
registerRequestBodyLimitMiddleware(app);
registerIdempotencyReplayMiddleware(app);

for (const prefix of SHARED_ROUTE_PREFIXES) {
  registerSharedRoutes(prefix);
}

if (import.meta.main) {
  Deno.serve(app.fetch);
}

export default app;
