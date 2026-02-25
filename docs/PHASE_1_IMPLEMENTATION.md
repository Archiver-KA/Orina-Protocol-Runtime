# 🚨 PHASE 1: CRITICAL SECURITY FIXES - Implementation Guide

**Timeline:** 2-3 days  
**Priority:** P0 - CRITICAL  
**Goal:** Fix data isolation issues for messaging, favorites, and notifications

---

## 📋 OVERVIEW

Currently, these systems use **global storage** with in-memory filtering:
- 🔴 **Messaging:** All users' conversations in one key
- 🔴 **Favorites/Watchlist:** All users' favorites in one key  
- 🔴 **Notifications:** All users' notifications in one key

**Problem:** If two users use same browser (or malicious user inspects localStorage), they can see each other's data!

---

## 🎯 FIX #1: MESSAGING SYSTEM

### **Current Implementation:**
```typescript
// ❌ INSECURE - conversationUtils.ts
const CONVERSATIONS_KEY = 'orina_conversations'; // Global!
const MESSAGES_KEY = 'orina_messages';           // Global!

export function loadConversations(): Conversation[] {
  const stored = localStorage.getItem(CONVERSATIONS_KEY);
  return stored ? JSON.parse(stored) : [];
}

// Filtering happens in memory - PRIVACY RISK!
```

### **New Implementation:**
```typescript
// ✅ SECURE - Per-user isolation
const getConversationsKey = (address: string) => 
  `orina_conversations_${address.toLowerCase()}`;

const getMessagesKey = (address: string) => 
  `orina_messages_${address.toLowerCase()}`;

export function loadConversations(address: string): Conversation[] {
  const key = getConversationsKey(address);
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : [];
}

export function saveConversations(address: string, conversations: Conversation[]): void {
  const key = getConversationsKey(address);
  localStorage.setItem(key, JSON.stringify(conversations));
}

// Migration helper
export function migrateConversationsToAddressBased(address: string, userId: string): void {
  // Load from old global storage
  const oldKey = 'orina_conversations';
  const stored = localStorage.getItem(oldKey);
  
  if (stored) {
    const allConversations = JSON.parse(stored);
    // Filter this user's conversations
    const userConversations = allConversations.filter(
      (c: Conversation) => c.userId === userId
    );
    
    if (userConversations.length > 0) {
      // Save to new address-based storage
      saveConversations(address, userConversations);
      console.log(`[Migration] Migrated ${userConversations.length} conversations for ${address}`);
    }
  }
}
```

### **Files to Update:**
1. `/src/utils/conversationUtils.ts` - Main changes
2. All components using conversations - Add `address` parameter
3. `/src/utils/resetProfile.ts` - Add cleanup for new keys

---

## 🎯 FIX #2: FAVORITES & WATCHLIST

### **Current Implementation:**
```typescript
// ❌ INSECURE - favoritesUtils.ts
const FAVORITES_KEY = 'studio_favorites'; // Global!
const WATCHLIST_KEY = 'studio_watchlist'; // Global!

export function loadFavorites(userId: string): FavoriteAsset[] {
  const stored = localStorage.getItem(FAVORITES_KEY);
  const allFavorites = JSON.parse(stored);
  // Filtering in memory - PRIVACY RISK!
  return allFavorites.filter((fav: FavoriteAsset) => fav.userId === userId);
}
```

### **New Implementation:**
```typescript
// ✅ SECURE - Per-user isolation
const getFavoritesKey = (address: string) => 
  `orina_favorites_${address.toLowerCase()}`;

const getWatchlistKey = (address: string) => 
  `orina_watchlist_${address.toLowerCase()}`;

const getWatchlistAlertsKey = (address: string) => 
  `orina_watchlist_alerts_${address.toLowerCase()}`;

export function loadFavorites(address: string): FavoriteAsset[] {
  const key = getFavoritesKey(address);
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : [];
}

export function saveFavorites(address: string, favorites: FavoriteAsset[]): void {
  const key = getFavoritesKey(address);
  localStorage.setItem(key, JSON.stringify(favorites));
}

export function addFavorite(address: string, assetId: string): void {
  const favorites = loadFavorites(address);
  
  // Check if already favorited
  if (!favorites.find(f => f.assetId === assetId)) {
    favorites.push({
      assetId,
      addedAt: Date.now(),
    });
    saveFavorites(address, favorites);
  }
}

export function removeFavorite(address: string, assetId: string): void {
  const favorites = loadFavorites(address);
  const filtered = favorites.filter(f => f.assetId !== assetId);
  saveFavorites(address, filtered);
}

// Migration helper
export function migrateFavoritesToAddressBased(address: string, userId: string): void {
  const oldKey = 'studio_favorites';
  const stored = localStorage.getItem(oldKey);
  
  if (stored) {
    const allFavorites = JSON.parse(stored);
    const userFavorites = allFavorites.filter(
      (f: FavoriteAsset) => f.userId === userId
    );
    
    if (userFavorites.length > 0) {
      saveFavorites(address, userFavorites);
      console.log(`[Migration] Migrated ${userFavorites.length} favorites for ${address}`);
    }
  }
}
```

