# 🔑 API Keys System Documentation

## Web3 Analytics Dashboard Studio Pro - MarketplaceATP Protocol v3.3

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Getting Started](#getting-started)
4. [API Key Management](#api-key-management)
5. [Permissions System](#permissions-system)
6. [Usage & Monitoring](#usage--monitoring)
7. [Security Best Practices](#security-best-practices)
8. [Integration Guide](#integration-guide)
9. [API Reference](#api-reference)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

### What is the API Keys System?

Hệ thống API Keys cho phép **AI agents** và **automation tools** tương tác với MarketplaceATP Protocol v3.3 thông qua REST API một cách an toàn và có kiểm soát.

### Key Features

- ✅ **Wallet-based Authentication** - Mỗi API key liên kết với 1 wallet address
- ✅ **Granular Permissions** - 4 cấp độ quyền: Read, Write, Mint, Delete
- ✅ **Usage Analytics** - Theo dõi requests, success rate, last used
- ✅ **Expiration Control** - Tự động hết hạn sau thời gian định trước
- ✅ **Instant Revocation** - Thu hồi key ngay lập tức khi cần
- ✅ **Client-side Storage** - Không có backend server, data stored in localStorage

### Use Cases

```
🤖 AI Agent Integration
   └─ ChatGPT, Claude, custom agents quản lý listings tự động

📊 Analytics Dashboard
   └─ Third-party tools đọc dữ liệu marketplace

🔄 Automation Scripts
   └─ Price updates, bulk operations, scheduled tasks

🌐 Mobile Apps
   └─ iOS/Android apps kết nối với marketplace
```

---

## 🏗️ Architecture

### System Design

```
┌─────────────────────────────────────────────────────────┐
│                   Web3 Dashboard UI                      │
│                  (React + TypeScript)                    │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│              APIKeyManager (Client-side)                 │
│  ┌────────────────────────────────────────────────────┐ │
│  │  generateKey()  │  revokeKey()  │  validateKey()  │ │
│  │  getKeys()      │  updateStats() │  checkExpiry() │ │
│  └────────────────────────────────────────────────────┘ │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│                localStorage (Browser)                    │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Key: "marketplaceATP_apiKeys"                     │ │
│  │  Value: { walletAddress → APIKey[] }              │ │
│  └────────────────────────────────────────────────────┘ │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│              Blockchain (MarketplaceATP)                 │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Smart Contracts via Wagmi/Viem                    │ │
│  │  Direct blockchain calls (no backend)              │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Data Structure

```typescript
interface APIKey {
  id: string;                    // Unique identifier (UUID v4)
  key: string;                   // Actual API key (40 chars)
  name: string;                  // User-defined name
  walletAddress: string;         // Owner wallet (0x...)
  permissions: APIKeyPermission[]; // ['read', 'write', 'mint', 'delete']
  createdAt: string;             // ISO 8601 timestamp
  expiresAt: string | null;      // ISO 8601 or null (never expires)
  lastUsedAt: string | null;     // ISO 8601 or null
  isActive: boolean;             // true/false (revoked)
  usageStats: {
    totalRequests: number;       // Total API calls
    successRate: number;         // 0-100%
    lastRequestAt: string | null; // ISO 8601
  };
}

type APIKeyPermission = 'read' | 'write' | 'mint' | 'delete';
```

### Storage Schema

```json
{
  "marketplaceATP_apiKeys": {
    "0x1234...5678": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "key": "matp_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
        "name": "ChatGPT Agent",
        "walletAddress": "0x1234...5678",
        "permissions": ["read", "write"],
        "createdAt": "2026-02-09T10:30:00.000Z",
        "expiresAt": "2026-03-11T10:30:00.000Z",
        "lastUsedAt": "2026-02-09T15:45:00.000Z",
        "isActive": true,
        "usageStats": {
          "totalRequests": 1247,
          "successRate": 98.4,
          "lastRequestAt": "2026-02-09T15:45:00.000Z"
        }
      }
    ],
    "0xabcd...efgh": [...]
  }
}
```

---

## 🚀 Getting Started

### Step 1: Navigate to Settings

```
Dashboard → Settings (⚙️ icon) → API Keys Section
```

### Step 2: Generate Your First Key

1. **Click "Generate New Key"** button (top-right)
2. **Fill in the form:**
   - **Key Name**: e.g., "ChatGPT Agent", "Production Bot"
   - **Permissions**: Select required permissions (Read is mandatory)
   - **Expiration**: Optional (7/30/90/365 days or never)
3. **Click "Generate Key"** button

### Step 3: Save Your Key Securely

```
⚠️ CRITICAL: Copy the key immediately!
   You won't be able to see it again.

✅ Store in: Password manager, .env file, secure vault
❌ Don't: Email, Slack, Git commit, public pastebins
```

### Step 4: Test Your Key

```bash
curl -X GET https://your-api-endpoint.com/assets \
  -H "Authorization: Bearer matp_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6" \
  -H "Content-Type: application/json"
```

---

## 🔐 API Key Management

### Generating Keys

#### UI Method

```
Settings → API Keys → Generate New Key
```

#### Programmatic Method

```typescript
import { APIKeyManager } from '@/utils/apiKeyManager';

const newKey = APIKeyManager.generateKey(
  '0x1234567890123456789012345678901234567890',
  {
    name: 'My Agent',
    permissions: ['read', 'write'],
    expiresInDays: 30
  }
);

console.log(newKey.key); // matp_live_...
```

### Key Format

```
Prefix: matp_live_
Length: 40 characters total (9 prefix + 31 random)
Charset: a-z, 0-9 (lowercase alphanumeric)
Example: matp_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6

Format Breakdown:
┌────────┬─────────────────────────────────┐
│ Prefix │        Random String            │
│ 9 chars│          31 chars               │
└────────┴─────────────────────────────────┘
matp_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

### Viewing Keys

```typescript
// Get all keys for a wallet
const keys = APIKeyManager.getKeysForWallet(walletAddress);

// Get specific key
const key = APIKeyManager.getKeyById(keyId);
```

### Revoking Keys

#### UI Method

```
Settings → API Keys → [Key Card] → 🗑️ Revoke button
```

#### Programmatic Method

```typescript
APIKeyManager.revokeKey(keyId);
// Key immediately becomes invalid (isActive: false)
```

### Key Lifecycle

```
┌─────────┐     ┌────────┐     ┌─────────┐     ┌─────────┐
│ Created │ ──► │ Active │ ──► │ Expired │     │ Revoked │
└─────────┘     └────────┘     └─────────┘     └─────────┘
    │               │               │               │
    │               │               └───────────────┘
    │               └───────────────────────────────┘
    │                       (isActive: false)
    └────────────────────────────────────────────────
                 (isActive: true)
```

---

## 🔒 Permissions System

### Permission Levels

#### 1. **READ** (Required)

```yaml
Scope: View-only access
Actions:
  - Get asset listings
  - View order history
  - Read analytics data
  - Access marketplace stats
Cannot:
  - Modify any data
  - Create new assets
  - Delete anything
```

**API Endpoints:**
```
GET  /api/assets
GET  /api/assets/:id
GET  /api/orders
GET  /api/analytics
GET  /api/stats
```

#### 2. **WRITE** (Optional)

```yaml
Scope: Modify existing data
Actions:
  - Update asset prices
  - Edit asset descriptions
  - Update metadata
  - Modify order status
Cannot:
  - Create new assets
  - Delete assets
  - Mint tokens
```

**API Endpoints:**
```
PUT   /api/assets/:id
PATCH /api/assets/:id
PUT   /api/orders/:id
```

#### 3. **MINT** (Optional)

```yaml
Scope: Create new assets
Actions:
  - Create new listings
  - Mint RWA tokens
  - Upload new assets
  - Initialize marketplace items
Cannot:
  - Delete assets
  - Modify existing assets (need WRITE)
```

**API Endpoints:**
```
POST /api/assets
POST /api/mint
POST /api/listings
```

#### 4. **DELETE** (Dangerous)

```yaml
Scope: Remove data permanently
Actions:
  - Delete asset listings
  - Remove orders
  - Burn tokens
  - Clear marketplace items
⚠️ Warning:
  - Irreversible actions
  - High risk operations
  - Requires explicit confirmation
```

**API Endpoints:**
```
DELETE /api/assets/:id
DELETE /api/orders/:id
POST   /api/burn
```

### Permission Combinations

#### Recommended Presets

```typescript
// 1. Read-Only Bot (Analytics)
{
  permissions: ['read']
}

// 2. Price Update Bot (Common)
{
  permissions: ['read', 'write']
}

// 3. Full Management Agent (Trusted)
{
  permissions: ['read', 'write', 'mint']
}

// 4. God Mode (Use with extreme caution)
{
  permissions: ['read', 'write', 'mint', 'delete']
}
```

#### Permission Matrix

```
┌────────────┬──────┬───────┬──────┬────────┐
│ Action     │ Read │ Write │ Mint │ Delete │
├────────────┼──────┼───────┼──────┼────────┤
│ View data  │  ✅  │   ✅  │  ✅  │   ✅   │
│ Edit data  │  ❌  │   ✅  │  ✅  │   ✅   │
│ Create new │  ❌  │   ❌  │  ✅  │   ✅   │
│ Remove     │  ❌  │   ❌  │  ❌  │   ✅   │
└────────────┴──────┴───────┴──────┴────────┘
```

---

## 📊 Usage & Monitoring

### Usage Statistics

Mỗi API key theo dõi:

```typescript
usageStats: {
  totalRequests: 1247,      // Total API calls made
  successRate: 98.4,        // % successful requests
  lastRequestAt: '2026-02-09T15:45:00.000Z'
}
```

### Viewing Stats

#### Dashboard Overview

```
Settings → API Keys → Stats Overview

┌──────────────────┬─────────────────┬──────────────┐
│ Total Requests   │ Success Rate    │ Active Keys  │
│ 12,847          │ 98.4%           │ 3 / 5        │
└──────────────────┴─────────────────┴──────────────┘
```

#### Per-Key Details

```
Settings → API Keys → [Key Card] → Bottom section

┌─────────┬────────────┬──────────┬──────────────┐
│ Created │ Last Used  │ Requests │ Success Rate │
│ Feb 1   │ 5 mins ago │ 1,247    │ 98.4%        │
└─────────┴────────────┴──────────┴──────────────┘
```

### Tracking Usage Programmatically

```typescript
// Update stats after API call
APIKeyManager.updateKeyUsage(keyId, {
  success: true, // or false
  timestamp: new Date().toISOString()
});

// Get usage stats
const key = APIKeyManager.getKeyById(keyId);
console.log(key.usageStats);
```

### Expiration Monitoring

```typescript
// Check if key is expired
const isExpired = APIKeyManager.isKeyExpired(keyId);

// Get expiration date
const key = APIKeyManager.getKeyById(keyId);
if (key.expiresAt) {
  const daysUntilExpiry = Math.ceil(
    (new Date(key.expiresAt).getTime() - Date.now()) 
    / (1000 * 60 * 60 * 24)
  );
  console.log(`Expires in ${daysUntilExpiry} days`);
}
```

---

## 🛡️ Security Best Practices

### ✅ DO's

```yaml
Storage:
  ✅ Store keys in environment variables
  ✅ Use password managers (1Password, Bitwarden)
  ✅ Encrypt keys at rest
  ✅ Use secure vaults (HashiCorp Vault, AWS Secrets Manager)

Usage:
  ✅ Use HTTPS only
  ✅ Rotate keys every 90 days
  ✅ Use minimum required permissions
  ✅ Set expiration dates for temporary bots
  ✅ Monitor usage regularly
  ✅ Revoke unused keys immediately

Development:
  ✅ Use different keys for dev/staging/production
  ✅ Add keys to .gitignore
  ✅ Use .env.example templates (without real keys)
  ✅ Scan code for accidentally committed keys
```

### ❌ DON'Ts

```yaml
Never:
  ❌ Commit keys to Git repositories
  ❌ Share keys via email/Slack/Discord
  ❌ Hardcode keys in source code
  ❌ Use same key across multiple apps
  ❌ Share keys with untrusted third parties
  ❌ Paste keys in public forums/pastebins
  ❌ Log keys in application logs
  ❌ Store keys in unencrypted databases

Avoid:
  ❌ Keys without expiration for production use
  ❌ Full permissions when not needed
  ❌ Reusing revoked keys
  ❌ Sharing keys between team members
```

### Security Checklist

```
Before deploying:
□ API key stored in .env file
□ .env added to .gitignore
□ Minimum permissions granted
□ Expiration date set (if applicable)
□ HTTPS enforced
□ Rate limiting configured
□ Monitoring alerts setup
□ Incident response plan ready
```

### Key Rotation Strategy

```typescript
// 1. Generate new key
const newKey = APIKeyManager.generateKey(walletAddress, {
  name: 'Production Bot v2',
  permissions: ['read', 'write'],
  expiresInDays: 90
});

// 2. Update your application to use new key
process.env.API_KEY = newKey.key;

// 3. Test thoroughly in staging
// 4. Deploy to production
// 5. Monitor for 24-48 hours
// 6. Revoke old key

APIKeyManager.revokeKey(oldKeyId);
```

---

## 🔌 Integration Guide

### Node.js / TypeScript

```typescript
// 1. Install dependencies
npm install axios dotenv

// 2. Create .env file
echo "MARKETPLACE_API_KEY=matp_live_your_key_here" > .env

// 3. Create API client
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const apiClient = axios.create({
  baseURL: 'https://api.marketplace-atp.com',
  headers: {
    'Authorization': `Bearer ${process.env.MARKETPLACE_API_KEY}`,
    'Content-Type': 'application/json',
  }
});

// 4. Make API calls
async function getAssets() {
  try {
    const response = await apiClient.get('/assets');
    console.log('Assets:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data);
  }
}

getAssets();
```

### Python

```python
# 1. Install dependencies
pip install requests python-dotenv

# 2. Create .env file
# MARKETPLACE_API_KEY=matp_live_your_key_here

# 3. Create API client
import os
import requests
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv('MARKETPLACE_API_KEY')
BASE_URL = 'https://api.marketplace-atp.com'

headers = {
    'Authorization': f'Bearer {API_KEY}',
    'Content-Type': 'application/json'
}

# 4. Make API calls
def get_assets():
    response = requests.get(f'{BASE_URL}/assets', headers=headers)
    if response.status_code == 200:
        print('Assets:', response.json())
    else:
        print('Error:', response.json())

get_assets()
```

### cURL

```bash
# Set API key as environment variable
export MARKETPLACE_API_KEY="matp_live_your_key_here"

# Get assets
curl -X GET "https://api.marketplace-atp.com/assets" \
  -H "Authorization: Bearer $MARKETPLACE_API_KEY" \
  -H "Content-Type: application/json"

# Create new asset (requires MINT permission)
curl -X POST "https://api.marketplace-atp.com/assets" \
  -H "Authorization: Bearer $MARKETPLACE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Real Estate Token #123",
    "price": 100000,
    "metadata": {
      "location": "New York",
      "type": "apartment"
    }
  }'

# Update asset (requires WRITE permission)
curl -X PUT "https://api.marketplace-atp.com/assets/123" \
  -H "Authorization: Bearer $MARKETPLACE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "price": 95000
  }'
```

### OpenAI GPT Actions

```yaml
# ChatGPT Custom GPT Configuration

openapi: 3.0.0
info:
  title: MarketplaceATP API
  version: 1.0.0
servers:
  - url: https://api.marketplace-atp.com
paths:
  /assets:
    get:
      summary: Get all assets
      operationId: getAssets
      security:
        - BearerAuth: []
      responses:
        '200':
          description: List of assets
          content:
            application/json:
              schema:
                type: array
                items:
                  type: object
components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: API Key
```

**Instructions for GPT:**
```
Use the MarketplaceATP API to help users manage their RWA marketplace.
Always use the provided API key in the Authorization header.
Permissions: read, write (no mint or delete).
```

---

## 📖 API Reference

### Authentication

All API requests must include the API key in the Authorization header:

```http
Authorization: Bearer matp_live_your_key_here
```

### Endpoints

#### Get All Assets

```http
GET /api/assets
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "asset_123",
      "name": "Real Estate Token #1",
      "price": 100000,
      "owner": "0x1234...5678",
      "metadata": { ... }
    }
  ]
}
```

**Required Permission:** `read`

---

#### Get Asset by ID

```http
GET /api/assets/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "asset_123",
    "name": "Real Estate Token #1",
    "price": 100000,
    "owner": "0x1234...5678",
    "metadata": { ... }
  }
}
```

**Required Permission:** `read`

---

#### Create Asset

```http
POST /api/assets
Content-Type: application/json

{
  "name": "New Asset",
  "price": 50000,
  "metadata": {
    "type": "real-estate",
    "location": "California"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "asset_456",
    "name": "New Asset",
    "price": 50000,
    "createdAt": "2026-02-09T10:30:00Z"
  }
}
```

**Required Permission:** `mint`

---

#### Update Asset

```http
PUT /api/assets/:id
Content-Type: application/json

{
  "price": 95000,
  "metadata": {
    "status": "updated"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "asset_123",
    "price": 95000,
    "updatedAt": "2026-02-09T11:00:00Z"
  }
}
```

**Required Permission:** `write`

---

#### Delete Asset

```http
DELETE /api/assets/:id
```

**Response:**
```json
{
  "success": true,
  "message": "Asset deleted successfully"
}
```

**Required Permission:** `delete`

---

### Error Responses

#### 401 Unauthorized

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or missing API key"
  }
}
```

#### 403 Forbidden

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions. Required: write"
  }
}
```

#### 404 Not Found

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Asset not found"
  }
}
```

#### 429 Rate Limited

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Retry after 60 seconds",
    "retryAfter": 60
  }
}
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. "Invalid API Key" Error

**Problem:** API returns 401 Unauthorized

**Solutions:**
```bash
# Check key format
echo $API_KEY
# Should start with "matp_live_"

# Verify key is active
# Go to Settings → API Keys → Check if key shows "Revoked"

# Check for spaces/newlines
API_KEY=$(echo $API_KEY | tr -d '\n\r ')
```

---

#### 2. "Insufficient Permissions" Error

**Problem:** API returns 403 Forbidden

**Solutions:**
```yaml
Check required permissions:
  - Read operations: need 'read'
  - Update operations: need 'write'
  - Create operations: need 'mint'
  - Delete operations: need 'delete'

Fix:
  1. Go to Settings → API Keys
  2. Revoke current key
  3. Generate new key with correct permissions
```

---

#### 3. Key Expired

**Problem:** Previously working key suddenly fails

**Solutions:**
```typescript
// Check expiration
const key = APIKeyManager.getKeyById(keyId);
console.log('Expires:', key.expiresAt);

// Generate new key
const newKey = APIKeyManager.generateKey(walletAddress, {
  name: 'Renewed Key',
  permissions: oldKey.permissions,
  expiresInDays: 90
});
```

---

#### 4. localStorage Not Persisting

**Problem:** Keys disappear after refresh

**Solutions:**
```javascript
// Check browser privacy settings
// Ensure cookies/localStorage not blocked

// Check if in incognito mode
// localStorage cleared on close in private browsing

// Manually verify
console.log(localStorage.getItem('marketplaceATP_apiKeys'));

// Re-initialize if needed
APIKeyManager.initializeDemoData(walletAddress);
```

---

#### 5. CORS Errors

**Problem:** Browser blocks API requests

**Solutions:**
```javascript
// For development only:
// Use a CORS proxy or configure backend

// Production: Ensure API has correct CORS headers
Access-Control-Allow-Origin: https://your-domain.com
Access-Control-Allow-Headers: Authorization, Content-Type
```

---

### Debug Mode

Enable detailed logging:

```typescript
// Add to your code
const DEBUG = true;

async function apiCall(endpoint: string) {
  if (DEBUG) {
    console.log('Endpoint:', endpoint);
    console.log('API Key:', process.env.API_KEY?.slice(0, 15) + '...');
  }
  
  try {
    const response = await fetch(endpoint, {
      headers: {
        'Authorization': `Bearer ${process.env.API_KEY}`
      }
    });
    
    if (DEBUG) {
      console.log('Status:', response.status);
      console.log('Headers:', response.headers);
    }
    
    const data = await response.json();
    
    if (DEBUG) {
      console.log('Response:', data);
    }
    
    return data;
  } catch (error) {
    if (DEBUG) {
      console.error('Error details:', error);
    }
    throw error;
  }
}
```

---

## 📞 Support

### Getting Help

```yaml
Documentation: /docs/API_KEYS_DOCUMENTATION.md
GitHub Issues: github.com/your-repo/issues
Discord: discord.gg/marketplace-atp
Email: support@marketplace-atp.com
```

### Reporting Security Issues

```yaml
⚠️ DO NOT open public GitHub issues for security vulnerabilities

Instead:
  Email: security@marketplace-atp.com
  PGP Key: Available on website
  Response Time: Within 24 hours
```

---

## 📝 Changelog

### v1.0.0 (2026-02-09)

```yaml
Initial Release:
  ✅ API key generation
  ✅ 4-tier permission system
  ✅ Expiration control
  ✅ Usage tracking
  ✅ Instant revocation
  ✅ localStorage persistence
  ✅ Demo data initialization
```

---

## 📄 License

```
Copyright © 2026 MarketplaceATP Protocol
Licensed under MIT License

This API Keys System is part of the Web3 Analytics Dashboard Studio Pro.
```

---

## 🎓 Additional Resources

### Video Tutorials

```yaml
Getting Started: youtube.com/watch?v=example1
Advanced Integration: youtube.com/watch?v=example2
Security Best Practices: youtube.com/watch?v=example3
```

### Code Examples

```yaml
GitHub Repository: github.com/marketplace-atp/examples
  - Node.js Bot: /examples/nodejs-bot
  - Python Script: /examples/python-automation
  - ChatGPT Integration: /examples/gpt-actions
  - React Dashboard: /examples/react-dashboard
```

### Community

```yaml
Discord: discord.gg/marketplace-atp
  - #api-keys channel
  - #support channel
  - #integrations showcase

Twitter: @MarketplaceATP
Newsletter: marketplace-atp.com/newsletter
```

---

**Last Updated:** February 9, 2026  
**Version:** 1.0.0  
**Author:** MarketplaceATP Team

---

**🎉 Happy Building with MarketplaceATP API Keys! 🚀**
