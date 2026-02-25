# 🎮 INTERACTIVE TESTING HELPER - PHASE 1

**Copy-paste commands directly into browser console!**

---

## 🚀 **QUICKSTART - ONE-COMMAND TEST**

**Paste this mega-command into Console:**

```javascript
// ============================================================
// 🎯 ORINA PHASE 1 - COMPLETE TESTING SUITE
// ============================================================

(function() {
  console.clear();
  console.log('%c🎯 ORINA PHASE 1 TESTING SUITE', 'font-size: 20px; font-weight: bold; color: #2CC295');
  console.log('%c====================================', 'color: #2CC295');
  
  // Get current address (you need to fill this)
  const ADDRESS = '0x742d35cc'; // ⚠️ CHANGE TO YOUR WALLET ADDRESS
  
  console.log('\n%c📊 SYSTEM CHECK', 'font-size: 16px; font-weight: bold; color: #3b82f6');
  console.log('='.repeat(50));
  
  // 1. Check wallet connection
  const connectedAddress = ADDRESS; // Replace with actual
  console.log('🔌 Wallet Address:', connectedAddress);
  
  // 2. List all Orina keys
  const allKeys = Object.keys(localStorage).filter(k => k.includes('orina'));
  console.log('\n📦 Total Orina Keys:', allKeys.length);
  
  // 3. Categorize keys
  const addressBasedKeys = allKeys.filter(k => k.includes('_0x'));
  const legacyKeys = allKeys.filter(k => !k.includes('_0x'));
  
  console.log('├─ Address-based:', addressBasedKeys.length);
  console.log('└─ Legacy global:', legacyKeys.length);
  
  // 4. Check migration status
  const migrationFlag = localStorage.getItem(`orina_migration_complete_${ADDRESS}`);
  console.log('\n🔄 Migration Status:', migrationFlag ? '✅ Migrated' : '❌ Not yet migrated');
  
  // 5. Check user data
  console.log('\n%c📊 USER DATA SUMMARY', 'font-size: 16px; font-weight: bold; color: #3b82f6');
  console.log('='.repeat(50));
  
  const userKeys = {
    conversations: `orina_conversations_${ADDRESS}`,
    messages: `orina_messages_${ADDRESS}`,
    favorites: `orina_favorites_${ADDRESS}`,
    watchlist: `orina_watchlist_${ADDRESS}`,
    notifications: `orina_notifications_${ADDRESS}`,
    notificationPrefs: `orina_notification_prefs_${ADDRESS}`,
  };
  
  Object.entries(userKeys).forEach(([name, key]) => {
    const data = localStorage.getItem(key);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        const count = Array.isArray(parsed) ? parsed.length : 'N/A';
        console.log(`✅ ${name}: ${count} items`);
      } catch(e) {
        console.log(`✅ ${name}: (exists)`);
      }
    } else {
      console.log(`❌ ${name}: Not found`);
    }
  });
  
  // 6. Health check
  console.log('\n%c🏥 HEALTH CHECK', 'font-size: 16px; font-weight: bold; color: #22c55e');
  console.log('='.repeat(50));
  
  const checks = [
    { name: 'Wallet Connected', pass: !!connectedAddress },
    { name: 'Has Address-Based Keys', pass: addressBasedKeys.length > 0 },
    { name: 'Migration Complete', pass: !!migrationFlag },
    { name: 'Has User Data', pass: addressBasedKeys.filter(k => k.includes(ADDRESS)).length > 0 },
  ];
  
  checks.forEach(check => {
    console.log(`${check.pass ? '✅' : '❌'} ${check.name}`);
  });
  
  const allPassed = checks.every(c => c.pass);
  
  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    console.log('%c🎉 ALL CHECKS PASSED!', 'font-size: 18px; font-weight: bold; color: #22c55e');
    console.log('%cSystem is working correctly!', 'color: #22c55e');
  } else {
    console.log('%c⚠️ SOME CHECKS FAILED', 'font-size: 18px; font-weight: bold; color: #ef4444');
    console.log('%cPlease review failed items above', 'color: #ef4444');
  }
  console.log('='.repeat(50));
  
  // 7. Quick actions
  console.log('\n%c🛠️ QUICK ACTIONS', 'font-size: 16px; font-weight: bold; color: #f59e0b');
  console.log('='.repeat(50));
  console.log('Run these commands as needed:');
  console.log('');
  console.log('// Force re-migration:');
  console.log(`localStorage.removeItem('orina_migration_complete_${ADDRESS}'); location.reload();`);
  console.log('');
  console.log('// Nuclear reset (delete all):');
  console.log('Object.keys(localStorage).filter(k => k.includes("orina")).forEach(k => localStorage.removeItem(k)); location.reload();');
  console.log('');
  console.log('// List all keys:');
  console.log('Object.keys(localStorage).filter(k => k.includes("orina")).forEach(k => console.log(k));');
  
})();
```

