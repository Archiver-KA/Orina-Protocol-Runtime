# 🔌 Orina API - Tài Liệu Kỹ Thuật Đầy Đủ

> **Version:** 1.0  
> **Last Updated:** February 13, 2026  
> **Author:** Orina Development Team  
> **Base URL:** `https://{projectId}.supabase.co/functions/v1/make-server-b0d68fc8`

---

## 📋 Mục Lục

1. [Tổng Quan API](#1-tổng-quan-api)
2. [Authentication](#2-authentication)
3. [API Key Management](#3-api-key-management)
4. [Assets API](#4-assets-api)
5. [Messages API](#5-messages-api)
6. [AI Agent API](#6-ai-agent-api)
7. [IPFS Upload API](#7-ipfs-upload-api)
8. [Analytics API](#8-analytics-api)
9. [Orders API](#9-orders-api)
10. [Error Handling](#10-error-handling)
11. [Rate Limiting](#11-rate-limiting)
12. [Code Examples](#12-code-examples)

---

## 1. Tổng Quan API

### 1.1. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         ORINA API STACK                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Frontend (React)                                               │
│       │                                                         │
│       ▼                                                         │
│  API Clients (TypeScript)                                       │
│   ├─ messagesClient.ts                                          │
│   ├─ aiAgentClient.ts                                           │
│   └─ ipfsClient.ts                                              │
│       │                                                         │
│       ▼ HTTPS                                                   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Supabase Edge Function (Deno + Hono)                 │    │
│  │  /supabase/functions/server/index.tsx                 │    │
│  ├────────────────────────────────────────────────────────┤    │
│  │  Routes:                                               │    │
│  │  ├─ /make-server-b0d68fc8/health           [Health]   │    │
│  │  ├─ /make-server-b0d68fc8/keys/*           [API Keys] │    │
│  │  ├─ /make-server-b0d68fc8/api/v1/*         [Assets]   │    │
│  │  ├─ /make-server-b0d68fc8/messages/*       [Messages] │    │
│  │  ├─ /make-server-b0d68fc8/ai/*             [AI Agent] │    │
│  │  └─ /make-server-b0d68fc8/ipfs/*           [IPFS]     │    │
│  └────────────────────────────────────────────────────────┘    │
│       │                                                         │
│       ▼                                                         │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Supabase PostgreSQL (KV Store)                       │    │
│  │  - API Keys                                            │    │
│  │  - Messages                                            │    │
│  │  - AI Configs                                          │    │
│  │  - Assets                                              │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                 │
│  External Services:                                             │
│  ├─ Pinata (IPFS)                                               │
│  ├─ OpenAI (AI Agent)                                           │
│  └─ BSC Testnet (Blockchain)                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2. Environment Variables

```bash
# Supabase (required)
SUPABASE_URL=https://{projectId}.supabase.co
SUPABASE_ANON_KEY={publicAnonKey}
SUPABASE_SERVICE_ROLE_KEY={serviceRoleKey}  # Server-side only
SUPABASE_DB_URL=postgresql://...

# Pinata IPFS (required for image upload)
PINATA_JWT={your_pinata_jwt}

# OpenAI (optional - for AI Agent)
OPENAI_API_KEY={your_openai_key}
```

### 1.3. Base URL

```
Production: https://{projectId}.supabase.co/functions/v1/make-server-b0d68fc8
```

Replace `{projectId}` with your Supabase project ID.

### 1.4. Response Format

**Success Response:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error Response:**
```json
{
  "error": "Error message",
  "details": "Detailed error information"
}
```

---

## 2. Authentication

### 2.1. Overview

Orina API supports **two authentication methods**:

1. **Public Anon Key** (For frontend clients)
   - Used for: Messages, AI Agent config
   - Header: `Authorization: Bearer {publicAnonKey}`

2. **API Keys** (For seller integrations)
   - Used for: Assets CRUD, Analytics
   - Header: `Authorization: Bearer sk_seller_{key}`

### 2.2. Public Anon Key Auth

**Used by:** Frontend clients (React app)

```typescript
import { publicAnonKey } from '/utils/supabase/info';

const response = await fetch(`${BASE_URL}/messages/send`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${publicAnonKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ ... })
});
```

### 2.3. API Key Auth

**Used by:** Seller applications, third-party integrations

**Generate API Key:**
```bash
POST /make-server-b0d68fc8/keys/generate
```

**Use API Key:**
```typescript
const response = await fetch(`${BASE_URL}/api/v1/assets`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer sk_seller_abc123xyz...`,
    'Content-Type': 'application/json'
  }
});
```

### 2.4. Permissions Model

API Keys support **granular permissions**:

| Permission | Description | Endpoints |
|------------|-------------|-----------|
| `read` | Read access to assets, orders, analytics | GET /assets, GET /orders |
| `write` | Update existing assets | PUT /assets/:id |
| `mint` | Create new assets | POST /assets/mint |
| `delete` | Delete assets | DELETE /assets/:id |

**Example:**
```typescript
// API Key with read + mint permissions
{
  "permissions": ["read", "mint"],
  "walletAddress": "0x742d35Cc...",
  "name": "Production Key"
}
```

---

## 3. API Key Management

### 3.1. Generate API Key

**Endpoint:** `POST /keys/generate`

**Authentication:** None (public endpoint, but validate wallet ownership)

**Request:**
```json
{
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f9c4F",
  "name": "Production API Key",
  "permissions": ["read", "write", "mint"],
  "expiresInDays": 365
}
```

**Response:**
```json
{
  "success": true,
  "key": {
    "id": "key_1707829522000_abc123xyz",
    "key": "sk_seller_aBcD1234EfGh5678IjKl9012MnOp3456",
    "name": "Production API Key",
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f9c4F",
    "permissions": ["read", "write", "mint"],
    "createdAt": "2026-02-13T10:30:00.000Z",
    "expiresAt": "2027-02-13T10:30:00.000Z",
    "isActive": true,
    "usageStats": {
      "totalRequests": 0,
      "successRate": 100,
      "lastDayRequests": 0
    }
  }
}
```

**⚠️ IMPORTANT:** Save the `key` value securely. It will only be shown once.

---

### 3.2. List API Keys

**Endpoint:** `GET /keys/:walletAddress`

**Authentication:** Public Anon Key

**Example:**
```bash
GET /make-server-b0d68fc8/keys/0x742d35Cc6634C0532925a3b844Bc9e7595f9c4F
Authorization: Bearer {publicAnonKey}
```

**Response:**
```json
{
  "success": true,
  "keys": [
    {
      "id": "key_1707829522000_abc123xyz",
      "key": "sk_seller_****3456",  // Masked for security
      "name": "Production API Key",
      "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f9c4F",
      "permissions": ["read", "write", "mint"],
      "createdAt": "2026-02-13T10:30:00.000Z",
      "lastUsedAt": "2026-02-13T15:45:00.000Z",
      "expiresAt": "2027-02-13T10:30:00.000Z",
      "isActive": true,
      "usageStats": {
        "totalRequests": 1234,
        "successRate": 98.5,
        "lastDayRequests": 42
      }
    }
  ]
}
```

---

### 3.3. Revoke API Key

**Endpoint:** `POST /keys/:keyId/revoke`

**Authentication:** Public Anon Key

**Request:**
```json
{
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f9c4F"
}
```

**Response:**
```json
{
  "success": true
}
```

**Side Effect:** `isActive` is set to `false`. Key can no longer be used.

---

## 4. Assets API

### 4.1. List Assets

**Endpoint:** `GET /api/v1/assets`

**Authentication:** API Key with `read` permission

**Request:**
```bash
GET /make-server-b0d68fc8/api/v1/assets
Authorization: Bearer sk_seller_abc123...
```

**Response:**
```json
{
  "success": true,
  "count": 3,
  "assets": [
    {
      "id": "asset_1",
      "name": "Tesla Model 3 (2023)",
      "description": "Long Range, Autopilot, Pearl White",
      "type": "vehicle",
      "price": 35000,
      "currency": "USD",
      "status": "available",
      "metadata": {
        "year": 2023,
        "mileage": 12000,
        "condition": "excellent",
        "location": "California, USA"
      },
      "tokenId": "rwa_vehicle_001",
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-02-01T14:30:00Z"
    },
    {
      "id": "asset_2",
      "name": "Miami Condo Unit 405",
      "description": "2BR/2BA Ocean View, Brickell District",
      "type": "real_estate",
      "price": 450000,
      "currency": "USD",
      "status": "available",
      "metadata": {
        "bedrooms": 2,
        "bathrooms": 2,
        "sqft": 1200,
        "location": "Miami, FL"
      },
      "tokenId": "rwa_realestate_002",
      "createdAt": "2024-01-20T12:00:00Z",
      "updatedAt": "2024-02-05T09:15:00Z"
    },
    {
      "id": "asset_3",
      "name": "Gold Reserve 1kg Bar",
      "description": "99.99% Pure Gold, LBMA Certified",
      "type": "commodity",
      "price": 65000,
      "currency": "USD",
      "status": "available",
      "metadata": {
        "weight": "1kg",
        "purity": "99.99%",
        "certification": "LBMA",
        "serialNumber": "GLD-2024-001"
      },
      "tokenId": "rwa_commodity_003",
      "createdAt": "2024-02-01T08:00:00Z",
      "updatedAt": "2024-02-08T16:45:00Z"
    }
  ]
}
```

---

### 4.2. Get Single Asset

**Endpoint:** `GET /api/v1/assets/:id`

**Authentication:** API Key with `read` permission

**Example:**
```bash
GET /make-server-b0d68fc8/api/v1/assets/asset_1
Authorization: Bearer sk_seller_abc123...
```

**Response:**
```json
{
  "success": true,
  "asset": {
    "id": "asset_1",
    "name": "Tesla Model 3 (2023)",
    "description": "Long Range, Autopilot, Pearl White",
    "type": "vehicle",
    "price": 35000,
    "currency": "USD",
    "status": "available",
    "metadata": {
      "year": 2023,
      "mileage": 12000,
      "condition": "excellent",
      "location": "California, USA"
    },
    "tokenId": "rwa_vehicle_001",
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-02-01T14:30:00Z",
    "owner": "0x742d35Cc6634C0532925a3b844Bc9e7595f9c4F"
  }
}
```

**Error Response (404):**
```json
{
  "error": "Asset not found"
}
```

---

### 4.3. Mint Asset

**Endpoint:** `POST /api/v1/assets/mint`

**Authentication:** API Key with `mint` permission

**Request:**
```json
{
  "name": "Lamborghini Aventador SVJ",
  "description": "2022, Nero Pegaso Black, 6,500 miles",
  "type": "vehicle",
  "price": 580000,
  "currency": "USD",
  "metadata": {
    "year": 2022,
    "mileage": 6500,
    "color": "Nero Pegaso Black",
    "condition": "excellent",
    "vin": "ZHWUC4ZF1MLA12345"
  }
}
```

**Response:**
```json
{
  "success": true,
  "asset": {
    "id": "asset_1707829600000_xyz789",
    "name": "Lamborghini Aventador SVJ",
    "description": "2022, Nero Pegaso Black, 6,500 miles",
    "type": "vehicle",
    "price": 580000,
    "currency": "USD",
    "status": "available",
    "metadata": {
      "year": 2022,
      "mileage": 6500,
      "color": "Nero Pegaso Black",
      "condition": "excellent",
      "vin": "ZHWUC4ZF1MLA12345"
    },
    "tokenId": "rwa_vehicle_xyz789abc",
    "createdAt": "2026-02-13T16:00:00.000Z",
    "updatedAt": "2026-02-13T16:00:00.000Z",
    "owner": "0x742d35Cc6634C0532925a3b844Bc9e7595f9c4F"
  },
  "transaction": {
    "hash": "0xa1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
    "status": "confirmed",
    "blockNumber": 18234567
  }
}
```

**Status Code:** `201 Created`

**Error Response (400):**
```json
{
  "error": "Missing required fields: name, type, price"
}
```

**Error Response (403):**
```json
{
  "error": "Insufficient permissions. Requires: mint"
}
```

---

### 4.4. Update Asset

**Endpoint:** `PUT /api/v1/assets/:id`

**Authentication:** API Key with `write` permission

**Request:**
```json
{
  "price": 570000,
  "status": "sold",
  "metadata": {
    "year": 2022,
    "mileage": 6800,
    "color": "Nero Pegaso Black",
    "condition": "excellent",
    "vin": "ZHWUC4ZF1MLA12345"
  }
}
```

**Response:**
```json
{
  "success": true,
  "asset": {
    "id": "asset_1707829600000_xyz789",
    "name": "Lamborghini Aventador SVJ",
    "description": "2022, Nero Pegaso Black, 6,500 miles",
    "type": "vehicle",
    "price": 570000,
    "currency": "USD",
    "status": "sold",
    "metadata": {
      "year": 2022,
      "mileage": 6800,
      "color": "Nero Pegaso Black",
      "condition": "excellent",
      "vin": "ZHWUC4ZF1MLA12345"
    },
    "tokenId": "rwa_vehicle_xyz789abc",
    "createdAt": "2026-02-13T16:00:00.000Z",
    "updatedAt": "2026-02-13T17:30:00.000Z",
    "owner": "0x742d35Cc6634C0532925a3b844Bc9e7595f9c4F"
  }
}
```

**Note:** Cannot change `id`, `owner`, or `createdAt`.

---

### 4.5. Delete Asset

**Endpoint:** `DELETE /api/v1/assets/:id`

**Authentication:** API Key with `delete` permission

**Example:**
```bash
DELETE /make-server-b0d68fc8/api/v1/assets/asset_1707829600000_xyz789
Authorization: Bearer sk_seller_abc123...
```

**Response:**
```json
{
  "success": true,
  "message": "Asset deleted successfully"
}
```

**Error Response (404):**
```json
{
  "error": "Asset not found"
}
```

---

## 5. Messages API

**Full documentation:** See `/MESSENGER_DOCUMENTATION.md`

### 5.1. Send Message

**Endpoint:** `POST /messages/send`

**Authentication:** Public Anon Key

**Request:**
```json
{
  "sender": "0x742d35Cc6634C0532925a3b844Bc9e7595f9c4F",
  "receiver": "0xfedcba0987654321...",
  "text": "Hello! I'm interested in the Miami Condo.",
  "image": {
    "url": "https://gateway.pinata.cloud/ipfs/Qm...",
    "ipfsHash": "Qm..."
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": {
    "id": "msg_1707829522000_abc123xyz",
    "conversationId": "conv_0x742d35cc_0xfedcba09",
    "sender": "0x742d35cc6634c0532925a3b844bc9e7595f9c4f",
    "receiver": "0xfedcba0987654321...",
    "text": "Hello! I'm interested in the Miami Condo.",
    "timestamp": "2026-02-13T15:45:22.000Z",
    "read": false
  },
  "conversation": {
    "id": "conv_0x742d35cc_0xfedcba09",
    "participants": ["0x742d35cc...", "0xfedcba09..."],
    "lastMessage": "Hello! I'm interested...",
    "lastMessageTime": "2026-02-13T15:45:22.000Z",
    "unreadCount": {
      "0x742d35cc...": 0,
      "0xfedcba09...": 1
    }
  }
}
```

---

### 5.2. Get Conversations

**Endpoint:** `GET /messages/conversations/:address`

**Example:**
```bash
GET /make-server-b0d68fc8/messages/conversations/0x742d35Cc...
Authorization: Bearer {publicAnonKey}
```

**Response:**
```json
{
  "success": true,
  "conversations": [
    {
      "id": "conv_0x742d35cc_0xfedcba09",
      "participants": ["0x742d35cc...", "0xfedcba09..."],
      "createdAt": "2026-02-13T10:30:00.000Z",
      "lastMessage": "Hello! I'm interested...",
      "lastMessageTime": "2026-02-13T15:45:22.000Z",
      "unreadCount": {
        "0x742d35cc...": 0,
        "0xfedcba09...": 1
      }
    }
  ],
  "metadata": {
    "conv_0x742d35cc_0xfedcba09": {
      "displayName": "0xfedc...4321"
    }
  }
}
```

---

### 5.3. Get Messages

**Endpoint:** `GET /messages/:conversationId?userAddress={address}`

**Example:**
```bash
GET /make-server-b0d68fc8/messages/conv_0x742d35cc_0xfedcba09?userAddress=0x742d35Cc...
Authorization: Bearer {publicAnonKey}
```

**Response:**
```json
{
  "success": true,
  "messages": [
    {
      "id": "msg_1707829522000_abc123xyz",
      "conversationId": "conv_0x742d35cc_0xfedcba09",
      "sender": "0xfedcba09...",
      "receiver": "0x742d35cc...",
      "text": "Hello! I'm interested in the Miami Condo.",
      "timestamp": "2026-02-13T15:45:22.000Z",
      "read": false
    },
    {
      "id": "msg_1707829600000_def456",
      "conversationId": "conv_0x742d35cc_0xfedcba09",
      "sender": "0x742d35cc...",
      "receiver": "0xfedcba09...",
      "text": "Great! When can you visit?",
      "timestamp": "2026-02-13T15:46:40.000Z",
      "read": true
    }
  ],
  "conversation": {
    "id": "conv_0x742d35cc_0xfedcba09",
    "participants": ["0x742d35cc...", "0xfedcba09..."],
    "unreadCount": {
      "0x742d35cc...": 0,
      "0xfedcba09...": 0
    }
  }
}
```

**Side Effect:** Auto-marks messages as read for `userAddress`.

---

### 5.4. Mark as Read

**Endpoint:** `POST /messages/read`

**Request:**
```json
{
  "conversationId": "conv_0x742d35cc_0xfedcba09",
  "userAddress": "0x742d35Cc..."
}
```

**Response:**
```json
{
  "success": true
}
```

---

### 5.5. Delete Conversation

**Endpoint:** `DELETE /messages/:conversationId?userAddress={address}`

**Example:**
```bash
DELETE /make-server-b0d68fc8/messages/conv_0x742d35cc_0xfedcba09?userAddress=0x742d35Cc...
Authorization: Bearer {publicAnonKey}
```

**Response:**
```json
{
  "success": true
}
```

**Note:** Only removes conversation from user's list. Doesn't delete messages.

---

## 6. AI Agent API

### 6.1. Send Chat Message

**Endpoint:** `POST /ai/chat`

**Authentication:** Public Anon Key

**Request:**
```json
{
  "sellerAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f9c4F",
  "message": "What assets do you have available?",
  "conversationId": "conv_buyer_0xabc123_seller_0x742d35"
}
```

**Response:**
```json
{
  "success": true,
  "response": {
    "id": "ai_msg_1707829522000_xyz",
    "content": "I currently have 3 RWA assets available:\n\n1. Tesla Model 3 (2023) - $35,000\n2. Miami Condo Unit 405 - $450,000\n3. Gold Reserve 1kg Bar - $65,000\n\nWould you like more details on any of these?",
    "timestamp": "2026-02-13T15:45:22.000Z",
    "metadata": {
      "processingTime": 850,
      "aiModel": "gpt-4",
      "confidence": 0.95
    }
  }
}
```

**Error Response (404):**
```json
{
  "error": "AI Agent is not enabled for this seller"
}
```

---

### 6.2. Get AI Config

**Endpoint:** `GET /ai/config/:walletAddress`

**Authentication:** Public Anon Key

**Example:**
```bash
GET /make-server-b0d68fc8/ai/config/0x742d35Cc...
Authorization: Bearer {publicAnonKey}
```

**Response:**
```json
{
  "success": true,
  "config": {
    "id": "ai_agent_1707829522000_xyz",
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f9c4F",
    "enabled": true,
    "name": "Sales Assistant",
    "behavior": "professional",
    "autoReplyEnabled": true,
    "greetingMessage": "Hello! How can I help you today?",
    "createdAt": "2026-02-01T10:00:00.000Z",
    "updatedAt": "2026-02-13T14:30:00.000Z"
  }
}
```

**Behavior Options:**
- `casual` - Friendly, informal tone
- `moderate` - Balanced, professional
- `professional` - Formal, business-like

---

### 6.3. Save AI Config

**Endpoint:** `POST /ai/config`

**Authentication:** Public Anon Key

**Request:**
```json
{
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f9c4F",
  "name": "Sales Assistant",
  "behavior": "professional",
  "enabled": true,
  "autoReplyEnabled": true,
  "greetingMessage": "Hello! How can I help you today?"
}
```

**Response:**
```json
{
  "success": true,
  "config": {
    "id": "ai_agent_1707829522000_xyz",
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f9c4F",
    "enabled": true,
    "name": "Sales Assistant",
    "behavior": "professional",
    "autoReplyEnabled": true,
    "greetingMessage": "Hello! How can I help you today?",
    "createdAt": "2026-02-01T10:00:00.000Z",
    "updatedAt": "2026-02-13T16:45:00.000Z"
  }
}
```

---

### 6.4. Get Conversation History

**Endpoint:** `GET /ai/conversation/:conversationId`

**Authentication:** Public Anon Key

**Example:**
```bash
GET /make-server-b0d68fc8/ai/conversation/conv_buyer_0xabc123_seller_0x742d35
Authorization: Bearer {publicAnonKey}
```

**Response:**
```json
{
  "success": true,
  "messages": [
    {
      "role": "user",
      "content": "What assets do you have available?",
      "timestamp": "2026-02-13T15:45:00.000Z"
    },
    {
      "role": "assistant",
      "content": "I currently have 3 RWA assets available...",
      "timestamp": "2026-02-13T15:45:22.000Z"
    },
    {
      "role": "user",
      "content": "Tell me more about the Miami Condo",
      "timestamp": "2026-02-13T15:46:00.000Z"
    },
    {
      "role": "assistant",
      "content": "The Miami Condo Unit 405 is a 2BR/2BA...",
      "timestamp": "2026-02-13T15:46:15.000Z"
    }
  ]
}
```

---

## 7. IPFS Upload API

### 7.1. Check IPFS Configuration

**Endpoint:** `GET /ipfs/check`

**Authentication:** None

**Response:**
```json
{
  "configured": true,
  "message": "IPFS upload is configured and ready"
}
```

**Or if not configured:**
```json
{
  "configured": false,
  "message": "IPFS not configured. Set PINATA_JWT environment variable."
}
```

---

### 7.2. Upload Single File

**Endpoint:** `POST /ipfs/upload`

**Authentication:** Public Anon Key

**Request:** `multipart/form-data`

```bash
curl -X POST \
  https://{projectId}.supabase.co/functions/v1/make-server-b0d68fc8/ipfs/upload \
  -H "Authorization: Bearer {publicAnonKey}" \
  -F "file=@/path/to/image.jpg"
```

**Response:**
```json
{
  "success": true,
  "ipfsHash": "QmXyZ123abc...",
  "urls": {
    "pinata": "https://gateway.pinata.cloud/ipfs/QmXyZ123abc...",
    "ipfs": "https://ipfs.io/ipfs/QmXyZ123abc...",
    "cloudflare": "https://cloudflare-ipfs.com/ipfs/QmXyZ123abc...",
    "dweb": "https://dweb.link/ipfs/QmXyZ123abc..."
  },
  "metadata": {
    "fileName": "image.jpg",
    "fileSize": 2048576,
    "mimeType": "image/jpeg",
    "timestamp": "2026-02-13T15:45:22.000Z"
  }
}
```

**Supported File Types:**
- `image/jpeg`, `image/jpg`, `image/png`
- `image/gif`, `image/webp`
- `video/mp4`

**File Size Limit:** 100MB

**Error Response (400):**
```json
{
  "error": "File size exceeds 100MB limit"
}
```

---

### 7.3. Upload Multiple Files

**Endpoint:** `POST /ipfs/upload-multiple`

**Authentication:** Public Anon Key

**Request:** `multipart/form-data`

```bash
curl -X POST \
  https://{projectId}.supabase.co/functions/v1/make-server-b0d68fc8/ipfs/upload-multiple \
  -H "Authorization: Bearer {publicAnonKey}" \
  -F "files=@/path/to/image1.jpg" \
  -F "files=@/path/to/image2.jpg" \
  -F "files=@/path/to/image3.jpg"
```

**Response:**
```json
{
  "success": true,
  "uploaded": 3,
  "failed": 0,
  "results": [
    {
      "index": 0,
      "fileName": "image1.jpg",
      "ipfsHash": "QmAbc123...",
      "urls": {
        "pinata": "https://gateway.pinata.cloud/ipfs/QmAbc123...",
        "ipfs": "https://ipfs.io/ipfs/QmAbc123...",
        "cloudflare": "https://cloudflare-ipfs.com/ipfs/QmAbc123...",
        "dweb": "https://dweb.link/ipfs/QmAbc123..."
      },
      "metadata": {
        "fileSize": 1048576,
        "mimeType": "image/jpeg",
        "timestamp": "2026-02-13T15:45:22.000Z"
      }
    },
    {
      "index": 1,
      "fileName": "image2.jpg",
      "ipfsHash": "QmDef456...",
      "urls": { ... },
      "metadata": { ... }
    },
    {
      "index": 2,
      "fileName": "image3.jpg",
      "ipfsHash": "QmGhi789...",
      "urls": { ... },
      "metadata": { ... }
    }
  ]
}
```

**Limits:**
- Max 10 files per batch
- Each file max 100MB

**Partial Success:**
```json
{
  "success": true,
  "uploaded": 2,
  "failed": 1,
  "results": [ ... ],
  "errors": [
    {
      "index": 1,
      "fileName": "image2.jpg",
      "error": "File exceeds 100MB"
    }
  ]
}
```

---

### 7.4. Get IPFS File Info

**Endpoint:** `GET /ipfs/info/:hash`

**Authentication:** None

**Example:**
```bash
GET /make-server-b0d68fc8/ipfs/info/QmXyZ123abc...
```

**Response:**
```json
{
  "ipfsHash": "QmXyZ123abc...",
  "urls": {
    "pinata": "https://gateway.pinata.cloud/ipfs/QmXyZ123abc...",
    "ipfs": "https://ipfs.io/ipfs/QmXyZ123abc...",
    "cloudflare": "https://cloudflare-ipfs.com/ipfs/QmXyZ123abc...",
    "dweb": "https://dweb.link/ipfs/QmXyZ123abc..."
  }
}
```

---

## 8. Analytics API

### 8.1. Get Analytics

**Endpoint:** `GET /api/v1/analytics`

**Authentication:** API Key with `read` permission

**Example:**
```bash
GET /make-server-b0d68fc8/api/v1/analytics
Authorization: Bearer sk_seller_abc123...
```

**Response:**
```json
{
  "success": true,
  "analytics": {
    "totalVolume": 2340000,
    "assetsCount": 12,
    "activeListings": 8,
    "soldAssets": 4,
    "averagePrice": 195000,
    "topCategory": "real_estate",
    "recentSales": [
      {
        "assetId": "asset_5",
        "name": "Luxury Yacht 45ft",
        "price": 850000,
        "soldAt": "2024-02-05T14:30:00Z"
      }
    ],
    "monthlyRevenue": {
      "january": 1200000,
      "february": 1140000
    }
  }
}
```

**Metrics Explained:**
- `totalVolume`: Total value of all assets (USD)
- `assetsCount`: Total number of assets
- `activeListings`: Currently listed assets
- `soldAssets`: Assets sold
- `averagePrice`: Average asset price
- `topCategory`: Best-performing category
- `recentSales`: Array of recent sales
- `monthlyRevenue`: Revenue breakdown by month

---

## 9. Orders API

### 9.1. Get Orders

**Endpoint:** `GET /api/v1/orders`

**Authentication:** API Key with `read` permission

**Example:**
```bash
GET /make-server-b0d68fc8/api/v1/orders
Authorization: Bearer sk_seller_abc123...
```

**Response:**
```json
{
  "success": true,
  "count": 2,
  "orders": [
    {
      "id": "order_1",
      "assetId": "asset_1",
      "buyerAddress": "0x123...abc",
      "price": 35000,
      "currency": "USDC",
      "status": "pending",
      "createdAt": "2024-02-08T10:00:00Z"
    },
    {
      "id": "order_2",
      "assetId": "asset_3",
      "buyerAddress": "0x456...def",
      "price": 65000,
      "currency": "ETH",
      "status": "completed",
      "createdAt": "2024-02-06T15:30:00Z",
      "completedAt": "2024-02-07T09:15:00Z"
    }
  ]
}
```

**Order Status:**
- `pending` - Awaiting payment confirmation
- `processing` - Payment received, processing
- `completed` - Order fulfilled
- `cancelled` - Order cancelled
- `refunded` - Payment refunded

---

## 10. Error Handling

### 10.1. Standard Error Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 400 | Bad Request | Missing/invalid parameters |
| 401 | Unauthorized | Invalid/missing API key or token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

### 10.2. Error Response Format

```json
{
  "error": "Human-readable error message",
  "details": "Technical details (optional)",
  "code": "ERROR_CODE" // Optional error code
}
```

### 10.3. Common Errors

**Authentication Errors:**
```json
// Missing authorization header
{
  "error": "Missing or invalid Authorization header"
}

// Invalid API key
{
  "error": "Invalid or expired API key",
  "details": "Key not found or deactivated"
}

// Insufficient permissions
{
  "error": "Insufficient permissions. Requires: mint",
  "details": "Your API key does not have 'mint' permission"
}
```

**Validation Errors:**
```json
// Missing required fields
{
  "error": "Missing required fields: name, type, price"
}

// Invalid file type
{
  "error": "Invalid file type. Allowed: image/jpeg, image/png, image/gif, image/webp, video/mp4"
}

// File too large
{
  "error": "File size exceeds 100MB limit"
}
```

**Rate Limit Error:**
```json
{
  "error": "Rate limit exceeded. Please try again later.",
  "details": "Limit: 100 requests/minute",
  "retryAfter": 45
}
```

---

## 11. Rate Limiting

### 11.1. Current Limits

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| API Key Auth | 1000 requests | per hour |
| Public Anon Key | 100 requests | per minute |
| IPFS Upload | 50 uploads | per hour |
| AI Chat | 100 messages | per hour |

### 11.2. Rate Limit Headers

**Response Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 73
X-RateLimit-Reset: 1707829800
```

**Explanation:**
- `X-RateLimit-Limit`: Total allowed requests
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Unix timestamp when limit resets

### 11.3. Handling Rate Limits

**Example:**
```typescript
async function makeRequest() {
  const response = await fetch(url, options);
  
  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
    console.log(`Rate limited. Retry after ${retryAfter}s`);
    
    // Wait and retry
    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
    return makeRequest();
  }
  
  return response;
}
```

---

## 12. Code Examples

### 12.1. Node.js/TypeScript Client

```typescript
import axios, { AxiosInstance } from 'axios';

class OrinaAPIClient {
  private client: AxiosInstance;
  
  constructor(apiKey: string, baseURL?: string) {
    this.client = axios.create({
      baseURL: baseURL || 'https://your-project.supabase.co/functions/v1/make-server-b0d68fc8',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }
  
  // Assets
  async getAssets() {
    const response = await this.client.get('/api/v1/assets');
    return response.data;
  }
  
  async getAsset(assetId: string) {
    const response = await this.client.get(`/api/v1/assets/${assetId}`);
    return response.data;
  }
  
  async mintAsset(data: {
    name: string;
    type: string;
    price: number;
    description?: string;
    metadata?: any;
  }) {
    const response = await this.client.post('/api/v1/assets/mint', data);
    return response.data;
  }
  
  async updateAsset(assetId: string, data: any) {
    const response = await this.client.put(`/api/v1/assets/${assetId}`, data);
    return response.data;
  }
  
  async deleteAsset(assetId: string) {
    const response = await this.client.delete(`/api/v1/assets/${assetId}`);
    return response.data;
  }
  
  // Analytics
  async getAnalytics() {
    const response = await this.client.get('/api/v1/analytics');
    return response.data;
  }
  
  // Orders
  async getOrders() {
    const response = await this.client.get('/api/v1/orders');
    return response.data;
  }
}

// Usage
const client = new OrinaAPIClient('sk_seller_abc123xyz...');

// List assets
const assets = await client.getAssets();
console.log('Assets:', assets);

// Mint new asset
const newAsset = await client.mintAsset({
  name: 'Luxury Yacht 45ft',
  type: 'vehicle',
  price: 850000,
  description: 'Pristine condition, fully equipped',
  metadata: {
    year: 2023,
    brand: 'Sunseeker',
    length: '45ft'
  }
});
console.log('Minted:', newAsset);
```

---

### 12.2. Python Client

```python
import requests

class OrinaAPIClient:
    def __init__(self, api_key, base_url=None):
        self.base_url = base_url or 'https://your-project.supabase.co/functions/v1/make-server-b0d68fc8'
        self.headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }
    
    def get_assets(self):
        response = requests.get(f'{self.base_url}/api/v1/assets', headers=self.headers)
        response.raise_for_status()
        return response.json()
    
    def get_asset(self, asset_id):
        response = requests.get(f'{self.base_url}/api/v1/assets/{asset_id}', headers=self.headers)
        response.raise_for_status()
        return response.json()
    
    def mint_asset(self, data):
        response = requests.post(f'{self.base_url}/api/v1/assets/mint', json=data, headers=self.headers)
        response.raise_for_status()
        return response.json()
    
    def update_asset(self, asset_id, data):
        response = requests.put(f'{self.base_url}/api/v1/assets/{asset_id}', json=data, headers=self.headers)
        response.raise_for_status()
        return response.json()
    
    def delete_asset(self, asset_id):
        response = requests.delete(f'{self.base_url}/api/v1/assets/{asset_id}', headers=self.headers)
        response.raise_for_status()
        return response.json()
    
    def get_analytics(self):
        response = requests.get(f'{self.base_url}/api/v1/analytics', headers=self.headers)
        response.raise_for_status()
        return response.json()

# Usage
client = OrinaAPIClient('sk_seller_abc123xyz...')

# List assets
assets = client.get_assets()
print('Assets:', assets)

# Mint new asset
new_asset = client.mint_asset({
    'name': 'Gold Bar 1kg',
    'type': 'commodity',
    'price': 65000,
    'metadata': {
        'weight': '1kg',
        'purity': '99.99%'
    }
})
print('Minted:', new_asset)
```

---

### 12.3. cURL Examples

**Generate API Key:**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/make-server-b0d68fc8/keys/generate \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f9c4F",
    "name": "Production Key",
    "permissions": ["read", "write", "mint"],
    "expiresInDays": 365
  }'
```

**List Assets:**
```bash
curl -X GET https://your-project.supabase.co/functions/v1/make-server-b0d68fc8/api/v1/assets \
  -H "Authorization: Bearer sk_seller_abc123xyz..."
```

**Mint Asset:**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/make-server-b0d68fc8/api/v1/assets/mint \
  -H "Authorization: Bearer sk_seller_abc123xyz..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ferrari F8 Tributo",
    "type": "vehicle",
    "price": 280000,
    "description": "2021, Rosso Corsa Red, 5,000 miles",
    "metadata": {
      "year": 2021,
      "color": "Rosso Corsa",
      "mileage": 5000
    }
  }'
```

**Upload to IPFS:**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/make-server-b0d68fc8/ipfs/upload \
  -H "Authorization: Bearer {publicAnonKey}" \
  -F "file=@/path/to/image.jpg"
```

**Send Message:**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/make-server-b0d68fc8/messages/send \
  -H "Authorization: Bearer {publicAnonKey}" \
  -H "Content-Type: application/json" \
  -d '{
    "sender": "0x742d35Cc...",
    "receiver": "0xfedcba09...",
    "text": "Hello! Interested in your condo."
  }'
```

---

## 📚 Appendix

### A. Complete Endpoint List

```
Health:
  GET  /make-server-b0d68fc8/health

API Keys:
  POST /make-server-b0d68fc8/keys/generate
  GET  /make-server-b0d68fc8/keys/:walletAddress
  POST /make-server-b0d68fc8/keys/:keyId/revoke

Assets:
  GET    /make-server-b0d68fc8/api/v1/assets
  GET    /make-server-b0d68fc8/api/v1/assets/:id
  POST   /make-server-b0d68fc8/api/v1/assets/mint
  PUT    /make-server-b0d68fc8/api/v1/assets/:id
  DELETE /make-server-b0d68fc8/api/v1/assets/:id

Analytics:
  GET /make-server-b0d68fc8/api/v1/analytics

Orders:
  GET /make-server-b0d68fc8/api/v1/orders

Messages:
  POST   /make-server-b0d68fc8/messages/send
  GET    /make-server-b0d68fc8/messages/conversations/:address
  GET    /make-server-b0d68fc8/messages/:conversationId
  POST   /make-server-b0d68fc8/messages/read
  DELETE /make-server-b0d68fc8/messages/:conversationId

AI Agent:
  POST /make-server-b0d68fc8/ai/chat
  GET  /make-server-b0d68fc8/ai/config/:walletAddress
  POST /make-server-b0d68fc8/ai/config
  GET  /make-server-b0d68fc8/ai/conversation/:conversationId

IPFS:
  GET  /make-server-b0d68fc8/ipfs/check
  POST /make-server-b0d68fc8/ipfs/upload
  POST /make-server-b0d68fc8/ipfs/upload-multiple
  GET  /make-server-b0d68fc8/ipfs/info/:hash
```

### B. Status Codes Reference

| Code | Status | Usage |
|------|--------|-------|
| 200 | OK | Successful GET, PUT, DELETE |
| 201 | Created | Successful POST (resource created) |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Missing/invalid auth |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

### C. Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-13 | Initial API documentation release |

---

## 📞 Support

- **Documentation:** This file + other docs in `/docs`
- **GitHub Issues:** [Report bugs](https://github.com/orina/issues)
- **Discord:** [Join community](https://discord.gg/orina)
- **Email:** api-support@orina.io

---

**Last Updated:** February 13, 2026  
**Document Version:** 1.0  
**Maintained By:** Orina Development Team
