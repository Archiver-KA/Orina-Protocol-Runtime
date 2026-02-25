# 🧪 HƯỚNG DẪN TEST CHI TIẾT - PHASE 1

**Ngày:** 2026-02-11  
**Phiên bản:** 1.0  
**Thời gian dự kiến:** 30-45 phút

---

## 📋 **MỤC LỤC**

1. [Chuẩn Bị Test](#chuẩn-bị-test)
2. [Test 1: Data Isolation (Cách Ly Dữ Liệu)](#test-1-data-isolation)
3. [Test 2: Auto-Migration (Tự Động Chuyển Đổi)](#test-2-auto-migration)
4. [Test 3: Profile Reset (Xóa Toàn Bộ)](#test-3-profile-reset)
5. [Test 4: Messaging System](#test-4-messaging-system)
6. [Test 5: Notifications](#test-5-notifications)
7. [Test 6: Favorites](#test-6-favorites)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 **CHUẨN BỊ TEST**

### **Yêu Cầu:**
- ✅ 2 wallet addresses khác nhau (hoặc có thể tạo mới)
- ✅ Browser: Chrome/Firefox/Brave
- ✅ DevTools đã mở (F12)
- ✅ App đang chạy local hoặc staging

### **Mở DevTools:**
```bash
# Nhấn F12 hoặc:
- Windows/Linux: Ctrl + Shift + I
- Mac: Cmd + Option + I

# Chuyển sang tab "Console"
```

### **Kiểm Tra Trước Khi Bắt Đầu:**
```javascript
// Paste vào Console để kiểm tra:
console.log('✅ Console works!');

// Kiểm tra localStorage:
console.log('Keys:', Object.keys(localStorage).filter(k => k.includes('orina')));
```

**Expected Result:**
```
✅ Console works!
Keys: [...] // có thể rỗng hoặc có keys cũ
```

---

## 🧪 **TEST 1: DATA ISOLATION**
**Mục đích:** Verify mỗi wallet có data riêng biệt, không bị lẫn lộn

### **Bước 1.1: Connect Wallet A**

```bash
1. Vào app của bạn
2. Click "Connect Wallet"
3. Chọn wallet A (ví dụ: 0x742d35cc...)
4. Confirm connection
```

**Kiểm tra trong Console:**
```javascript
// Paste vào Console:
const address = localStorage.getItem('wagmi.recentConnectorId');
console.log('🔌 Connected Address:', address);
```

**Expected:**
```
🔌 Connected Address: 0x742d35cc... (your wallet A)
```

---

### **Bước 1.2: Tạo Test Data**

```bash
1. Vào trang "Messages"
2. Click vào conversation "Whale Collector" (hoặc bất kỳ)
3. Type message: "Test from Wallet A"
4. Click Send
5. Đợi message appear
```

**Kiểm tra trong Console:**
```javascript
// Paste vào Console:
const keys = Object.keys(localStorage).filter(k => k.includes('orina_conversations') || k.includes('orina_messages'));
console.log('📦 Storage Keys:', keys);

// Xem chi tiết:
keys.forEach(key => {
  const data = JSON.parse(localStorage.getItem(key) || '[]');
  console.log(`\n${key}:`, data.length, 'items');
});
```

**Expected:**
```
📦 Storage Keys: [
  "orina_conversations_0x742d35cc...",
  "orina_messages_0x742d35cc..."
]

orina_conversations_0x742d35cc...: 1 items
orina_messages_0x742d35cc...: 1 items
```

✅ **PASS nếu:**
- Keys có chứa wallet address của bạn
- Có conversations và messages

---

### **Bước 1.3: Disconnect Wallet A**

```bash
1. Click vào wallet button (top right)
2. Click "Disconnect"
3. Verify wallet disconnected
```

**Kiểm tra trong Console:**
```javascript
// Data vẫn tồn tại trong localStorage:
const keys = Object.keys(localStorage).filter(k => k.includes('orina_'));
console.log('📦 Keys after disconnect:', keys.length);
```

**Expected:**
```
📦 Keys after disconnect: 2 (hoặc nhiều hơn)
// Data không bị xóa khi disconnect
```

---

### **Bước 1.4: Connect Wallet B**

```bash
1. Click "Connect Wallet" again
2. Switch sang wallet B (ví dụ: 0x8a1f...)
3. Confirm connection
```

**Kiểm tra trong Console:**
```javascript
// Verify wallet khác:
console.log('🔌 New Address:', /* wallet address from UI */);

// Kiểm tra storage keys:
const allKeys = Object.keys(localStorage).filter(k => k.includes('orina_conversations') || k.includes('orina_messages'));
console.log('📦 All Keys:', allKeys);
```

**Expected:**
```
📦 All Keys: [
  "orina_conversations_0x742d35cc...",  // Wallet A (old)
  "orina_messages_0x742d35cc...",       // Wallet A (old)
  "orina_conversations_0x8a1f...",      // Wallet B (new)
  "orina_messages_0x8a1f..."            // Wallet B (new)
]
```

✅ **PASS nếu:**
- Có 2 sets of keys (wallet A + wallet B)
- Messages page rỗng hoặc chỉ show default conversations
- Không thấy "Test from Wallet A" message

---

### **Bước 1.5: Verify Isolation**

```bash
1. Vào Messages page
2. Verify: KHÔNG thấy "Test from Wallet A"
3. Send new message: "Test from Wallet B"
```

**Kiểm tra trong Console:**
```javascript
// Compare data giữa 2 wallets:
const walletAKey = Object.keys(localStorage).find(k => k.includes('0x742d35cc') && k.includes('messages'));
const walletBKey = Object.keys(localStorage).find(k => k.includes('0x8a1f') && k.includes('messages'));

if (walletAKey && walletBKey) {
  const walletAData = JSON.parse(localStorage.getItem(walletAKey) || '[]');
  const walletBData = JSON.parse(localStorage.getItem(walletBKey) || '[]');
  
  console.log('👤 Wallet A messages:', walletAData.length);
  console.log('👤 Wallet B messages:', walletBData.length);
  console.log('✅ Data isolated:', walletAData !== walletBData);
}
```

**Expected:**
```
👤 Wallet A messages: 1
👤 Wallet B messages: 1
✅ Data isolated: true
```

✅ **TEST 1 PASS!** Mỗi wallet có data riêng biệt! 🎉

---

## 🔄 **TEST 2: AUTO-MIGRATION**
**Mục đích:** Verify old data được migrate sang format mới tự động

### **Bước 2.1: Tạo Old Legacy Data**

```bash
1. Disconnect wallet (nếu đang connect)
2. Vào Console
```

**Paste vào Console:**
```javascript
// Xóa migration flags (để test lại):
Object.keys(localStorage)
  .filter(k => k.includes('orina_migration_complete'))
  .forEach(k => localStorage.removeItem(k));

// Tạo old-format data (LEGACY):
localStorage.setItem('orina_conversations', JSON.stringify([
  {
    id: 'legacy-1',
    address: '0xLEGACY',
    displayName: 'Legacy Conversation',
    lastMessage: 'This is old data that needs migration',
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
console.log('📦 Legacy keys:', Object.keys(localStorage).filter(k => k.startsWith('orina_') && !k.includes('_0x')));
```

**Expected:**
```
✅ Legacy data created!
📦 Legacy keys: ["orina_conversations", "orina_messages", "orina_favorites"]
```

---

### **Bước 2.2: Connect Wallet để Trigger Migration**

```bash
1. Click "Connect Wallet"
2. Connect với wallet A (0x742d35cc...)
3. Đợi page load xong
```

**QUAN TRỌNG:** Nhìn vào Console ngay!

**Expected Console Output:**
```
[Migration] Starting data migration for address: 0x742d35cc...
[Migration] Checking if migration needed...
[Migration] Migration flag not found, proceeding with migration
[Migration] Migrating conversations...
[Migration] Found 1 legacy conversations
[Migration] Migrated 1 conversations
[Migration] Migrating messages...
[Migration] Found 1 legacy messages
[Migration] Migrated 1 messages
[Migration] Migrating favorites...
[Migration] Found 1 legacy favorites
[Migration] Migrated 1 favorites
[Migration] ✅ Migration complete!
[Migration] Setting migration flag: orina_migration_complete_0x742d35cc...
```

---

### **Bước 2.3: Verify Migrated Data**

**Paste vào Console:**
```javascript
// Kiểm tra new keys được tạo:
const address = '0x742d35cc'; // thay bằng address của bạn
const newKeys = Object.keys(localStorage).filter(k => k.includes(address));
console.log('📦 New Keys after migration:', newKeys);

// Xem chi tiết:
newKeys.forEach(key => {
  const data = localStorage.getItem(key);
  try {
    const parsed = JSON.parse(data);
    console.log(`\n${key}:`, Array.isArray(parsed) ? parsed.length + ' items' : 'object');
  } catch(e) {
    console.log(`\n${key}:`, data);
  }
});
```

**Expected:**
```
📦 New Keys after migration: [
  "orina_conversations_0x742d35cc...",
  "orina_messages_0x742d35cc...",
  "orina_favorites_0x742d35cc...",
  "orina_migration_complete_0x742d35cc..."
]

orina_conversations_0x742d35cc...: 1 items
orina_messages_0x742d35cc...: 1 items
orina_favorites_0x742d35cc...: 1 items
orina_migration_complete_0x742d35cc...: true
```

---

### **Bước 2.4: Verify Migration Chỉ Chạy 1 Lần**

```bash
1. Reload page (F5 hoặc Ctrl+R)
2. Nhìn vào Console
```

**Expected Console Output:**
```
[Migration] Starting data migration for address: 0x742d35cc...
[Migration] Checking if migration needed...
[Migration] ✅ Already migrated, skipping
```

✅ **PASS nếu:**
- Migration KHÔNG chạy lại
- Có message "Already migrated, skipping"

---

### **Bước 2.5: Verify Legacy Data Preserved**

**Paste vào Console:**
```javascript
// Kiểm tra legacy keys vẫn còn:
const legacyKeys = ['orina_conversations', 'orina_messages', 'orina_favorites'];
const preserved = legacyKeys.filter(k => localStorage.getItem(k) !== null);

console.log('📦 Legacy keys preserved:', preserved);
console.log('✅ Backward compatible:', preserved.length === legacyKeys.length);
```

**Expected:**
```
📦 Legacy keys preserved: ["orina_conversations", "orina_messages", "orina_favorites"]
✅ Backward compatible: true
```

✅ **TEST 2 PASS!** Migration hoạt động perfect! 🎉

---

## 🗑️ **TEST 3: PROFILE RESET**
**Mục đích:** Verify reset profile xóa TOÀN BỘ data của user

### **Bước 3.1: Kiểm Tra Data Trước Khi Reset**

```bash
1. Verify wallet đang connected (0x742d35cc...)
2. Verify có data (messages, favorites, etc)
```

**Paste vào Console:**
```javascript
// List tất cả Orina keys:
const allOrinaKeys = Object.keys(localStorage).filter(k => k.includes('orina'));
console.log('📦 Total Orina keys BEFORE reset:', allOrinaKeys.length);
console.log('Keys:', allOrinaKeys);
```

**Expected:**
```
📦 Total Orina keys BEFORE reset: 8-12 (tùy data)
Keys: [
  "orina_conversations_0x742d35cc...",
  "orina_messages_0x742d35cc...",
  "orina_favorites_0x742d35cc...",
  "orina_migration_complete_0x742d35cc...",
  "orina_conversations",
  "orina_messages",
  "orina_favorites",
  ... (có thể nhiều hơn)
]
```

---

### **Bước 3.2: Inspect Data Detail**

```bash
1. Vào Settings page
2. Scroll xuống "Developer Tools" section
3. Click button "Inspect Data"
```

**Expected Console Output:**
```
[Orina Data Inspector] ==================
[Orina Data Inspector] FULL DATA DUMP
[Orina Data Inspector] ==================

[Orina Data Inspector] 📊 ADDRESS-BASED KEYS:
[Orina Data Inspector] ✓ orina_conversations_0x742d35cc... (1 items)
[Orina Data Inspector] ✓ orina_messages_0x742d35cc... (2 items)
[Orina Data Inspector] ✓ orina_favorites_0x742d35cc... (1 items)
...

[Orina Data Inspector] 📊 LEGACY KEYS:
[Orina Data Inspector] ✓ orina_conversations (1 items)
[Orina Data Inspector] ✓ orina_messages (1 items)
...

[Orina Data Inspector] 📊 GLOBAL KEYS:
[Orina Data Inspector] ✓ orina_user_address_to_id (object)
...

[Orina Data Inspector] ==================
[Orina Data Inspector] Total keys found: 12
[Orina Data Inspector] ==================
```

---

### **Bước 3.3: Trigger Reset Profile**

```bash
1. Vẫn ở Settings page
2. Click button "Reset Profile" (màu đỏ)
3. Confirm trong modal (nếu có)
4. QUAN TRỌNG: Nhìn vào Console ngay!
```

**Expected Console Output (rất chi tiết):**
```
[Orina Reset] ==========================================
[Orina Reset] 🧹 STARTING COMPREHENSIVE PROFILE RESET
[Orina Reset] ==========================================
[Orina Reset] Connected address: 0x742d35cc...

[Orina Reset] ==========================================
[Orina Reset] 📋 PHASE 1: Clearing address-based keys
[Orina Reset] ==========================================
[Orina Reset] Scanning for keys with pattern: orina_*_0x742d35cc...
[Orina Reset] 🗑️ Removing: orina_conversations_0x742d35cc...
[Orina Reset] 🗑️ Removing: orina_messages_0x742d35cc...
[Orina Reset] 🗑️ Removing: orina_favorites_0x742d35cc...
[Orina Reset] 🗑️ Removing: orina_watchlist_0x742d35cc...
[Orina Reset] 🗑️ Removing: orina_notifications_0x742d35cc...
[Orina Reset] 🗑️ Removing: orina_notification_prefs_0x742d35cc...
[Orina Reset] 🗑️ Removing: orina_migration_complete_0x742d35cc...
[Orina Reset] ✅ Phase 1 complete: Removed 7 address-based keys

[Orina Reset] ==========================================
[Orina Reset] 📋 PHASE 2: Clearing legacy userId keys
[Orina Reset] ==========================================
[Orina Reset] Looking up userId for address: 0x742d35cc...
[Orina Reset] Found userId: user_current
[Orina Reset] 🗑️ Removing: orina_favorites_user_current
[Orina Reset] ✅ Phase 2 complete: Removed 1 userId-based keys

[Orina Reset] ==========================================
[Orina Reset] 📋 PHASE 3: Cleaning global storage keys
[Orina Reset] ==========================================
[Orina Reset] Checking legacy global keys...
[Orina Reset] 🗑️ Removing: orina_conversations (legacy)
[Orina Reset] 🗑️ Removing: orina_messages (legacy)
[Orina Reset] 🗑️ Removing: orina_favorites (legacy)
[Orina Reset] ✅ Phase 3 complete: Removed 3 legacy keys

[Orina Reset] ==========================================
[Orina Reset] 📋 PHASE 4: Clearing address mappings
[Orina Reset] ==========================================
[Orina Reset] 🗑️ Clearing address → userId mapping for: 0x742d35cc...
[Orina Reset] ✅ Phase 4 complete: Mappings cleared

[Orina Reset] ==========================================
[Orina Reset] 📋 PHASE 5: Wildcard cleanup
[Orina Reset] ==========================================
[Orina Reset] Scanning all localStorage keys for orina_*...
[Orina Reset] Total orina keys remaining: 2
[Orina Reset] ✅ Phase 5 complete: Edge cases handled

[Orina Reset] ==========================================
[Orina Reset] 📋 PHASE 6: Reset avatar generation seed
[Orina Reset] ==========================================
[Orina Reset] 🔄 Resetting avatar for: 0x742d35cc...
[Orina Reset] ✅ Phase 6 complete: Avatar reset

[Orina Reset] ==========================================
[Orina Reset] ✅ PROFILE RESET COMPLETE
[Orina Reset] ==========================================
[Orina Reset] Summary:
[Orina Reset] - Address-based keys removed: 7
[Orina Reset] - UserId-based keys removed: 1
[Orina Reset] - Legacy keys removed: 3
[Orina Reset] - Mappings cleared: Yes
[Orina Reset] - Wildcards cleaned: Yes
[Orina Reset] - Avatar reset: Yes
[Orina Reset] ==========================================
```

**Toast Notification:**
```
✅ Profile reset complete! Page will reload.
```

---

### **Bước 3.4: Verify Data Đã Xóa**

```bash
1. Page sẽ tự động reload
2. Verify bạn vẫn connected với wallet
```

**Paste vào Console:**
```javascript
// Kiểm tra lại Orina keys:
const remainingKeys = Object.keys(localStorage).filter(k => k.includes('orina'));
console.log('📦 Remaining Orina keys AFTER reset:', remainingKeys.length);
console.log('Keys:', remainingKeys);
```

**Expected:**
```
📦 Remaining Orina keys AFTER reset: 0-2
Keys: [] // hoặc chỉ có system keys (không liên quan user data)
```

---

### **Bước 3.5: Verify Fresh Start**

```bash
1. Vào Messages page
2. Verify: CHỈ thấy default conversations (không có user data)
3. Vào Profile page
4. Verify: Fresh profile (không có favorites)
```

**Paste vào Console:**
```javascript
// Verify no user data:
const address = '0x742d35cc'; // your address
const userKeys = Object.keys(localStorage).filter(k => k.includes(address));
console.log('👤 User-specific keys:', userKeys);
console.log('✅ Fresh start:', userKeys.length === 0);
```

**Expected:**
```
👤 User-specific keys: []
✅ Fresh start: true
```

✅ **TEST 3 PASS!** Reset profile hoạt động hoàn hảo! 🎉

---

## 💬 **TEST 4: MESSAGING SYSTEM**
**Mục đích:** Verify messaging sử dụng address-based storage

### **Bước 4.1: Send New Message**

```bash
1. Verify wallet connected (0x742d35cc...)
2. Vào Messages page
3. Click vào "Whale Collector" conversation
4. Type: "Testing address-based storage"
5. Click Send
6. Verify message appears
```

---

### **Bước 4.2: Verify Storage Keys**

**Paste vào Console:**
```javascript
// Check message storage:
const address = '0x742d35cc'; // your address
const conversationsKey = `orina_conversations_${address}`;
const messagesKey = `orina_messages_${address}`;

console.log('📦 Conversations key exists:', localStorage.getItem(conversationsKey) !== null);
console.log('📦 Messages key exists:', localStorage.getItem(messagesKey) !== null);

// Show content:
if (localStorage.getItem(conversationsKey)) {
  const conversations = JSON.parse(localStorage.getItem(conversationsKey));
  console.log('💬 Conversations:', conversations.length);
}

if (localStorage.getItem(messagesKey)) {
  const messages = JSON.parse(localStorage.getItem(messagesKey));
  console.log('💬 Messages:', messages.length);
  console.log('Latest:', messages[messages.length - 1]?.text);
}
```

**Expected:**
```
📦 Conversations key exists: true
📦 Messages key exists: true
💬 Conversations: 1
💬 Messages: 1
Latest: "Testing address-based storage"
```

---

### **Bước 4.3: Test Quick Message Modal**

```bash
1. Vào Dashboard hoặc Discover page
2. Click vào một asset card
3. Click "Quick Message" button (nếu có)
4. Type: "Quick message test"
5. Send
6. Verify redirect to Messages page
7. Verify message appears
```

**Paste vào Console:**
```javascript
// Verify message saved:
const address = '0x742d35cc';
const messagesKey = `orina_messages_${address}`;
const messages = JSON.parse(localStorage.getItem(messagesKey) || '[]');

const quickMessage = messages.find(m => m.text.includes('Quick message test'));
console.log('✅ Quick message saved:', !!quickMessage);
```

**Expected:**
```
✅ Quick message saved: true
```

✅ **TEST 4 PASS!** Messaging system works! 🎉

---

## 🔔 **TEST 5: NOTIFICATIONS**
**Mục đích:** Verify notifications sử dụng address-based storage

### **Bước 5.1: Trigger Test Notification**

```bash
1. Vào Settings page
2. Tìm "Notification Settings" section
3. Click "Test Notification" button (nếu có)

# Hoặc trigger qua Console:
```

**Paste vào Console:**
```javascript
// Trigger test notification manually:
window.dispatchEvent(new CustomEvent('orina-notification', {
  detail: {
    type: 'success',
    title: 'Test Notification',
    message: 'This is a test notification for Phase 1'
  }
}));

console.log('✅ Test notification triggered');
```

---

### **Bước 5.2: Verify Storage**

**Paste vào Console:**
```javascript
// Check notification storage:
const address = '0x742d35cc'; // your address
const notificationsKey = `orina_notifications_${address}`;
const prefsKey = `orina_notification_prefs_${address}`;

console.log('📦 Notifications key:', localStorage.getItem(notificationsKey) !== null);
console.log('📦 Preferences key:', localStorage.getItem(prefsKey) !== null);

// Show notifications:
if (localStorage.getItem(notificationsKey)) {
  const notifications = JSON.parse(localStorage.getItem(notificationsKey));
  console.log('🔔 Notifications:', notifications.length);
  console.log('Latest:', notifications[0]);
}
```

**Expected:**
```
📦 Notifications key: true
📦 Preferences key: true
🔔 Notifications: 1
Latest: { type: "success", title: "Test Notification", ... }
```

---

### **Bước 5.3: Test Notification Preferences**

```bash
1. Vào Settings → Notifications
2. Toggle "Enable Desktop Notifications"
3. Toggle "Enable Sound"
4. Save preferences
```

**Paste vào Console:**
```javascript
// Verify preferences saved:
const address = '0x742d35cc';
const prefsKey = `orina_notification_prefs_${address}`;
const prefs = JSON.parse(localStorage.getItem(prefsKey) || '{}');

console.log('⚙️ Preferences:', prefs);
console.log('✅ Saved to correct key:', prefsKey);
```

**Expected:**
```
⚙️ Preferences: {
  enableDesktop: true,
  enableSound: false,
  enableToasts: true,
  types: { order: true, message: true, system: true }
}
✅ Saved to correct key: orina_notification_prefs_0x742d35cc...
```

✅ **TEST 5 PASS!** Notifications work! 🎉

---

## ❤️ **TEST 6: FAVORITES**
**Mục đích:** Verify favorites sử dụng address-based storage

### **Bước 6.1: Add Favorite**

```bash
1. Vào Profile → Favorites tab
2. Hoặc vào Dashboard và click heart icon trên asset
3. Add một asset vào favorites
```

**Paste vào Console để test:**
```javascript
// Manually add favorite:
const address = '0x742d35cc'; // your address
const favoritesKey = `orina_favorites_${address}`;

const favorites = JSON.parse(localStorage.getItem(favoritesKey) || '[]');
favorites.push({
  assetId: 'test-asset-123',
  addedAt: new Date().toISOString()
});

localStorage.setItem(favoritesKey, JSON.stringify(favorites));
console.log('✅ Favorite added to:', favoritesKey);
```

---

### **Bước 6.2: Verify Storage**

**Paste vào Console:**
```javascript
// Check favorites storage:
const address = '0x742d35cc';
const favoritesKey = `orina_favorites_${address}`;

const favorites = JSON.parse(localStorage.getItem(favoritesKey) || '[]');
console.log('❤️ Favorites:', favorites.length);
console.log('Assets:', favorites.map(f => f.assetId));
```

**Expected:**
```
❤️ Favorites: 1
Assets: ["test-asset-123"]
```

---

### **Bước 6.3: Remove Favorite**

```bash
1. Vào Profile → Favorites tab
2. Click heart icon để remove
3. Verify asset removed
```

**Paste vào Console:**
```javascript
// Verify removed:
const address = '0x742d35cc';
const favoritesKey = `orina_favorites_${address}`;
const favorites = JSON.parse(localStorage.getItem(favoritesKey) || '[]');

console.log('❤️ Favorites after removal:', favorites.length);
```

✅ **TEST 6 PASS!** Favorites work! 🎉

---

## 🔧 **TROUBLESHOOTING**

### **❌ Problem: Migration không chạy**

**Symptoms:**
- Không thấy migration logs trong console
- Old data không được copy sang new keys

**Solutions:**
```javascript
// 1. Check migration flag:
const address = '0x742d35cc'; // your address
const flag = localStorage.getItem(`orina_migration_complete_${address}`);
console.log('Migration flag:', flag);

// 2. Force re-run migration:
localStorage.removeItem(`orina_migration_complete_${address}`);
location.reload();

// 3. Check if old data exists:
console.log('Old conversations:', localStorage.getItem('orina_conversations'));
console.log('Old messages:', localStorage.getItem('orina_messages'));
```

---

### **❌ Problem: Reset không xóa hết data**

**Symptoms:**
- Sau reset vẫn còn một số keys
- Data vẫn hiển thị sau reload

**Solutions:**
```javascript
// 1. Manual cleanup:
Object.keys(localStorage)
  .filter(k => k.includes('orina'))
  .forEach(k => {
    console.log('Removing:', k);
    localStorage.removeItem(k);
  });

// 2. Verify cleanup:
console.log('Remaining keys:', 
  Object.keys(localStorage).filter(k => k.includes('orina'))
);

// 3. Hard reload:
location.reload(true); // Ctrl+Shift+R
```

---

### **❌ Problem: Data không load**

**Symptoms:**
- Messages page rỗng
- Favorites không hiển thị
- Console có errors

**Solutions:**
```javascript
// 1. Check wallet connected:
console.log('Wallet connected:', /* check wallet button UI */);

// 2. Check address format:
const address = '0x742d35cc...'; // your address
console.log('Address valid:', address.startsWith('0x') && address.length === 42);

// 3. Check keys exist:
const conversationsKey = `orina_conversations_${address}`;
console.log('Key exists:', localStorage.getItem(conversationsKey) !== null);

// 4. Check data format:
try {
  const data = JSON.parse(localStorage.getItem(conversationsKey));
  console.log('Data valid:', Array.isArray(data));
} catch(e) {
  console.error('Invalid JSON:', e);
}
```

---

### **❌ Problem: TypeScript errors**

**Symptoms:**
- Red underlines trong code
- Build fails
- "address is possibly undefined" errors

**Solutions:**
```typescript
// Add safety checks:
const { address } = useAccount();

if (!address) {
  return null; // or show "Connect wallet" message
}

// Use address safely:
const conversations = loadConversations(address);
```

---

### **❌ Problem: Console đầy errors**

**Symptoms:**
- Nhiều red errors trong console
- App không hoạt động

**Solutions:**
```javascript
// 1. Clear console:
console.clear();

// 2. Reload page:
location.reload();

// 3. Clear all Orina data và start fresh:
Object.keys(localStorage)
  .filter(k => k.includes('orina'))
  .forEach(k => localStorage.removeItem(k));
location.reload();

// 4. Check browser console settings:
// - Disable "Preserve log"
// - Enable "Show timestamps"
```

---

## ✅ **TEST COMPLETION CHECKLIST**

Copy vào notes để track:

```
[ ] Test 1: Data Isolation
    [ ] 1.1 Connect Wallet A
    [ ] 1.2 Create test data
    [ ] 1.3 Disconnect Wallet A
    [ ] 1.4 Connect Wallet B
    [ ] 1.5 Verify isolation

[ ] Test 2: Auto-Migration
    [ ] 2.1 Create legacy data
    [ ] 2.2 Trigger migration
    [ ] 2.3 Verify migrated data
    [ ] 2.4 Verify one-time run
    [ ] 2.5 Verify legacy preserved

[ ] Test 3: Profile Reset
    [ ] 3.1 Check data before
    [ ] 3.2 Inspect data detail
    [ ] 3.3 Trigger reset
    [ ] 3.4 Verify data deleted
    [ ] 3.5 Verify fresh start

[ ] Test 4: Messaging System
    [ ] 4.1 Send new message
    [ ] 4.2 Verify storage keys
    [ ] 4.3 Test quick message

[ ] Test 5: Notifications
    [ ] 5.1 Trigger notification
    [ ] 5.2 Verify storage
    [ ] 5.3 Test preferences

[ ] Test 6: Favorites
    [ ] 6.1 Add favorite
    [ ] 6.2 Verify storage
    [ ] 6.3 Remove favorite

[ ] Troubleshooting tested (if issues arise)
[ ] All tests passed
[ ] Ready for deployment
```

---

## 📊 **TEST RESULTS TEMPLATE**

Copy và điền vào:

```
=================================
PHASE 1 TEST RESULTS
=================================
Date: [DATE]
Tester: [YOUR NAME]
Environment: [Local/Staging/Production]
Browser: [Chrome/Firefox/Brave]

TEST 1: DATA ISOLATION
Status: [ ] PASS [ ] FAIL
Notes: 

TEST 2: AUTO-MIGRATION
Status: [ ] PASS [ ] FAIL
Notes: 

TEST 3: PROFILE RESET
Status: [ ] PASS [ ] FAIL
Notes: 

TEST 4: MESSAGING SYSTEM
Status: [ ] PASS [ ] FAIL
Notes: 

TEST 5: NOTIFICATIONS
Status: [ ] PASS [ ] FAIL
Notes: 

TEST 6: FAVORITES
Status: [ ] PASS [ ] FAIL
Notes: 

OVERALL STATUS: [ ] ALL PASS [ ] SOME FAIL
Recommendation: [ ] DEPLOY [ ] FIX ISSUES [ ] RETEST

ISSUES FOUND:
1. 
2. 
3. 

=================================
```

---

## 🎉 **CONGRATULATIONS!**

Nếu tất cả 6 tests đều PASS:

✅ **Phase 1 is PRODUCTION READY!** 🚀

Bạn có thể:
1. Deploy lên staging/production
2. Monitor logs trong production
3. Proceed to Phase 2

---

**Questions? Issues? Check:**
- `/docs/PHASE_1_FINAL_SUMMARY.md` - Complete overview
- `/docs/PHASE_1_COMPLETE.md` - Implementation details
- Console logs - Detailed debugging info

**Happy Testing!** 🧪✨

---

*Testing Guide - Phase 1 - Version 1.0 - 2026-02-11*
