import aiM2MWallet from "../server/ai-m2m-wallet.ts";
import { createEdgeApp, registerHealthRoute } from "../server/edge-app.ts";

const app = createEdgeApp();
registerHealthRoute(app, "/health", {
  ok: true,
  function: "orina-ai-m2m-v2",
  scope: "ai-m2m",
});
registerHealthRoute(app, "/orina-ai-m2m-v2/health", {
  ok: true,
  function: "orina-ai-m2m-v2",
  scope: "ai-m2m",
});
app.route("/", aiM2MWallet);
app.route("/orina-ai-m2m-v2", aiM2MWallet);

Deno.serve(app.fetch);
