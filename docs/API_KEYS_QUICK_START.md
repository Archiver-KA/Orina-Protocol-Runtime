# ⚡ API Keys Quick Start Guide

**5-Minute Setup for MarketplaceATP Protocol**

---

## 🎯 What You'll Learn

- Generate your first API key (2 mins)
- Make your first API call (2 mins)
- Understand permissions (1 min)

---

## Step 1: Generate API Key (2 mins)

### Via Dashboard UI

```
1. Open Dashboard → Settings ⚙️
2. Scroll to "API Keys for AI Agents"
3. Click "Generate New Key" button
4. Fill form:
   ├─ Name: "My First Bot"
   ├─ Permissions: ☑ Read, ☑ Write
   └─ Expiration: 30 days
5. Click "Generate Key"
6. ⚠️ COPY KEY NOW - You won't see it again!
```

**Your key looks like:**
```
matp_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

---

## Step 2: Save Key Securely (30 seconds)

### Create `.env` file

```bash
# In your project root
echo "MARKETPLACE_API_KEY=matp_live_your_actual_key_here" > .env
echo ".env" >> .gitignore
```

### ✅ Correct Storage
```
✅ .env file (gitignored)
✅ Password manager
✅ Environment variables
```

### ❌ Wrong Storage
```
❌ Git commits
❌ Source code
❌ Slack messages
```

---

## Step 3: Make First API Call (1 min)

### Node.js / TypeScript

```typescript
// 1. Install axios
npm install axios dotenv

// 2. Create test.ts
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const api = axios.create({
  baseURL: 'https://api.marketplace-atp.com',
  headers: {
    'Authorization': `Bearer ${process.env.MARKETPLACE_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

// 3. Get all assets
async function test() {
  try {
    const { data } = await api.get('/assets');
    console.log('✅ Success!', data);
  } catch (error) {
    console.error('❌ Error:', error.response?.data);
  }
}

test();
```

```bash
# 4. Run
npx tsx test.ts
```

---

### Python

```python
# 1. Install requests
pip install requests python-dotenv

# 2. Create test.py
import os
import requests
from dotenv import load_dotenv

load_dotenv()

headers = {
    'Authorization': f'Bearer {os.getenv("MARKETPLACE_API_KEY")}',
    'Content-Type': 'application/json'
}

# 3. Get all assets
response = requests.get(
    'https://api.marketplace-atp.com/assets',
    headers=headers
)

if response.status_code == 200:
    print('✅ Success!', response.json())
else:
    print('❌ Error:', response.json())
```

```bash
# 4. Run
python test.py
```

---

### cURL

```bash
# Set environment variable
export MARKETPLACE_API_KEY="matp_live_your_key_here"

# Make request
curl -X GET "https://api.marketplace-atp.com/assets" \
  -H "Authorization: Bearer $MARKETPLACE_API_KEY" \
  -H "Content-Type: application/json"
```

---

## Step 4: Understand Permissions (1 min)

### Permission Levels

```
┌──────┬────────────────────────────────────┐
│ READ │ View assets, orders, analytics     │ ← Start here
├──────┼────────────────────────────────────┤
│WRITE │ Update prices, edit metadata       │ ← Most common
├──────┼────────────────────────────────────┤
│ MINT │ Create new assets, listings        │ ← Advanced
├──────┼────────────────────────────────────┤
│DELETE│ Remove assets permanently          │ ← Dangerous
└──────┴────────────────────────────────────┘
```

### Recommended Combos

```yaml
# Beginner: Analytics Bot
permissions: ['read']

# Intermediate: Price Updater
permissions: ['read', 'write']

# Advanced: Full Manager
permissions: ['read', 'write', 'mint']

# Expert: Complete Control
permissions: ['read', 'write', 'mint', 'delete']
```

---

## 🎯 Common Use Cases

### 1. Price Update Bot

```typescript
// Update asset price every hour
setInterval(async () => {
  await api.put('/assets/123', {
    price: calculateNewPrice()
  });
}, 3600000);
```

**Required:** `read`, `write`

---

### 2. Analytics Dashboard

```typescript
// Fetch marketplace stats
const stats = await api.get('/analytics');
console.log('Total Volume:', stats.data.volume);
```

**Required:** `read`

---

### 3. Auto-Listing Bot

```typescript
// Create new listing automatically
await api.post('/assets', {
  name: 'New Property #456',
  price: 100000,
  metadata: { ... }
});
```

**Required:** `read`, `mint`

---

## 🛡️ Security Tips

### ✅ DO

```yaml
✅ Store key in .env file
✅ Add .env to .gitignore
✅ Use HTTPS only
✅ Set expiration dates
✅ Rotate keys every 90 days
✅ Use minimum permissions needed
```

### ❌ DON'T

```yaml
❌ Commit keys to Git
❌ Share keys via email/Slack
❌ Hardcode in source code
❌ Use same key everywhere
❌ Grant all permissions
```

---

## 🔧 Troubleshooting

### Error: "Invalid API Key"

```bash
# Check key format
echo $MARKETPLACE_API_KEY
# Should start with "matp_live_"

# Remove spaces/newlines
export MARKETPLACE_API_KEY=$(echo $MARKETPLACE_API_KEY | tr -d '\n\r ')
```

---

### Error: "Insufficient Permissions"

```yaml
Problem: Trying to write but only have read permission

Solution:
  1. Go to Settings → API Keys
  2. Generate new key with correct permissions
  3. Update .env file
```

---

### Error: "Key Expired"

```yaml
Problem: Key reached expiration date

Solution:
  1. Generate new key
  2. Update .env file
  3. Restart application
```

---

## 📚 Next Steps

```yaml
✅ You've completed the Quick Start!

Next:
  1. Read full documentation: /docs/API_KEYS_DOCUMENTATION.md
  2. Explore API Reference: /docs/API_REFERENCE.md
  3. Check examples: github.com/marketplace-atp/examples
  4. Join Discord: discord.gg/marketplace-atp
```

---

## 🚀 Advanced Topics

- [Full Documentation](/docs/API_KEYS_DOCUMENTATION.md)
- [Security Best Practices](/docs/SECURITY.md)
- [Rate Limiting](/docs/RATE_LIMITS.md)
- [Webhooks](/docs/WEBHOOKS.md)
- [GraphQL API](/docs/GRAPHQL.md)

---

## 💡 Need Help?

```yaml
Documentation: /docs/
Discord: discord.gg/marketplace-atp
Email: support@marketplace-atp.com
GitHub: github.com/marketplace-atp/issues
```

---

**⏱️ Total Time: 5 minutes**  
**✅ You're ready to build!**

🎉 **Happy Coding!** 🚀