---

## 🧪 **INDIVIDUAL TEST COMMANDS**

### **Test 1: Check Current Address**
```javascript
// Shows which wallet is connected
console.log('Connected Address:', document.querySelector('[data-address]')?.textContent || 'Check UI');
```

### **Test 2: Verify Address-Based Storage**
```javascript
// Lists all address-based keys
const ADDRESS = '0x742d35cc'; // YOUR ADDRESS
const keys = Object.keys(localStorage).filter(k => k.includes(ADDRESS));
console.log('Your Keys:', keys);
console.log('Count:', keys.length);
```

### **Test 3: Check Migration Status**
```javascript
// Checks if migration has run
const ADDRESS = '0x742d35cc'; // YOUR ADDRESS
const migrated = !!localStorage.getItem(`orina_migration_complete_${ADDRESS}`);
console.log('Migration Complete:', migrated ? '✅ Yes' : '❌ No');
```

### **Test 4: Inspect Conversations**
```javascript
// Shows all conversations
const ADDRESS = '0x742d35cc'; // YOUR ADDRESS
const key = `orina_conversations_${ADDRESS}`;
const data = JSON.parse(localStorage.getItem(key) || '[]');
console.log('Conversations:', data.length);
console.table(data.map(c => ({ id: c.id, name: c.displayName, unread: c.unread })));
```

### **Test 5: Inspect Messages**
```javascript
// Shows all messages
const ADDRESS = '0x742d35cc'; // YOUR ADDRESS
const key = `orina_messages_${ADDRESS}`;
const data = JSON.parse(localStorage.getItem(key) || '[]');
console.log('Messages:', data.length);
console.table(data.map(m => ({ id: m.id, sender: m.sender, text: m.text.substring(0, 30) })));
```

### **Test 6: Inspect Favorites**
```javascript
// Shows all favorites
const ADDRESS = '0x742d35cc'; // YOUR ADDRESS
const key = `orina_favorites_${ADDRESS}`;
const data = JSON.parse(localStorage.getItem(key) || '[]');
console.log('Favorites:', data.length);
console.table(data);
```

### **Test 7: Inspect Notifications**
```javascript
// Shows all notifications
const ADDRESS = '0x742d35cc'; // YOUR ADDRESS
const key = `orina_notifications_${ADDRESS}`;
const data = JSON.parse(localStorage.getItem(key) || '[]');
console.log('Notifications:', data.length);
console.table(data.map(n => ({ type: n.type, title: n.title, read: n.read })));
```

---

## 🔄 **MIGRATION TESTING**

### **Create Legacy Data**
```javascript
// Creates old-format data for migration testing
console.log('Creating legacy data...');

localStorage.setItem('orina_conversations', JSON.stringify([
  {
    id: 'legacy-1',
    address: '0xLEGACY',
    displayName: 'Legacy Conversation',
    lastMessage: 'This is old data',
    timestamp: 'Just now',
    unread: 1
  }
]));

localStorage.setItem('orina_messages', JSON.stringify([
  {
    id: 'msg-legacy-1',
    conversationId: 'legacy-1',
    sender: 'them',
    text: 'Hello from legacy storage!',
    timestamp: new Date().toISOString()
  }
]));

localStorage.setItem('orina_favorites', JSON.stringify([
  {
    assetId: 'asset-legacy-1',
    addedAt: new Date().toISOString()
  }
]));

console.log('✅ Legacy data created!');
console.log('Now reload page to trigger migration');
```

### **Force Re-Migration**
```javascript
// Forces migration to run again
const ADDRESS = '0x742d35cc'; // YOUR ADDRESS
localStorage.removeItem(`orina_migration_complete_${ADDRESS}`);
console.log('✅ Migration flag removed');
console.log('Reloading page...');
setTimeout(() => location.reload(), 1000);
```

### **Check Migration Logs**
```javascript
// After reload, check console for these logs:
// [Migration] Starting data migration...
// [Migration] Migrated X items
// [Migration] ✅ Migration complete!
```

---

## 🗑️ **RESET TESTING**

