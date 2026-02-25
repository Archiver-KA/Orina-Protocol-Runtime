# 🛡️ API Keys Security Best Practices

**MarketplaceATP Protocol - Security Guide**

---

## 🎯 Security Overview

API keys là **credentials mạnh** cho phép truy cập marketplace của bạn. Một key bị lộ có thể dẫn đến:

```yaml
Risks:
  ⚠️ Unauthorized asset modifications
  ⚠️ Fraudulent transactions
  ⚠️ Data breaches
  ⚠️ Financial losses
  ⚠️ Reputation damage
```

Document này cung cấp **comprehensive security guidelines** để bảo vệ API keys.

---

## ✅ Essential Security Rules

### Rule #1: Never Expose Keys Publicly

```yaml
❌ NEVER:
  - Commit keys to Git repositories
  - Share in Slack/Discord/Email
  - Post in public forums (StackOverflow, Reddit)
  - Include in screenshots
  - Log in application logs
  - Hardcode in source code
  - Store in unencrypted databases
  - Send via HTTP (always HTTPS)

✅ ALWAYS:
  - Store in environment variables
  - Use password managers
  - Encrypt at rest
  - Use secure vaults (HashiCorp Vault, AWS Secrets)
  - Transmit over HTTPS only
```

---

### Rule #2: Use Minimum Required Permissions

```yaml
Principle of Least Privilege:

❌ Bad:
  permissions: ['read', 'write', 'mint', 'delete']
  # Gives full access when only read needed

✅ Good:
  permissions: ['read']
  # Only grants what's actually needed

Example Scenarios:
  
  Analytics Bot:
    permissions: ['read']  # ✅
    
  Price Updater:
    permissions: ['read', 'write']  # ✅
    
  Full Manager:
    permissions: ['read', 'write', 'mint']  # ✅
    # DELETE excluded unless absolutely necessary
```

---

### Rule #3: Rotate Keys Regularly

```yaml
Rotation Schedule:

Development:
  Frequency: Every 30 days
  Risk: Medium
  
Production:
  Frequency: Every 90 days
  Risk: High
  
After Security Incident:
  Frequency: Immediately
  Risk: Critical

Automation:
  Use scripts to remind/enforce rotation
  Set calendar reminders
  Monitor key age
```

**Rotation Script Example:**

```typescript
// key-rotation-reminder.ts
import { APIKeyManager } from '@/utils/apiKeyManager';

function checkKeyAge() {
  const keys = APIKeyManager.getKeysForWallet(walletAddress);
  const now = Date.now();
  const NINETY_DAYS = 90 * 24 * 60 * 60 * 1000;
  
  keys.forEach(key => {
    const age = now - new Date(key.createdAt).getTime();
    
    if (age > NINETY_DAYS) {
      console.warn(`🚨 Key "${key.name}" is ${Math.floor(age / (24*60*60*1000))} days old`);
      console.warn(`   Consider rotating this key!`);
    }
  });
}

// Run daily
setInterval(checkKeyAge, 24 * 60 * 60 * 1000);
```

---

### Rule #4: Set Expiration Dates

```yaml
Temporary Access:
  Use Case: Contractor work, demos, testing
  Expiration: 7-30 days
  
Regular Bots:
  Use Case: Production automation
  Expiration: 90 days
  
Long-term Services:
  Use Case: Critical infrastructure
  Expiration: 365 days (with rotation)
  
⚠️ Avoid:
  Expiration: Never
  Reason: Security risk if key compromised
```

---

### Rule #5: Monitor Usage Actively

```yaml
Monitor:
  ✓ Total requests per key
  ✓ Success/failure rates
  ✓ Last used timestamps
  ✓ Unusual patterns
  ✓ Failed authentication attempts

Alert On:
  🚨 Sudden spike in requests
  🚨 Requests from unexpected IPs
  🚨 High failure rates
  🚨 Key used after long dormancy
  🚨 Permission escalation attempts
```

---

## 🔐 Storage Best Practices

### ✅ Recommended Storage Methods

#### 1. Environment Variables (.env)

```bash
# .env file (in .gitignore)
MARKETPLACE_API_KEY=matp_live_your_key_here
MARKETPLACE_API_URL=https://api.marketplace-atp.com

# Load in application
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.MARKETPLACE_API_KEY;
```

**Security Level:** ⭐⭐⭐⭐ (Good for development/staging)

---

#### 2. Password Managers

