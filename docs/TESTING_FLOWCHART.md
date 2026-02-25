# 🎨 TESTING FLOWCHART - PHASE 1

```
┌─────────────────────────────────────────────────────────────────┐
│                    🧪 PHASE 1 TESTING FLOW                      │
└─────────────────────────────────────────────────────────────────┘

START
  │
  ├─► [1] SETUP
  │     ├─ Open DevTools (F12)
  │     ├─ Go to Console tab
  │     └─ Clear console
  │
  ├─► [2] CONNECT WALLET A
  │     ├─ Click "Connect Wallet"
  │     ├─ Select Wallet A (0x742d...)
  │     └─ ✅ Verify: Address shows in UI
  │
  ├─► [3] CREATE TEST DATA
  │     ├─ Go to Messages
  │     ├─ Send message: "Test from Wallet A"
  │     └─ ✅ Verify: Message appears
  │
  ├─► [4] CHECK STORAGE KEYS
  │     │
  │     ├─ Run: Object.keys(localStorage).filter(k => k.includes('orina_0x'))
  │     │
  │     └─ Expected:
  │         ✅ orina_conversations_0x742d...
  │         ✅ orina_messages_0x742d...
  │
  ├─► [5] DISCONNECT WALLET A
  │     ├─ Click wallet button
  │     ├─ Click "Disconnect"
  │     └─ ✅ Verify: Wallet disconnected
  │
  ├─► [6] CONNECT WALLET B
  │     ├─ Click "Connect Wallet"
  │     ├─ Select Wallet B (0x8a1f...)
  │     └─ ✅ Verify: Different address
  │
  ├─► [7] VERIFY ISOLATION
  │     │
  │     ├─ Check Messages page
  │     │   └─ ❌ Should NOT see "Test from Wallet A"
  │     │
  │     ├─ Check storage
  │     │   └─ ✅ Should see TWO sets of keys:
  │     │       - orina_conversations_0x742d... (Wallet A)
  │     │       - orina_conversations_0x8a1f... (Wallet B)
  │     │
  │     └─ PASS? ────┬─ YES ──► Continue to [8]
  │                  └─ NO ───► STOP & FIX
  │
  ├─► [8] TEST MIGRATION
  │     │
  │     ├─ Create legacy data (Console):
  │     │   localStorage.setItem('orina_conversations', JSON.stringify([...]))
  │     │
  │     ├─ Reload page
  │     │
  │     ├─ Check Console:
  │     │   └─ Expected:
  │     │       ✅ [Migration] Starting data migration...
  │     │       ✅ [Migration] Migrated X items
  │     │       ✅ [Migration] ✅ Migration complete!
  │     │
  │     ├─ Reload again
  │     │   └─ Expected:
  │     │       ✅ [Migration] ✅ Already migrated, skipping
  │     │
  │     └─ PASS? ────┬─ YES ──► Continue to [9]
  │                  └─ NO ───► STOP & FIX
  │
  ├─► [9] TEST PROFILE RESET
  │     │
  │     ├─ Count keys before:
  │     │   console.log('Before:', Object.keys(localStorage).filter(k => k.includes('orina')).length)
  │     │
  │     ├─ Go to Settings → Developer Tools
  │     │
  │     ├─ Click "Reset Profile"
  │     │
  │     ├─ Check Console:
  │     │   └─ Expected:
  │     │       ✅ [Phase 1] Clearing address-based keys
  │     │       ✅ [Phase 2] Clearing legacy keys
  │     │       ✅ [Phase 3] Cleaning global storage
  │     │       ✅ [Phase 4] Clearing mappings
  │     │       ✅ [Phase 5] Wildcard cleanup
  │     │       ✅ [Phase 6] Avatar reset
  │     │       ✅ PROFILE RESET COMPLETE
  │     │
  │     ├─ Page reloads automatically
  │     │
  │     ├─ Count keys after:
  │     │   console.log('After:', Object.keys(localStorage).filter(k => k.includes('orina')).length)
  │     │   └─ Expected: 0 or very low
  │     │
  │     ├─ Check Messages page
  │     │   └─ ✅ Should be empty/fresh
  │     │
  │     └─ PASS? ────┬─ YES ──► Continue to [10]
  │                  └─ NO ───► STOP & FIX
  │
  ├─► [10] VERIFY ALL SYSTEMS
  │      │
  │      ├─ Test Messaging:
  │      │   ├─ Send new message
  │      │   └─ ✅ Saved to orina_messages_0x...
  │      │
  │      ├─ Test Notifications:
  │      │   ├─ Trigger test notification
  │      │   └─ ✅ Saved to orina_notifications_0x...
  │      │
  │      ├─ Test Favorites:
  │      │   ├─ Add favorite
  │      │   └─ ✅ Saved to orina_favorites_0x...
  │      │
  │      └─ PASS? ────┬─ YES ──► Continue to [11]
  │                   └─ NO ───► STOP & FIX
  │
  └─► [11] FINAL VERIFICATION
        │
        ├─ Run mega inspector command:
        │   [See QUICK_TEST_REFERENCE.md]
        │
        ├─ Check for:
        │   ✅ All keys have 0x address
        │   ✅ No console errors
        │   ✅ Data persists after reload
        │   ✅ Reset works completely
        │   ✅ Migration runs once
        │
        └─ ALL PASS? ────┬─ YES ──► 🎉 SUCCESS!
                         └─ NO ───► Review failed tests

┌─────────────────────────────────────────────────────────────────┐
│                         🎉 SUCCESS!                             │
│                                                                 │
│  ✅ All tests passed!                                           │
│  ✅ Phase 1 is production ready!                                │
│  ✅ You can now deploy!                                         │
│                                                                 │
│  Next steps:                                                    │
│  1. Deploy to staging                                           │
│  2. Monitor logs                                                │
│  3. Proceed to Phase 2                                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 DECISION POINTS

```
At each "PASS?" checkpoint:

