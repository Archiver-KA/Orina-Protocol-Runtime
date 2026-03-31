import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import aiChat from "./ai-chat.tsx";
import aiAssist from "./ai-assist.ts";
import aiM2MWallet from "./ai-m2m-wallet.ts";
import ipfsRouter from "./ipfs-upload.tsx";
import sellerMintingRouter from "./seller-ai-minting-handler.ts";
import walletAuthClaimBridge from "./wallet-auth-claim-bridge.tsx";

export const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: (origin) => {
      // Allow Supabase preview, localhost dev, and production app domains
      if (!origin) return '*'; // server-to-server / curl
      const allowed = [
        /https:\/\/.*\.supabase\.co$/,
        /https:\/\/.*\.vercel\.app$/,
        /https:\/\/.*\.netlify\.app$/,
        /^http:\/\/localhost(:\d+)?$/,
        /^http:\/\/127\.0\.0\.1(:\d+)?$/,
      ];
      return allowed.some((r) => r.test(origin)) ? origin : '';
    },
    allowHeaders: ["Content-Type", "Authorization", "apikey"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-b0d68fc8/health", (c) => {
  return c.json({ status: "ok" });
});

// Mount AI endpoints — V2 first (assist, search, conversations), then legacy (chat, config)
app.route("/make-server-b0d68fc8/ai", aiAssist);
app.route("/make-server-b0d68fc8/ai", aiChat);
app.route("/make-server-b0d68fc8/ai/m2m", aiM2MWallet);
app.route("/make-server-b0d68fc8/ai/seller", sellerMintingRouter);

// Mount IPFS upload endpoints (prefixed with /make-server-b0d68fc8/ipfs)
app.route("/make-server-b0d68fc8/ipfs", ipfsRouter);

// H1 scaffold: wallet-auth -> Supabase auth claim bridge
app.route("/make-server-b0d68fc8/auth/supabase-claim-bridge", walletAuthClaimBridge);

if (import.meta.main) {
  Deno.serve(app.fetch);
}

export default app;
