# 🏗️ ORINA DATA ARCHITECTURE - COMPLETE AUDIT & MIGRATION PLAN

**Date:** 2026-02-11  
**Status:** 🔴 CRITICAL - Data Fragmentation Detected  
**Priority:** P0 - Must fix before production

---

## 📊 CURRENT STATE ANALYSIS

### 🔴 **PROBLEM: Multiple Storage Key Patterns**

We currently have **3 different storage key patterns** causing data inconsistency:

1. ✅ **Address-based** (Preferred): `orina_xxx_${address.toLowerCase()}`
2. ⚠️ **UserID-based**: `studio_xxx_${userId}` or `orina_xxx_${userId}`
3. ❌ **Global keys**: `studio_xxx` (no user isolation)

---

## 🗂️ COMPLETE STORAGE KEY INVENTORY

### **1. PROFILE & USER IDENTITY** (UserID-based ⚠️)

| Key Pattern | Example | Used By | Status |
|------------|---------|---------|--------|
| `studio_user_profile_${userId}` | `studio_user_profile_user_abc123` | profileUtils.ts | ⚠️ UserID |
| `studio_address_to_userid` | Fixed key | profileUtils.ts | ⚠️ Global |
| `orina_user_data` | Fixed key | UserContext.tsx | ⚠️ Global |
| `orina_user_settings_${userId}` | `orina_user_settings_user_abc123` | settings.tsx | ⚠️ UserID |

**Issues:**
- ❌ Profile uses `userId` but Settings uses `address` → **MISMATCH**
- ❌ `orina_user_data` is global → **NO USER ISOLATION**
- ❌ Requires mapping lookup (`address` → `userId`) → **EXTRA COMPLEXITY**

---

### **2. AVATAR SYSTEM** (Address-based ✅)

| Key Pattern | Example | Used By | Status |
|------------|---------|---------|--------|
| `orina_avatar_seed_${address}` | `orina_avatar_seed_0x742d...` | avatarUtils.ts | ✅ Address |

**Status:** ✅ **PERFECT** - Uses address-based storage

---

### **3. API KEYS SYSTEM** (Address-based ✅)

| Key Pattern | Example | Used By | Status |
|------------|---------|---------|--------|
| `orina_api_keys_${address}` | `orina_api_keys_0x742d...` | apiKeyManager.ts | ✅ Address |
| `orina_api_pending_ops_${address}` | `orina_api_pending_ops_0x742d...` | apiKeyManager.ts | ✅ Address |
| `marketplace_api_keys` | Legacy storage | apiKeyManager.ts | ⚠️ Legacy |

**Status:** ✅ **PERFECT** - Recently refactored to address-based

---

### **4. MESSAGING SYSTEM** (Global ❌)

| Key Pattern | Example | Used By | Status |
|------------|---------|---------|--------|
| `orina_conversations` | Fixed key | conversationUtils.ts | ❌ Global |
| `orina_messages` | Fixed key | conversationUtils.ts | ❌ Global |

**Issues:**
- ❌ **NO USER ISOLATION** - All users share same conversations!
- ❌ Data filtered in-memory by `userId` → **PRIVACY RISK**
- 🔴 **CRITICAL SECURITY ISSUE**

---

### **5. ANALYTICS SYSTEM** (UserID-based ⚠️)

| Key Pattern | Example | Used By | Status |
|------------|---------|---------|--------|
| `studio_analytics` | Fixed key? | analyticsUtils.ts | ⚠️ Check |
| `studio_portfolio_history_${userId}` | `studio_portfolio_history_user_abc123` | analyticsUtils.ts | ⚠️ UserID |

**Issues:**
- ⚠️ Uses `userId` → Requires mapping lookup
- ⚠️ Need to verify if `studio_analytics` is per-user or global

---

### **6. ASSETS & FAVORITES** (UserID-based ⚠️)

| Key Pattern | Example | Used By | Status |
|------------|---------|---------|--------|
| `studio_favorites` | Global with userId filter | favoritesUtils.ts | ❌ Global |
| `studio_watchlist` | Global with userId filter | favoritesUtils.ts | ❌ Global |
| `studio_watchlist_alerts` | Global with userId filter | favoritesUtils.ts | ❌ Global |

