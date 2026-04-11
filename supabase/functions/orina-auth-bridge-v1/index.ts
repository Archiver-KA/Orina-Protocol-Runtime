import walletAuthClaimBridge from "../server/wallet-auth-claim-bridge.tsx";
import { createEdgeApp } from "../server/edge-app.ts";

const app = createEdgeApp();
app.route("/", walletAuthClaimBridge);
app.route("/orina-auth-bridge-v1", walletAuthClaimBridge);

Deno.serve(app.fetch);