```yaml
Recommended:
  - 1Password (Business plan)
  - Bitwarden
  - LastPass (Enterprise)
  - Dashlane

Features:
  ✓ AES-256 encryption
  ✓ Team sharing
  ✓ Access logs
  ✓ 2FA required
  ✓ Emergency access
```

**Security Level:** ⭐⭐⭐⭐⭐ (Excellent for small teams)

---

#### 3. Secret Management Systems

```yaml
Enterprise Solutions:

HashiCorp Vault:
  Security: ⭐⭐⭐⭐⭐
  Cost: Open source / Enterprise
  Use: Large teams, high security needs
  
AWS Secrets Manager:
  Security: ⭐⭐⭐⭐⭐
  Cost: Pay per secret
  Use: AWS-hosted applications
  
Azure Key Vault:
  Security: ⭐⭐⭐⭐⭐
  Cost: Pay per operation
  Use: Azure-hosted applications
  
Google Secret Manager:
  Security: ⭐⭐⭐⭐⭐
  Cost: Pay per secret
  Use: GCP-hosted applications
```

**Example (AWS Secrets Manager):**

```typescript
import { SecretsManager } from 'aws-sdk';

const client = new SecretsManager({ region: 'us-east-1' });

async function getAPIKey() {
  const secret = await client.getSecretValue({
    SecretId: 'marketplace-atp/api-key'
  }).promise();
  
  return JSON.parse(secret.SecretString).apiKey;
}
```

**Security Level:** ⭐⭐⭐⭐⭐ (Best for production)

---

### ❌ Insecure Storage Methods

#### 1. Hardcoded in Source Code

```typescript
❌ NEVER DO THIS:
const API_KEY = "matp_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6";

Why Bad:
  - Visible in version control
  - Shared with all developers
  - Leaked in Git history
  - Exposed in code reviews
```

---

#### 2. Config Files in Git

```json
❌ config.json (committed to Git)
{
  "apiKey": "matp_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
}

Why Bad:
  - Permanently in Git history
  - Hard to rotate (need to update all repos)
  - Visible to anyone with repo access
```

---

#### 3. Client-Side JavaScript

```javascript
❌ Frontend Code:
const apiKey = "matp_live_..."; // Exposed in browser

Why Bad:
  - Visible in browser DevTools
  - Extractable from bundled JS
  - Anyone can copy and use
```

---

#### 4. Unencrypted Databases

```sql
❌ Database Table:
CREATE TABLE api_keys (
  user_id INT,
  api_key VARCHAR(255)  -- Plain text!
);

Why Bad:
  - Exposed in database dumps
  - Visible to DBAs
  - Stolen in SQL injection attacks
```

---

## 🔒 Encryption Best Practices

### At Rest Encryption

```typescript
// Encrypt before storing
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32 bytes

function encrypt(text: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedData: string): string {
  const parts = encryptedData.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  
  const decipher = createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// Usage
const apiKey = "matp_live_...";
const encrypted = encrypt(apiKey);
// Store encrypted in database

// Later retrieve
const decrypted = decrypt(encrypted);
// Use decrypted for API calls
```

---

### In Transit Encryption

```yaml
HTTPS Only:

✅ Correct:
  URL: https://api.marketplace-atp.com
  TLS: 1.2+
  Certificate: Valid & Trusted

❌ Wrong:
  URL: http://api.marketplace-atp.com
  Risk: Man-in-the-middle attacks
  Impact: API key intercepted

Enforcement:
  - Use HSTS headers
  - Reject HTTP connections
  - Pin TLS certificates (advanced)
```

---

## 🚨 Incident Response

### Key Compromised - Action Plan

#### Step 1: Immediate Actions (0-15 minutes)

```yaml
1. Revoke Compromised Key:
   Dashboard → Settings → API Keys → Revoke

2. Generate New Key:
   Create replacement with same permissions

3. Notify Team:
   Alert all stakeholders immediately

4. Check Logs:
   Review recent API activity for suspicious patterns
```

---

#### Step 2: Assessment (15-60 minutes)

```yaml
Investigate:
  □ When was key compromised?
  □ How was it exposed?
  □ What actions were taken?
  □ What data was accessed?
  □ Were any assets modified?
  □ Are there other compromised keys?

Document:
  □ Timeline of events
  □ Affected systems
  □ Potential impact
  □ Evidence collected
```

---

#### Step 3: Containment (1-4 hours)