### **Files to Update:**
1. `/src/utils/favoritesUtils.ts` - Main changes
2. All components using favorites - Replace `userId` with `address`
3. `/src/utils/resetProfile.ts` - Add cleanup for new keys

---

## 🎯 FIX #3: NOTIFICATIONS

### **Current Implementation:**
```typescript
// ❌ INSECURE - notifications.ts
const STORAGE_KEY = 'studio_notifications'; // Global!
const PREFERENCES_KEY = 'studio_notification_preferences'; // Global!
```

### **New Implementation:**
```typescript
// ✅ SECURE - Per-user isolation
const getNotificationsKey = (address: string) => 
  `orina_notifications_${address.toLowerCase()}`;

const getPreferencesKey = (address: string) => 
  `orina_notification_prefs_${address.toLowerCase()}`;

export function loadNotifications(address: string): AppNotification[] {
  const key = getNotificationsKey(address);
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : [];
}

export function saveNotifications(address: string, notifications: AppNotification[]): void {
  const key = getNotificationsKey(address);
  localStorage.setItem(key, JSON.stringify(notifications));
}

// Migration helper
export function migrateNotificationsToAddressBased(address: string, userId: string): void {
  const oldKey = 'studio_notifications';
  const stored = localStorage.getItem(oldKey);
  
  if (stored) {
    const allNotifications = JSON.parse(stored);
    const userNotifications = allNotifications.filter(
      (n: AppNotification) => n.userId === userId
    );
    
    if (userNotifications.length > 0) {
      saveNotifications(address, userNotifications);
      console.log(`[Migration] Migrated ${userNotifications.length} notifications for ${address}`);
    }
  }
}
```

### **Files to Update:**
1. `/src/utils/notifications.ts` - Main changes
2. `/src/contexts/NotificationContext.tsx` - Use address instead of userId
3. All components using notifications - Pass `address` parameter

---

## 🔄 MIGRATION STRATEGY

### **Auto-Migration on User Load**

Add to `/src/hooks/useUserInitialization.ts`:

```typescript
import { migrateConversationsToAddressBased } from '@/utils/conversationUtils';
import { migrateFavoritesToAddressBased } from '@/utils/favoritesUtils';
import { migrateNotificationsToAddressBased } from '@/utils/notifications';

export function useUserInitialization() {
  const { address } = useAccount();
  
  useEffect(() => {
    if (!address) return;
    
    // Get userId for migration
    const userId = getUserIdFromAddress(address);
    if (!userId) return;
    
    // Check if migration already done
    const migrationKey = `orina_migration_complete_${address.toLowerCase()}`;
    const migrationDone = localStorage.getItem(migrationKey);
    
    if (!migrationDone) {
      console.log('[Migration] Starting data migration for', address);
      
      // Migrate all systems
      migrateConversationsToAddressBased(address, userId);
      migrateFavoritesToAddressBased(address, userId);
      migrateNotificationsToAddressBased(address, userId);
      
      // Mark migration as complete
      localStorage.setItem(migrationKey, 'true');
      console.log('[Migration] ✅ Migration complete for', address);
    }
  }, [address]);
}
```

---

## 🧹 CLEANUP LEGACY DATA

### **Add to resetProfile.ts:**

