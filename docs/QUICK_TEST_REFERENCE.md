# 🎯 QUICK TEST REFERENCE CARD

**Print this for quick testing!**

---

## ⚡ SUPER QUICK TEST (5 phút)

### **Setup:**
```bash
1. Mở DevTools (F12)
2. Vào tab Console
3. Connect wallet
```

### **Test Commands:**
```javascript
// 1. Verify address-based storage
Object.keys(localStorage).filter(k => k.includes('orina_') && k.includes('0x'))

// 2. Check current address
console.log('Address:', /* see wallet button */)

// 3. Trigger test notification
window.dispatchEvent(new CustomEvent('orina-notification', {
  detail: { type: 'success', title: 'Test', message: 'Works!' }
}))

// 4. Inspect all data
console.log('Keys:', Object.keys(localStorage).filter(k => k.includes('orina')))

// 5. Count user keys
Object.keys(localStorage).filter(k => k.includes('0x742d')).length
```

### **Quick Checks:**
- [ ] Wallet connected? ✅
- [ ] Console shows address? ✅
- [ ] Storage keys have `0x` address? ✅
- [ ] Messages work? ✅
- [ ] Reset works? ✅

---

## 🧪 ESSENTIAL CONSOLE COMMANDS

### **Check Migration Status:**
```javascript
const addr = '0x742d35cc'; // your address
console.log('Migrated?', !!localStorage.getItem(`orina_migration_complete_${addr}`))
```

### **Force Re-Migration:**
```javascript
localStorage.removeItem(`orina_migration_complete_0x742d35cc`)
location.reload()
```

### **List All User Data:**
```javascript
Object.keys(localStorage)
  .filter(k => k.includes('orina_') && k.includes('0x742d'))
  .forEach(k => console.log(k))
```

### **Count Items:**
```javascript
const addr = '0x742d35cc'
const convs = JSON.parse(localStorage.getItem(`orina_conversations_${addr}`) || '[]')
const msgs = JSON.parse(localStorage.getItem(`orina_messages_${addr}`) || '[]')
console.log('Conversations:', convs.length, 'Messages:', msgs.length)
```

### **Nuclear Reset:**
```javascript
Object.keys(localStorage).filter(k => k.includes('orina')).forEach(k => localStorage.removeItem(k))
location.reload()
```

---

## 📋 TESTING CHECKLIST

```
Quick Test (5 min):
[ ] Connect wallet → See address in storage keys
[ ] Send message → Check orina_messages_0x...
[ ] Click reset → Console shows 6 phases
[ ] Reload → Fresh start

Full Test (30 min):
[ ] Test 1: Data Isolation (2 wallets)
[ ] Test 2: Auto-Migration (legacy data)
[ ] Test 3: Profile Reset (full cleanup)
[ ] Test 4: Messaging (send/receive)
[ ] Test 5: Notifications (trigger/save)
[ ] Test 6: Favorites (add/remove)
```

---

## 🚨 COMMON ISSUES & FIXES

| Issue | Quick Fix |
|-------|-----------|
| Migration not running | `localStorage.removeItem('orina_migration_complete_0x...')` |
| Data not loading | Check wallet connected + hard reload |
| Reset incomplete | Run nuclear reset command above |
| Old data showing | Check migration flag exists |
| Console errors | Clear console + reload |

---

## ✅ PASS CRITERIA

**All must be true:**
- ✅ Storage keys contain `0x` address
- ✅ Different wallets = different data
- ✅ Reset removes ALL keys
- ✅ Migration logs appear once
- ✅ Console has no errors
- ✅ Messages persist after reload

---

## 🎯 EXPECTED CONSOLE LOGS

### On Connect:
```
[Migration] Starting data migration...
[Migration] ✅ Already migrated, skipping
```

### On Reset:
```
[Orina Reset] 🧹 STARTING COMPREHENSIVE PROFILE RESET
...
[Orina Reset] ✅ PROFILE RESET COMPLETE
```

### On Message Send:
```
(no errors)
```

---

## 📊 QUICK INSPECT

**Paste this mega command:**
```javascript
console.log('='.repeat(50))
console.log('🔍 ORINA DATA INSPECTOR')
console.log('='.repeat(50))
const addr = '0x742d35cc' // YOUR ADDRESS
const keys = Object.keys(localStorage).filter(k => k.includes('orina'))
console.log('Total keys:', keys.length)
console.log('\nAddress-based keys:')
keys.filter(k => k.includes(addr)).forEach(k => {
  const data = localStorage.getItem(k)
  try {
    const parsed = JSON.parse(data)
    console.log(`✓ ${k}: ${Array.isArray(parsed) ? parsed.length + ' items' : 'object'}`)
  } catch(e) {
    console.log(`✓ ${k}: ${data}`)
  }
})
console.log('\nLegacy keys:')
keys.filter(k => !k.includes('0x')).forEach(k => console.log(`✓ ${k}`))
console.log('='.repeat(50))
```

---

## 🎉 SUCCESS MESSAGE

**When all tests pass:**
```
✅ All Tests PASSED!
✅ Phase 1 READY FOR PRODUCTION!
✅ Deploy with confidence! 🚀
```

---

**Keep this card handy while testing!** 📌

*Quick Reference - Phase 1 - v1.0*
