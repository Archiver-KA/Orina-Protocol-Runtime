import receiptSyncRouter from "../server/sync-receipt-nfts.ts";
import { createEdgeApp, registerHealthRoute } from "../server/edge-app.ts";

const app = createEdgeApp();
registerHealthRoute(app, "/health", {
  ok: true,
  function: "orina-receipt-sync-v1",
  scope: "receipt-sync",
});
registerHealthRoute(app, "/orina-receipt-sync-v1/health", {
  ok: true,
  function: "orina-receipt-sync-v1",
  scope: "receipt-sync",
});
app.route("/", receiptSyncRouter);
app.route("/orina-receipt-sync-v1", receiptSyncRouter);

Deno.serve(app.fetch);