✅ YES → Continue to next test
❌ NO  → STOP and investigate:
         1. Check console for errors
         2. Review troubleshooting guide
         3. Fix issue
         4. Restart from failed test
```

---

## 📊 PROGRESS TRACKER

```
Print and check off as you complete:

[ ] 1. Setup (DevTools + Console)
[ ] 2. Connect Wallet A
[ ] 3. Create Test Data
[ ] 4. Check Storage Keys
[ ] 5. Disconnect Wallet A
[ ] 6. Connect Wallet B
[ ] 7. Verify Isolation ⭐ CRITICAL
[ ] 8. Test Migration ⭐ CRITICAL
[ ] 9. Test Profile Reset ⭐ CRITICAL
[ ] 10. Verify All Systems
[ ] 11. Final Verification

Total Progress: ___/11 (____%)
```

---

## 🚨 CRITICAL CHECKPOINTS

These **MUST PASS** for production:

```
⭐ CHECKPOINT 1: Data Isolation
   └─ Each wallet has separate storage keys
   └─ No data leakage between wallets

⭐ CHECKPOINT 2: Auto-Migration
   └─ Old data migrates automatically
   └─ Migration runs only once
   └─ No data loss

⭐ CHECKPOINT 3: Profile Reset
   └─ All user data removed
   └─ 6 phases complete
   └─ Fresh start after reset
```

---

## 🔄 RETRY FLOW

```
If test FAILS:
  │
  ├─► Check Console
  │     ├─ Any red errors?
  │     ├─ Migration logs correct?
  │     └─ Storage keys correct format?
  │
  ├─► Nuclear Reset
  │     └─ Object.keys(localStorage)
  │         .filter(k => k.includes('orina'))
  │         .forEach(k => localStorage.removeItem(k))
  │
  ├─► Hard Reload
  │     └─ Ctrl + Shift + R
  │
  └─► Restart from [1] SETUP
```

---

## ⏱️ ESTIMATED TIME

```
Quick Test:     5 minutes   (basic verification)
Essential Test: 15 minutes  (critical features)
Full Test:      30 minutes  (comprehensive)
Thorough Test:  45 minutes  (all scenarios)

Recommended: Essential Test (15 min) minimum
```

---

## 📱 MOBILE TESTING FLOW

```
[For mobile/tablet testing]

1. Open mobile browser
2. Connect wallet (MetaMask mobile, etc)
3. Run same tests
4. Verify responsive design
5. Check touch interactions

Note: Console access limited on mobile
→ Focus on UI/UX testing
→ Storage verification on desktop
```

---

## 🎊 COMPLETION CHECKLIST

```
When ALL tests pass:

[x] Data Isolation works
[x] Migration works  
[x] Reset works
[x] Messaging works
[x] Notifications work
[x] Favorites work
[x] No console errors
[x] No TypeScript errors
[x] Data persists correctly
[x] Multi-wallet safe

Status: 🟢 READY FOR PRODUCTION! 🚀
```

---

## 📞 NEED HELP?

```
Issue during testing?

1. Check: /docs/TESTING_GUIDE_PHASE_1.md
   → Full troubleshooting guide

2. Check: /docs/QUICK_TEST_REFERENCE.md
   → Quick commands & fixes

3. Check: /docs/PHASE_1_FINAL_SUMMARY.md
   → Complete implementation details

4. Review Console logs
   → Look for [Migration], [Orina Reset] prefixes
```

---

**Follow this flow for systematic testing!** 🎯

*Testing Flowchart - Phase 1 - v1.0 - 2026-02-11*
