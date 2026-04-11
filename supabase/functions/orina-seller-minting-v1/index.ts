import sellerMintingRouter from "../server/seller-ai-minting-handler.ts";
import { createEdgeApp, registerHealthRoute } from "../server/edge-app.ts";

const app = createEdgeApp();
registerHealthRoute(app, "/health", {
  ok: true,
  function: "orina-seller-minting-v1",
  scope: "seller-minting",
});
registerHealthRoute(app, "/orina-seller-minting-v1/health", {
  ok: true,
  function: "orina-seller-minting-v1",
  scope: "seller-minting",
});
app.route("/", sellerMintingRouter);
app.route("/orina-seller-minting-v1", sellerMintingRouter);

Deno.serve(app.fetch);