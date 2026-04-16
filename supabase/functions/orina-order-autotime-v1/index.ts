import orderAutotimeKeeper from "../server/order-autotime-keeper.ts";
import { createEdgeApp, registerHealthRoute } from "../server/edge-app.ts";

const app = createEdgeApp();
registerHealthRoute(app, "/health", {
  ok: true,
  function: "orina-order-autotime-v1",
  scope: "order-autotime-keeper",
});
registerHealthRoute(app, "/orina-order-autotime-v1/health", {
  ok: true,
  function: "orina-order-autotime-v1",
  scope: "order-autotime-keeper",
});
app.route("/", orderAutotimeKeeper);
app.route("/orina-order-autotime-v1", orderAutotimeKeeper);

Deno.serve(app.fetch);
