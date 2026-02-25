# 🎨 Data Architecture - Visual Guide

Quick visual reference for understanding Orina's data storage architecture.

---

## 🔴 CURRENT STATE (Before Fix)

```
┌─────────────────────────────────────────────────────────────┐
│                    LOCALSTORAGE (Browser)                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ✅ GOOD - Address-based (Consistent)                       │
│  ├─ orina_api_keys_0x742d35cc...                           │
│  ├─ orina_avatar_seed_0x742d35cc...                        │
│  └─ orina_api_pending_ops_0x742d35cc...                    │
│                                                              │
│  ⚠️  MIXED - UserID-based (Requires mapping)                │
│  ├─ studio_user_profile_user_abc123                        │
│  ├─ orina_user_settings_user_abc123                        │
│  └─ studio_portfolio_history_user_abc123                   │
│                                                              │
│  ❌ BAD - Global with filtering (Privacy risk!)             │
│  ├─ orina_conversations        ← All users' chats!         │
│  ├─ orina_messages             ← All users' messages!      │
│  ├─ studio_favorites           ← All users' favorites!     │
│  ├─ studio_watchlist           ← All users' watchlist!     │
│  ├─ studio_notifications       ← All users' notifications! │
│  ├─ studio_community_posts     ← OK (public feed)          │
│  └─ studio_user_actions        ← All users' actions!       │
│                                                              │
│  ℹ️  GLOBAL UI State (Acceptable)                           │
│  ├─ studio_recent_commands                                  │
│  └─ ipfs-setup-banner-dismissed                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘

Problems:
1. 🔴 Privacy: User A can inspect User B's data
2. ⚠️  Inconsistency: 3 different storage patterns
3. ❌ Reset fails: Can't find all keys to delete
4. 📊 Performance: Global keys grow with all users
```

---

## ✅ TARGET STATE (After Fix)

```
┌─────────────────────────────────────────────────────────────┐
│                    LOCALSTORAGE (Browser)                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  📁 USER: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ ✅ Profile & Identity                                   │ │
│  │  ├─ orina_profile_0x742d35cc...                       │ │
│  │  ├─ orina_settings_0x742d35cc...                      │ │
│  │  └─ orina_avatar_seed_0x742d35cc...                   │ │
│  │                                                         │ │
│  │ ✅ Security & Auth                                      │ │
│  │  ├─ orina_api_keys_0x742d35cc...                      │ │
│  │  └─ orina_api_pending_ops_0x742d35cc...               │ │
│  │                                                         │ │
│  │ ✅ Messaging (FIXED!)                                   │ │
│  │  ├─ orina_conversations_0x742d35cc...                 │ │
│  │  └─ orina_messages_0x742d35cc...                      │ │
│  │                                                         │ │
│  │ ✅ Assets & Favorites (FIXED!)                         │ │
│  │  ├─ orina_favorites_0x742d35cc...                     │ │
│  │  ├─ orina_watchlist_0x742d35cc...                     │ │
│  │  └─ orina_watchlist_alerts_0x742d35cc...              │ │
│  │                                                         │ │
│  │ ✅ Analytics & Portfolio                               │ │
│  │  ├─ orina_portfolio_history_0x742d35cc...             │ │
│  │  └─ orina_transactions_0x742d35cc...                  │ │
│  │                                                         │ │
│  │ ✅ Notifications (FIXED!)                              │ │
│  │  ├─ orina_notifications_0x742d35cc...                 │ │
│  │  └─ orina_notification_prefs_0x742d35cc...            │ │
│  │                                                         │ │
│  │ ✅ Activities & Reviews                                │ │
│  │  ├─ orina_activities_0x742d35cc...                    │ │
│  │  ├─ orina_reviews_0x742d35cc...                       │ │
│  │  └─ orina_user_actions_0x742d35cc...                  │ │
│  │                                                         │ │
│  │ ✅ Migration Tracking                                  │ │
│  │  └─ orina_migration_complete_0x742d35cc...            │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  🌍 GLOBAL (Public/Shared Data)                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ ✅ Community (Public feed - OK to be global)           │ │
│  │  ├─ orina_community_posts                             │ │
│  │  └─ orina_community_comments                          │ │
│  │                                                         │ │
│  │ ✅ UI State (Non-sensitive - OK to be global)          │ │
│  │  ├─ orina_recent_commands                             │ │
│  │  └─ orina_ipfs_banner_dismissed                       │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘

Benefits:
1. ✅ Privacy: Each user has isolated storage
2. ✅ Consistency: All keys use same pattern
3. ✅ Reset works: Easy to find all keys (prefix search)
4. ✅ Performance: Each key contains only relevant data
```