```yaml
Actions:
  □ Rotate ALL keys for affected wallet
  □ Review permissions on all remaining keys
  □ Audit recent transactions
  □ Check for unauthorized changes
  □ Monitor for suspicious activity
  □ Update access controls
```

---

#### Step 4: Recovery (4-24 hours)

```yaml
Deploy Fixes:
  □ Update all applications with new keys
  □ Test all integrations
  □ Verify functionality
  □ Monitor error rates

Communication:
  □ Notify affected users (if applicable)
  □ Update security team
  □ Document lessons learned
  □ Update security procedures
```

---

#### Step 5: Post-Incident (1-7 days)

```yaml
Review:
  □ Conduct post-mortem
  □ Identify root cause
  □ Update security policies
  □ Implement preventive measures
  □ Train team on new procedures

Monitoring:
  □ Enhanced monitoring for 30 days
  □ Weekly security reviews
  □ Audit all key usage
  □ Review access patterns
```

---

## 📋 Security Checklist

### Pre-Production Checklist

```yaml
Before deploying to production:

Keys:
  □ API key stored in .env file
  □ .env added to .gitignore
  □ .env.example created (without real keys)
  □ Keys encrypted at rest (if stored in DB)
  □ Expiration date set appropriately
  □ Minimum permissions granted

Code:
  □ No hardcoded keys in source code
  □ No keys in config files
  □ Keys not logged to console
  □ Keys not sent to error tracking
  □ HTTPS enforced for all API calls

Access Control:
  □ Key ownership documented
  □ Team access list maintained
  □ Emergency contacts identified
  □ Rotation schedule established

Monitoring:
  □ Usage alerts configured
  □ Error rate monitoring enabled
  □ Log aggregation set up
  □ Incident response plan documented

Testing:
  □ Key revocation tested
  □ Rotation procedure tested
  □ Error handling verified
  □ Monitoring alerts tested
```

---

### Monthly Security Audit

```yaml
Review every month:

Keys:
  □ Audit all active keys
  □ Review permissions
  □ Check key ages
  □ Verify expiration dates
  □ Remove unused keys
  □ Update documentation

Usage:
  □ Review usage statistics
  □ Check for anomalies
  □ Verify authorized users
  □ Audit failed requests
  □ Review error logs

Team:
  □ Update access list
  □ Remove departed employees
  □ Review shared keys
  □ Verify 2FA enabled
  □ Audit admin accounts

Documentation:
  □ Update runbooks
  □ Review procedures
  □ Test incident response
  □ Update contact list
```

---

## 🎓 Security Training

### For Developers

```yaml
Topics:
  1. Secure key storage
  2. .gitignore best practices
  3. Environment variables
  4. Error handling without leaking keys
  5. HTTPS enforcement
  6. Incident reporting procedures

Frequency: Quarterly
Duration: 1 hour
Format: Interactive workshop
```

---

### For AI Agent Builders

```yaml
Topics:
  1. Permission selection
  2. Key rotation
  3. Usage monitoring
  4. Error handling
  5. Rate limiting
  6. Suspicious activity detection

Frequency: Quarterly
Duration: 45 minutes
Format: Video tutorial + quiz
```

---

## 📞 Security Contacts

```yaml
Report Security Issues:
  Email: security@marketplace-atp.com
  PGP Key: Available at marketplace-atp.com/security
  Response: Within 24 hours
  
Bug Bounty:
  Program: marketplace-atp.com/bug-bounty
  Rewards: $100 - $10,000
  Scope: API keys, authentication, data leaks
  
Emergency Contact:
  Phone: +1-XXX-XXX-XXXX (24/7)
  Use For: Active attacks, data breaches
  Response: Immediate
```

---

## 📚 Additional Resources

### Industry Standards

```yaml
OWASP Top 10:
  - API Security Project
  - Broken Authentication
  - Security Misconfiguration

NIST Guidelines:
  - SP 800-63B (Digital Identity)
  - SP 800-57 (Key Management)

PCI DSS:
  - Requirement 8 (Access Control)
  - Requirement 10 (Logging)
```

### Tools

```yaml
Secret Scanning:
  - GitGuardian
  - TruffleHog
  - GitHub Secret Scanning
  
Key Management:
  - HashiCorp Vault
  - AWS Secrets Manager
  - Azure Key Vault
  
Monitoring:
  - Datadog
  - New Relic
  - Sentry
```

---

**Last Updated:** February 9, 2026  
**Version:** 1.0.0  
**Security Team:** security@marketplace-atp.com

---

**🛡️ Stay Secure! 🔐**