**Issues:**
- ❌ Global storage with in-memory filtering → **PRIVACY RISK**
- ❌ Performance degradation with many users
- 🔴 **CRITICAL ISSUE**

---

### **7. COMMUNITY & ACTIVITIES** (Global ❌)

| Key Pattern | Example | Used By | Status |
|------------|---------|---------|--------|
| `studio_community_posts` | Global | communityUtils.ts | ✅ OK (Public) |
| `studio_community_comments` | Global | communityUtils.ts | ✅ OK (Public) |
| `studio_user_actions` | Global with userId filter | communityUtils.ts | ❌ Global |
| `studio_user_activities` | Global with userId filter | profileUtils.ts | ❌ Global |

**Note:** Posts/comments SHOULD be global (public feed), but user actions should be isolated

---

### **8. NOTIFICATIONS** (Global ❌)

| Key Pattern | Example | Used By | Status |
|------------|---------|---------|--------|
| `studio_notifications` | Global | notifications.ts | ❌ Global |
| `studio_notification_preferences` | Global | notifications.ts | ❌ Global |

**Issues:**
- ❌ No user isolation
- ❌ Privacy risk

---

### **9. COMMAND PALETTE & UI STATE** (Global ✅)

| Key Pattern | Example | Used By | Status |
|------------|---------|---------|--------|
| `studio_recent_commands` | Global | commandUtils.ts | ✅ OK (Can be global) |
| `ipfs-setup-banner-dismissed` | Global | ipfs-setup-banner.tsx | ✅ OK (UI state) |

**Status:** ✅ OK - These can be global (user preferences, not data)

---

### **10. REVIEWS & RATINGS** (Global ❌)

| Key Pattern | Example | Used By | Status |
|------------|---------|---------|--------|
| `orina_order_reviews` | Global | confirm-delivery-modal.tsx | ❌ Global |

**Issues:**
- ❌ No user isolation

---

## 🎯 PROPOSED UNIFIED ARCHITECTURE

### **DESIGN PRINCIPLES:**

1. ✅ **Address-First:** Use `address.toLowerCase()` as primary key
2. ✅ **No Global Storage:** All user data must be isolated
3. ✅ **No UserID Dependency:** Eliminate mapping lookups
4. ✅ **Consistent Prefix:** Use `orina_` for all new keys
5. ✅ **Type Safety:** Define storage schema in TypeScript

---

### **NEW STORAGE SCHEMA:**

```typescript
// ✅ RECOMMENDED PATTERN
const STORAGE_SCHEMA = {
  // Profile & Identity
  profile: `orina_profile_${address}`,              // User profile data
  settings: `orina_settings_${address}`,            // User settings
  avatar: `orina_avatar_seed_${address}`,           // Avatar seed (existing ✅)
  
  // Security & Auth
  apiKeys: `orina_api_keys_${address}`,             // API keys (existing ✅)
  apiPendingOps: `orina_api_pending_ops_${address}`, // Pending ops (existing ✅)
  
  // Messaging (CRITICAL FIX)
  conversations: `orina_conversations_${address}`,   // User conversations
  messages: `orina_messages_${address}`,            // User messages
  
  // Assets & Favorites (CRITICAL FIX)
  favorites: `orina_favorites_${address}`,          // User favorites
  watchlist: `orina_watchlist_${address}`,          // User watchlist
  watchlistAlerts: `orina_watchlist_alerts_${address}`, // Price alerts
  
  // Analytics & Portfolio
  portfolioHistory: `orina_portfolio_history_${address}`, // Portfolio snapshots
  transactions: `orina_transactions_${address}`,    // Transaction history
  
  // Notifications (CRITICAL FIX)
  notifications: `orina_notifications_${address}`,  // User notifications
  notificationPrefs: `orina_notification_prefs_${address}`, // Notification settings
  
  // Activities & Reviews
  activities: `orina_activities_${address}`,        // User activities
  reviews: `orina_reviews_${address}`,              // Reviews written by user
  
  // User Actions (likes, follows, etc.)
  userActions: `orina_user_actions_${address}`,     // Community interactions
  
  // ✅ GLOBAL KEYS (Public data - OK to be global)
  communityPosts: 'orina_community_posts',          // Public posts (global)
  communityComments: 'orina_community_comments',    // Public comments (global)
  recentCommands: 'orina_recent_commands',          // UI state (global OK)
  ipfsBannerDismissed: 'orina_ipfs_banner_dismissed', // UI state (global OK)
};
```

