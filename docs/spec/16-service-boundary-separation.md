# Service Boundary Separation: Chat, AI, And Automation


## Purpose

This spec defines the runtime separation between the Chat service, the AI workspace, and the future Seller AI Auto-Reply automation layer.

These three domains share no direct runtime coupling today and must remain separated as the product evolves.

## Current Architecture

```
┌─────────────────────┐     ┌─────────────────────┐
│   Messages Page     │     │   AI Sidebar         │
│   messages.tsx      │     │   ai-sidebar.tsx      │
│                     │     │   ai-agent-settings   │
│   Uses:             │     │                       │
│   messagesClient.ts │     │   Uses:               │
│                     │     │   aiAgentClient.ts     │
└────────┬────────────┘     └────────┬──────────────┘
         │                           │
         ▼                           ▼
┌─────────────────────┐     ┌─────────────────────┐
│  orina-chat-v1      │     │  /ai/assist          │
│  Edge Function      │     │  /ai/config           │
│                     │     │  /ai/conversations     │
│  Tables:            │     │                       │
│  - conversations    │     │  Tables:              │
│  - conv_participants│     │  - kv_store (KV)      │
│  - messages         │     │  (future: relational) │
└─────────────────────┘     └─────────────────────┘
```

## Service 1: Chat Service

Owns all person-to-person messaging.

- Edge Function: `orina-chat-v1`
- Routes: `/messages/conversation`, `/messages/send`, `/messages/conversations/:address`, `/messages/:conversationId`, `/messages/read`, `/messages/report`
- Tables: `conversations`, `conversation_participants`, `messages`, `message_reports` (planned)
- Auth: wallet claim bridge JWT with wallet match enforcement
- Rate limits: See spec 15 § Recommended Rate Limit Policy

The Chat Service has no dependency on AI KV, AI prompt state, or AI agent config.

## Service 2: AI Workspace (ORINA AI)

Owns the AI conversation workspace — the AI Sidebar interaction surface.

- Routes: `/ai/assist`, `/ai/conversations/:walletAddress`, `/ai/conversation/:conversationId`, `/ai/search`, `/ai/config`
- Current storage: KV-backed (`kv_store_b0d68fc8`)
- Planned storage: relational `agent_configs`, `agent_threads`, `agent_messages`, `agent_usage` (Phase 5)
- Auth: wallet claim bridge JWT with wallet match enforcement
- Rate limits: See spec 15 § Recommended Rate Limit Policy

The AI Workspace has no dependency on chat tables or chat message routing.

## Service 3: Seller AI Auto-Reply (Future Worker)

This is the **planned** integration point where AI can respond to buyer messages automatically on behalf of a seller.

### Design Principles

1. The auto-reply must NOT be implemented as direct synchronous coupling between the Chat UI and AI engine
2. It must operate as an asynchronous worker that watches for new inbound messages and responds via the Chat Service API
3. The seller enables/configures this through the Agent Settings page ("Seller AI Auto-Reply" section)

### Planned Architecture

```
┌─────────────────────┐
│  New buyer message   │
│  lands in messages   │
│  table               │
└────────┬─────────────┘
         │
         ▼
┌─────────────────────┐
│  Trigger / Outbox    │
│  (DB trigger or      │
│   polling worker)    │
└────────┬─────────────┘
         │
         ▼
┌─────────────────────┐
│  Auto-Reply Worker   │
│                      │
│  1. Check seller     │
│     auto-reply config│
│  2. Load seller's    │
│     store data       │
│  3. Call AI engine   │
│  4. Insert reply as  │
│     system/agent msg │
│  5. Log usage/errors │
└─────────────────────┘
```

### Why Async Worker

- **Chat reliability**: If AI fails or is throttled, human chat still works
- **Rate control**: Worker has its own budget separate from human chat
- **Auditability**: Every AI-generated reply is logged with latency, model, and token usage
- **Seller control**: Seller can enable/disable, set response delay, restrict topics

### Model Connection

The auto-reply worker calls the AI engine through the same ORINA Engine API used by the AI Sidebar. The model configuration is shared — meaning:

- The seller configures their AI agent persona via the Agent Settings UI
- The same persona/config is used for both the AI Sidebar (direct seller interaction) and the auto-reply worker (buyer-facing)
- This is the only coupling point: shared config, not shared runtime

## What Must Not Happen

1. `messages.tsx` must never import or call `aiAgentClient.ts` directly
2. Chat send/receive handlers must never call the AI engine inline
3. AI assist handlers must never write to chat `messages` table directly
4. Auto-reply config must not be stored in chat tables — it belongs in the AI config namespace