---

## 🔄 MIGRATION FLOW

```
┌─────────────────────────────────────────────────────────────┐
│                    USER CONNECTS WALLET                      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
          ┌───────────────────────┐
          │ Check migration flag  │
          │ orina_migration_      │
          │   complete_0x742d...  │
          └───────┬───────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
        ▼                   ▼
   [Exists]           [Not exists]
        │                   │
        ▼                   ▼
   ┌─────────┐      ┌──────────────────┐
   │  SKIP   │      │  RUN MIGRATION   │
   │ (Done)  │      └────────┬─────────┘
   └─────────┘               │
                             ▼
              ┌──────────────────────────────┐
              │  Load from old global keys:  │
              │  - orina_conversations       │
              │  - studio_favorites          │
              │  - studio_notifications      │
              └──────────┬───────────────────┘
                         │
                         ▼
              ┌──────────────────────────────┐
              │  Filter by userId:           │
              │  conversations.filter(       │
              │    c => c.userId === userId  │
              │  )                            │
              └──────────┬───────────────────┘
                         │
                         ▼
              ┌──────────────────────────────┐
              │  Save to new address keys:   │
              │  orina_conversations_0x...   │
              │  orina_favorites_0x...       │
              │  orina_notifications_0x...   │
              └──────────┬───────────────────┘
                         │
                         ▼
              ┌──────────────────────────────┐
              │  Set migration flag:         │
              │  orina_migration_complete_   │
              │    0x742d... = "true"        │
              └──────────┬───────────────────┘
                         │
                         ▼
                   ┌──────────┐
                   │   DONE   │
                   │ ✅ Ready  │
                   └──────────┘
```

---

## 🔍 DEBUGGING FLOW

```
User Reports: "My data disappeared after profile reset!"

Step 1: Inspect LocalStorage
┌──────────────────────────────────────┐
│ Open Settings → Developer Tools      │
│ Click "Inspect Data" button          │
│ Check console output                 │
└──────────┬───────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│ [🔑 API-related keys (2)]:           │
│   - orina_api_keys_0x742d... ✅      │
│   - marketplace_api_keys ⚠️ Legacy   │
│                                       │
│ [👤 Profile-related keys (5)]:       │
│   - orina_profile_0x742d... ✅       │
│   - studio_user_profile_user_... ⚠️  │
│                                       │
│ [📦 Other keys (3)]:                 │
│   - wagmi.connected                  │
│   - ...                               │
└──────────┬───────────────────────────┘
           │
           ▼
   ┌───────────────────┐
   │ Analyze Results   │
   └───────┬───────────┘
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
[All ✅]     [Mix of ⚠️ ❌]
    │             │
    ▼             ▼
 GOOD!        NEEDS FIX!
             │
             ▼
   ┌─────────────────────────┐
   │ Check Storage Pattern:  │
   │                          │
   │ ✅ orina_xxx_0x...      │
   │    → Address-based OK   │
   │                          │
   │ ⚠️  studio_xxx_user_... │
   │    → UserID inconsistent│
   │                          │
   │ ❌ studio_xxx           │
   │    → Global (BAD!)      │
   └─────────────────────────┘
```

---

## 📊 PHASE ROADMAP