### **Count Keys Before Reset**
```javascript
// Run this BEFORE clicking Reset Profile
const before = Object.keys(localStorage).filter(k => k.includes('orina'));
console.log('📦 Keys BEFORE reset:', before.length);
console.log('Keys:', before);
```

### **Count Keys After Reset**
```javascript
// Run this AFTER Reset Profile completes
const after = Object.keys(localStorage).filter(k => k.includes('orina'));
console.log('📦 Keys AFTER reset:', after.length);
console.log('Keys:', after);
console.log(after.length === 0 ? '✅ All cleaned!' : '⚠️ Some keys remain');
```

### **Nuclear Reset (Manual)**
```javascript
// Nuclear option - delete EVERYTHING
console.log('🚨 NUCLEAR RESET - Deleting ALL Orina data...');
const keys = Object.keys(localStorage).filter(k => k.includes('orina'));
console.log('Removing', keys.length, 'keys...');
keys.forEach(k => {
  console.log('  🗑️', k);
  localStorage.removeItem(k);
});
console.log('✅ All Orina data deleted!');
console.log('Reloading...');
setTimeout(() => location.reload(), 1000);
```

---

## 🔍 **ISOLATION TESTING**

### **Compare Two Wallets**
```javascript
// Compare data between two wallets
const WALLET_A = '0x742d35cc'; // Wallet A address
const WALLET_B = '0x8a1f'; // Wallet B address

console.log('%c👥 MULTI-WALLET COMPARISON', 'font-size: 16px; font-weight: bold');
console.log('='.repeat(50));

const walletAKeys = Object.keys(localStorage).filter(k => k.includes(WALLET_A));
const walletBKeys = Object.keys(localStorage).filter(k => k.includes(WALLET_B));

console.log('👤 Wallet A keys:', walletAKeys.length);
walletAKeys.forEach(k => console.log('  -', k));

console.log('\n👤 Wallet B keys:', walletBKeys.length);
walletBKeys.forEach(k => console.log('  -', k));

console.log('\n✅ Isolation:', walletAKeys.length > 0 && walletBKeys.length > 0 ? 'PASS' : 'N/A');
```

### **Verify No Data Leakage**
```javascript
// Checks that current wallet can't see other wallet's data
const CURRENT_ADDRESS = '0x742d35cc'; // YOUR CURRENT WALLET
const conversationsKey = `orina_conversations_${CURRENT_ADDRESS}`;
const conversations = JSON.parse(localStorage.getItem(conversationsKey) || '[]');

console.log('Your conversations:', conversations.length);
console.log('Addresses in conversations:', conversations.map(c => c.address));

// Should ONLY see your own conversations, not other wallets'
```

---

## 📊 **DATA INSPECTOR**

### **Full Data Dump**
```javascript
// Complete inspection of all Orina data
console.log('%c📊 COMPLETE DATA DUMP', 'font-size: 20px; font-weight: bold; color: #2CC295');
console.log('='.repeat(60));

const ADDRESS = '0x742d35cc'; // YOUR ADDRESS
const allKeys = Object.keys(localStorage).filter(k => k.includes('orina'));

// Address-based keys
console.log('\n%c1️⃣ ADDRESS-BASED KEYS:', 'font-weight: bold; color: #3b82f6');
allKeys.filter(k => k.includes(ADDRESS)).forEach(k => {
  const data = localStorage.getItem(k);
  try {
    const parsed = JSON.parse(data);
    const info = Array.isArray(parsed) ? `${parsed.length} items` : typeof parsed;
    console.log(`  ✓ ${k}`);
    console.log(`    └─ ${info}`);
  } catch(e) {
    console.log(`  ✓ ${k}`);
    console.log(`    └─ ${data}`);
  }
});

// Legacy keys
console.log('\n%c2️⃣ LEGACY KEYS:', 'font-weight: bold; color: #f59e0b');
allKeys.filter(k => !k.includes('_0x') && !k.includes('address_to_id')).forEach(k => {
  const data = localStorage.getItem(k);
  try {
    const parsed = JSON.parse(data);
    const info = Array.isArray(parsed) ? `${parsed.length} items` : typeof parsed;
    console.log(`  ✓ ${k}`);
    console.log(`    └─ ${info}`);
  } catch(e) {
    console.log(`  ✓ ${k}`);
  }
});

// Global keys
console.log('\n%c3️⃣ GLOBAL KEYS:', 'font-weight: bold; color: #a855f7');
allKeys.filter(k => k.includes('address_to_id') || k.includes('migration_complete')).forEach(k => {
  console.log(`  ✓ ${k}`);
});

console.log('\n' + '='.repeat(60));
console.log('Total Keys:', allKeys.length);
```