```typescript
export function resetProfileForAddress(address: string): void {
  const userId = getUserIdFromAddress(address);
  
  // Clear NEW address-based keys
  const addressLower = address.toLowerCase();
  const newKeys = [
    `orina_conversations_${addressLower}`,
    `orina_messages_${addressLower}`,
    `orina_favorites_${addressLower}`,
    `orina_watchlist_${addressLower}`,
    `orina_watchlist_alerts_${addressLower}`,
    `orina_notifications_${addressLower}`,
    `orina_notification_prefs_${addressLower}`,
    `orina_migration_complete_${addressLower}`,
  ];
  
  newKeys.forEach(key => {
    localStorage.removeItem(key);
    console.log(`[Reset] ✓ Removed: ${key}`);
  });
  
  // Also clean from OLD global keys (if migration didn't run)
  if (userId) {
    cleanFromGlobalKeys(userId);
  }
}

function cleanFromGlobalKeys(userId: string): void {
  // Clean from global conversations
  const conversationsKey = 'orina_conversations';
  const conversations = localStorage.getItem(conversationsKey);
  if (conversations) {
    const parsed = JSON.parse(conversations);
    const filtered = parsed.filter((c: any) => c.userId !== userId);
    if (filtered.length > 0) {
      localStorage.setItem(conversationsKey, JSON.stringify(filtered));
    } else {
      localStorage.removeItem(conversationsKey);
    }
  }
  
  // Clean from global favorites
  const favoritesKey = 'studio_favorites';
  const favorites = localStorage.getItem(favoritesKey);
  if (favorites) {
    const parsed = JSON.parse(favorites);
    const filtered = parsed.filter((f: any) => f.userId !== userId);
    if (filtered.length > 0) {
      localStorage.setItem(favoritesKey, JSON.stringify(filtered));
    } else {
      localStorage.removeItem(favoritesKey);
    }
  }
  
  // Clean from global notifications
  const notificationsKey = 'studio_notifications';
  const notifications = localStorage.getItem(notificationsKey);
  if (notifications) {
    const parsed = JSON.parse(notifications);
    const filtered = parsed.filter((n: any) => n.userId !== userId);
    if (filtered.length > 0) {
      localStorage.setItem(notificationsKey, JSON.stringify(filtered));
    } else {
      localStorage.removeItem(notificationsKey);
    }
  }
}
```

---

## 🧪 TESTING CHECKLIST

### **Test 1: Data Isolation**
```
1. Connect Wallet A (0x111...)
2. Create 5 conversations, 3 favorites, 2 notifications
3. Disconnect
4. Connect Wallet B (0x222...)
5. Create 3 conversations, 5 favorites, 1 notification
6. Open DevTools → Application → LocalStorage
7. ✅ Verify Wallet A data in `orina_xxx_0x111...`
8. ✅ Verify Wallet B data in `orina_xxx_0x222...`
9. ✅ Verify NO data leakage between wallets
```

### **Test 2: Migration**
```
1. Manually create old global data:
   localStorage.setItem('orina_conversations', JSON.stringify([
     { id: '1', userId: 'user_abc', name: 'Test' }
   ]))
2. Connect wallet
3. ✅ Verify migration runs (check console)
4. ✅ Verify data appears in `orina_conversations_0x...`
5. ✅ Verify migration flag set
6. Reload page
7. ✅ Verify migration doesn't run again
```

### **Test 3: Profile Reset**
```
1. Connect wallet
2. Create data in all systems
3. Click "Inspect Data" button
4. ✅ Verify all `orina_xxx_0x...` keys present
5. Click "Reset Profile"
6. ✅ Verify ALL keys removed
7. ✅ Verify old global keys also cleaned
8. Reload page
9. ✅ Verify fresh start (no data)
```

---

## 📊 ROLLOUT PLAN

### **Step 1: Development** (Day 1)
- [ ] Update `conversationUtils.ts`
- [ ] Update `favoritesUtils.ts`
- [ ] Update `notifications.ts`
- [ ] Add migration logic to `useUserInitialization.ts`
- [ ] Update `resetProfile.ts`
- [ ] Local testing with debug tool

### **Step 2: Component Updates** (Day 2)
- [ ] Update all components using conversations
- [ ] Update all components using favorites
- [ ] Update all components using notifications
- [ ] Full app testing

### **Step 3: Validation** (Day 2-3)
- [ ] Run all test scenarios
- [ ] Multi-user testing
- [ ] Migration testing
- [ ] Profile reset testing
- [ ] Performance testing

### **Step 4: Deploy** (Day 3)
- [ ] Code review
- [ ] Deploy to staging
- [ ] Staging validation
- [ ] Deploy to production
- [ ] Monitor for issues

---

## 🚨 ROLLBACK PLAN

If critical issues found after deployment:

1. **Immediate Rollback:**
   - Revert to previous version
   - No data loss (old keys still exist)

2. **Fix & Redeploy:**
   - Fix issues in dev
   - Test thoroughly
   - Redeploy when ready

3. **Data Recovery:**
   - Old global keys remain until explicitly removed
   - Can restore from old keys if needed

---

## ✅ SUCCESS METRICS

After Phase 1 completion:

- [ ] ✅ 0 global keys containing user-specific data
- [ ] ✅ All messaging data isolated per-address
- [ ] ✅ All favorites/watchlist data isolated per-address
- [ ] ✅ All notifications isolated per-address
- [ ] ✅ Migration runs successfully for existing users
- [ ] ✅ Profile reset clears ALL new keys
- [ ] ✅ Multi-user testing passes
- [ ] ✅ Performance acceptable (< 100ms for operations)

---

**Next:** After Phase 1 completion, proceed to Phase 2 (Profile Unification)

---

*Implementation Guide - Phase 1 - Version 1.0*