```
┌──────────────────────────────────────────────────────────────┐
│                         TIMELINE                              │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Week 1: PHASE 1 - Critical Security Fixes                   │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Day 1-2: Fix Messaging System                           │ │
│  │  └─ orina_conversations → orina_conversations_0x...     │ │
│  │                                                           │ │
│  │ Day 2-3: Fix Favorites & Watchlist                      │ │
│  │  └─ studio_favorites → orina_favorites_0x...           │ │
│  │                                                           │ │
│  │ Day 3-4: Fix Notifications                              │ │
│  │  └─ studio_notifications → orina_notifications_0x...    │ │
│  │                                                           │ │
│  │ Day 4-5: Testing & Validation                           │ │
│  │  └─ Multi-user testing, migration testing              │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  Week 2: PHASE 2 - Profile Unification                       │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Day 1-2: Design UnifiedProfileManager                   │ │
│  │  └─ Merge studio_user_profile + orina_user_settings    │ │
│  │                                                           │ │
│  │ Day 3-4: Implement Migration                            │ │
│  │  └─ Auto-migrate to unified profile                     │ │
│  │                                                           │ │
│  │ Day 4-5: Testing                                        │ │
│  │  └─ Profile integrity tests                             │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  Week 3: PHASE 3 - Full Migration                            │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Day 1-2: Migrate Analytics                              │ │
│  │  └─ studio_portfolio_history → orina_portfolio_0x...   │ │
│  │                                                           │ │
│  │ Day 3: Migrate Activities & Reviews                     │ │
│  │  └─ studio_user_activities → orina_activities_0x...    │ │
│  │                                                           │ │
│  │ Day 4: Cleanup & Validation                             │ │
│  │  └─ Remove all legacy keys, final testing              │ │
│  │                                                           │ │
│  │ Day 5: Production Deployment                            │ │
│  │  └─ Deploy, monitor, celebrate! 🎉                      │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎯 BEFORE/AFTER COMPARISON

### **Scenario: User Profile Reset**

#### BEFORE (Current - Broken ❌)
```
1. User clicks "Reset Profile"
2. Code tries to clear keys for userId "user_abc123"
3. Deletes:
   ✅ studio_user_profile_user_abc123
   ✅ orina_user_settings_user_abc123
   ❌ orina_conversations (can't find - it's global!)
   ❌ studio_favorites (can't find - it's global!)
   ❌ orina_api_keys_0x742d... (wrong format!)
4. Page reloads
5. User still sees:
   ❌ Old conversations
   ❌ Old favorites
   ❌ Old API keys
6. User frustrated! 😡
```

#### AFTER (Fixed - Works ✅)
```
1. User clicks "Reset Profile"
2. Code clears all keys for address "0x742d35cc..."
3. Deletes:
   ✅ orina_profile_0x742d35cc...
   ✅ orina_settings_0x742d35cc...
   ✅ orina_conversations_0x742d35cc...
   ✅ orina_favorites_0x742d35cc...
   ✅ orina_api_keys_0x742d35cc...
   ✅ orina_notifications_0x742d35cc...
   ✅ (ALL keys with prefix orina_*_0x742d35cc...)
4. Page reloads
5. User sees:
   ✅ Fresh profile
   ✅ No conversations
   ✅ No favorites
   ✅ No API keys
6. User happy! 🎉
```

---

## 🔐 SECURITY COMPARISON

### **Scenario: Two Users, Same Browser**

#### BEFORE (Insecure ❌)
```
User A connects: 0x111...
- Creates conversations: Saved to orina_conversations
- Creates favorites: Saved to studio_favorites
- Disconnects

User B connects: 0x222...
- Inspects localStorage in DevTools
- Sees orina_conversations: [
    { userId: "user_abc", from: "Alice", to: "Bob", message: "Secret deal..." }
  ]
- 🔴 PRIVACY BREACH! User B can read User A's messages!
```

#### AFTER (Secure ✅)
```
User A connects: 0x111...
- Creates conversations: Saved to orina_conversations_0x111...
- Creates favorites: Saved to orina_favorites_0x111...
- Disconnects

User B connects: 0x222...
- Inspects localStorage in DevTools
- Sees orina_conversations_0x222...: []
- Sees orina_conversations_0x111...: [Object]
  (Can see key exists, but data is NOT meant for them)
- ✅ User A's data is isolated!
```

---

**Visual Guide Complete!** Use these diagrams to:
- Explain architecture to team
- Debug storage issues
- Plan migration work
- Validate fixes

---

*Visual Guide - Version 1.0 - 2026-02-11*