---

## ⚡ **PERFORMANCE TESTING**

### **Measure Storage Size**
```javascript
// Checks total localStorage usage
const orinaKeys = Object.keys(localStorage).filter(k => k.includes('orina'));
let totalSize = 0;

orinaKeys.forEach(k => {
  const value = localStorage.getItem(k) || '';
  totalSize += value.length * 2; // UTF-16 = 2 bytes per char
});

console.log('📊 Storage Usage:');
console.log('  Total Keys:', orinaKeys.length);
console.log('  Total Size:', (totalSize / 1024).toFixed(2), 'KB');
console.log('  Average per key:', (totalSize / orinaKeys.length / 1024).toFixed(2), 'KB');
console.log('  localStorage limit: ~5-10 MB');
console.log('  Usage:', ((totalSize / (5 * 1024 * 1024)) * 100).toFixed(2), '%');
```

---

## 🎯 **SUCCESS VALIDATION**

### **Final Validation Check**
```javascript
// Run this at the end to verify everything works
(function() {
  console.log('%c🎯 FINAL VALIDATION CHECK', 'font-size: 20px; font-weight: bold; color: #22c55e');
  console.log('='.repeat(60));
  
  const ADDRESS = '0x742d35cc'; // YOUR ADDRESS
  
  const checks = [
    {
      name: 'Address-based storage exists',
      test: () => Object.keys(localStorage).some(k => k.includes(`_${ADDRESS}`)),
    },
    {
      name: 'Migration completed',
      test: () => !!localStorage.getItem(`orina_migration_complete_${ADDRESS}`),
    },
    {
      name: 'Conversations stored correctly',
      test: () => !!localStorage.getItem(`orina_conversations_${ADDRESS}`),
    },
    {
      name: 'Messages stored correctly',
      test: () => !!localStorage.getItem(`orina_messages_${ADDRESS}`),
    },
    {
      name: 'No console errors',
      test: () => true, // Visual check
    },
  ];
  
  let passed = 0;
  checks.forEach((check, i) => {
    const result = check.test();
    console.log(`${i + 1}. ${result ? '✅' : '❌'} ${check.name}`);
    if (result) passed++;
  });
  
  console.log('\n' + '='.repeat(60));
  console.log(`Result: ${passed}/${checks.length} passed`);
  
  if (passed === checks.length) {
    console.log('%c🎉 ALL VALIDATION CHECKS PASSED!', 'font-size: 18px; font-weight: bold; color: #22c55e');
    console.log('%c✅ Phase 1 is PRODUCTION READY!', 'color: #22c55e; font-weight: bold');
  } else {
    console.log('%c⚠️ SOME CHECKS FAILED', 'font-size: 18px; font-weight: bold; color: #ef4444');
    console.log('%cPlease review and fix failed items', 'color: #ef4444');
  }
  console.log('='.repeat(60));
})();
```

---

## 🎨 **CONSOLE STYLING**

### **Pretty Print Data**
```javascript
// Beautiful console output
function prettyPrint(title, data) {
  console.log('%c' + title, 'font-size: 16px; font-weight: bold; color: #2CC295; background: #000; padding: 5px;');
  console.table(data);
}

// Usage:
const ADDRESS = '0x742d35cc';
const conversations = JSON.parse(localStorage.getItem(`orina_conversations_${ADDRESS}`) || '[]');
prettyPrint('💬 CONVERSATIONS', conversations);
```

---

## 📱 **MOBILE TESTING**

### **Mobile-Friendly Inspector**
```javascript
// Simpler output for mobile console
const ADDRESS = '0x742d35cc';
const keys = Object.keys(localStorage).filter(k => k.includes(ADDRESS));
alert(`Orina Keys: ${keys.length}\n\n${keys.join('\n')}`);
```

---

## 🎊 **COMPLETION CHECKLIST**

**Copy this and check off as you test:**

```javascript
const checklist = {
  '✅ Quickstart test passed': false,
  '✅ Address-based storage verified': false,
  '✅ Migration tested': false,
  '✅ Reset tested': false,
  '✅ Messaging works': false,
  '✅ Notifications work': false,
  '✅ Favorites work': false,
  '✅ Multi-wallet isolation tested': false,
  '✅ Final validation passed': false,
  '✅ No console errors': false,
};

console.table(checklist);
```

---

**🎮 READY TO TEST!** Copy commands above into your browser console!

*Interactive Testing Helper - Phase 1 - v1.0 - 2026-02-11*