---

## 🚀 MIGRATION PLAN

### **PHASE 1: CRITICAL SECURITY FIXES** (P0 - NOW!)

**Priority:** 🔴 **IMMEDIATE** - Security & Privacy Issues

#### **1.1 Fix Messaging System**
- ❌ Current: `orina_conversations` (global)
- ✅ New: `orina_conversations_${address}`
- **Impact:** HIGH - Privacy risk if users share device

#### **1.2 Fix Favorites & Watchlist**
- ❌ Current: `studio_favorites` (global with filter)
- ✅ New: `orina_favorites_${address}`
- **Impact:** HIGH - Privacy & performance

#### **1.3 Fix Notifications**
- ❌ Current: `studio_notifications` (global)
- ✅ New: `orina_notifications_${address}`
- **Impact:** MEDIUM - Privacy risk

---

### **PHASE 2: UNIFY PROFILE SYSTEM** (P1 - Week 1)

**Goal:** Single source of truth for user profile

#### **2.1 Create Unified Profile Manager**
```typescript
// /src/utils/unifiedProfileManager.ts
export interface UnifiedUserProfile {
  // Identity
  address: string;
  displayName: string;
  bio: string;
  avatar: string;
  avatarSeed?: number;
  
  // Settings (from settings.tsx)
  settings: {
    deliveryAddress: DeliveryAddress;
    notifications: NotificationPreferences;
    privacy: PrivacySettings;
    display: DisplayPreferences;
    language: LanguageSettings;
  };
  
  // Stats
  stats: {
    totalSales: number;
    rating: number;
    reviewCount: number;
    joinedAt: number;
  };
  
  // Metadata
  createdAt: number;
  updatedAt: number;
}

class UnifiedProfileManager {
  private static getStorageKey(address: string): string {
    return `orina_profile_${address.toLowerCase()}`;
  }
  
  static loadProfile(address: string): UnifiedUserProfile | null {
    // Load from new unified storage
  }
  
  static saveProfile(address: string, profile: UnifiedUserProfile): void {
    // Save to new unified storage
  }
  
  static migrateFromLegacy(address: string): void {
    // Migrate from old storage keys
    // - studio_user_profile_${userId}
    // - orina_user_data
    // - orina_user_settings_${userId}
  }
}
```

#### **2.2 Migration Strategy**
1. Create `UnifiedProfileManager`
2. Add migration function to detect old keys
3. Auto-migrate on first load
4. Keep backward compatibility for 1 version
5. Remove old keys after confirmation

---

### **PHASE 3: MIGRATE REMAINING SYSTEMS** (P2 - Week 2)

#### **3.1 Analytics System**
- Refactor `analyticsUtils.ts` to use address-based keys
- Migrate `studio_portfolio_history_${userId}` → `orina_portfolio_history_${address}`

#### **3.2 Activities & Reviews**
- Migrate `studio_user_activities` → `orina_activities_${address}`
- Migrate `orina_order_reviews` → `orina_reviews_${address}`

---

### **PHASE 4: CLEANUP & VALIDATION** (P3 - Week 3)

#### **4.1 Storage Cleanup Utility**
```typescript
// Add to resetProfile.ts
export function cleanupLegacyStorage(address: string): void {
  const userId = getUserIdFromAddress(address);
  
  // Remove all legacy keys
  const legacyKeys = [
    `studio_user_profile_${userId}`,
    `orina_user_settings_${userId}`,
    `studio_portfolio_history_${userId}`,
    // ... all old patterns
  ];
  
  legacyKeys.forEach(key => {
    localStorage.removeItem(key);
  });
  
  // Also remove from global keys
  removeUserDataFromGlobalKeys(address);
}
```

