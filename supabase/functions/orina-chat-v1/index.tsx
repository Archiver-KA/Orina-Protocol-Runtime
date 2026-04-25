import { createEdgeApp, registerHealthRoute } from "../server/edge-app.ts";
import * as messagesHandler from "../server/messages-handler-c5.ts";

const app = createEdgeApp();
const PREFIX = "/orina-chat-v1";

registerHealthRoute(app, "/health", {
  ok: true,
  function: "orina-chat-v1",
  scope: "messaging",
});
registerHealthRoute(app, `${PREFIX}/health`, {
  ok: true,
  function: "orina-chat-v1",
  scope: "messaging",
});

// Clean messages endpoints (no extra prefix).
app.post(`${PREFIX}/messages/conversation`, messagesHandler.handleCreateConversation);
app.post(`${PREFIX}/messages/send`, messagesHandler.handleSendMessage);
app.get(`${PREFIX}/messages/conversations/:address`, messagesHandler.handleGetConversations);
app.get(`${PREFIX}/messages/:conversationId`, messagesHandler.handleGetMessages);
app.post(`${PREFIX}/messages/read`, messagesHandler.handleMarkAsRead);
app.delete(`${PREFIX}/messages/:conversationId`, messagesHandler.handleDeleteConversation);
app.post(`${PREFIX}/messages/report`, messagesHandler.handleReportMessage);

Deno.serve(app.fetch);