#### **4.2 Data Validation**
- Add debug tool to verify all data is address-based
- Add unit tests for storage operations
- Add integration tests for profile reset

---

## 📋 IMPLEMENTATION CHECKLIST

### **Week 1: Critical Fixes**
- [ ] 🔴 **Day 1-2:** Fix messaging system isolation
- [ ] 🔴 **Day 2-3:** Fix favorites/watchlist isolation
- [ ] 🔴 **Day 3-4:** Fix notifications isolation
- [ ] ⚠️ **Day 4-5:** Test all fixes with multiple users
- [ ] ✅ **Day 5:** Deploy to staging

### **Week 2: Profile Unification**
- [ ] 📝 **Day 1-2:** Design UnifiedProfileManager
- [ ] 💻 **Day 3-4:** Implement migration logic
- [ ] 🧪 **Day 4-5:** Test migration with real data
- [ ] ✅ **Day 5:** Deploy to staging

### **Week 3: Full Migration**
- [ ] 📊 **Day 1-2:** Migrate analytics system
- [ ] 📝 **Day 3:** Migrate activities & reviews
- [ ] 🧹 **Day 4:** Add cleanup utilities
- [ ] 🧪 **Day 5:** Full integration testing
- [ ] ✅ **Weekend:** Deploy to production

---

## 🎯 SUCCESS CRITERIA

### **After Migration:**
1. ✅ All user data uses `orina_${feature}_${address}` pattern
2. ✅ No global keys contain user-specific data
3. ✅ Profile reset clears ALL user data (verify with debug tool)
4. ✅ Multiple users on same device have isolated data
5. ✅ No userId → address mapping required
6. ✅ Storage keys are consistent and predictable

---

## 🔍 TESTING PLAN

### **Test Scenarios:**

#### **Scenario 1: Single User**
1. Connect wallet A
2. Create profile, favorites, messages
3. Reset profile
4. Verify ALL data cleared
5. ✅ Success if localStorage inspector shows 0 user keys

#### **Scenario 2: Multiple Users**
1. Connect wallet A → Create data
2. Disconnect → Connect wallet B → Create data
3. Switch back to wallet A
4. ✅ Success if each wallet sees only their own data

#### **Scenario 3: Migration**
1. Create data with OLD system
2. Trigger migration
3. ✅ Success if data appears in NEW keys
4. ✅ Success if OLD keys are removed

---

## 📚 RELATED FILES TO UPDATE

```
Priority 1 (Critical):
- /src/utils/conversationUtils.ts       (Messaging)
- /src/utils/favoritesUtils.ts          (Favorites)
- /src/utils/notifications.ts           (Notifications)

Priority 2 (Important):
- /src/utils/profileUtils.ts            (Profile)
- /src/contexts/UserContext.tsx         (User Data)
- /src/app/components/settings.tsx      (Settings)
- /src/utils/analyticsUtils.ts          (Analytics)

Priority 3 (Nice to have):
- /src/utils/communityUtils.ts          (User Actions only)
- /src/app/components/confirm-delivery-modal.tsx (Reviews)
```

---

## 🚨 RISKS & MITIGATION

| Risk | Impact | Mitigation |
|------|--------|------------|
| Data loss during migration | 🔴 HIGH | Backup before migration, gradual rollout |
| Breaking changes for existing users | 🟡 MEDIUM | Auto-migration on load, keep backward compat |
| Performance with large datasets | 🟡 MEDIUM | Add indexing, lazy loading |
| Storage quota exceeded | 🟢 LOW | Add size limits, cleanup old data |

---

## 💡 RECOMMENDATIONS

1. **Start with Phase 1 immediately** - Security issues must be fixed ASAP
2. **Add comprehensive logging** - Track all storage operations during migration
3. **Create storage debug tool** - Make it easy to inspect current state
4. **Version your data schema** - Add `version` field to enable future migrations
5. **Document storage conventions** - Update developer docs with new patterns

---

**Next Steps:**
1. Review this document with team
2. Get approval for migration plan
3. Create GitHub issues for each phase
4. Start implementation of Phase 1 (Critical Fixes)

---

*Generated by Orina AI Assistant - 2026-02-11*
