/**
 * Reset Profile Utility (PHASE 1 UPDATED)
 * Clears all profile-related data for a specific wallet address
 * 
 * ✅ REBUILT: Address-based only, no userId concept
 */

import { generateRandomAvatarSeed } from './avatarUtils';
import { APIKeyManager } from './apiKeyManager';
import { clearAllConversations } from './conversationUtils';

/**
 * Reset all profile data for a wallet address
 * This includes:
 * - User profile
 * - Activities
 * - Favorites & Watchlist (NEW: address-based)
 * - Conversations & Messages (NEW: address-based)
 * - Notifications (NEW: address-based)
 * - API Keys and pending operations
 * - All other user-related data
 * - Generate new random avatar seed
 */
export function resetProfileForAddress(address: string): void {
  console.log(`[Orina Reset] ════════════════════════════════════`);
  console.log(`[Orina Reset] Starting cleanup for wallet: ${address}`);
  console.log(`[Orina Reset] ════════════════════════════════════`);
  
  // Normalize address
  const addressLower = address.toLowerCase();
  
  // 🔍 DEBUG: List all API-related keys BEFORE reset
  console.log(`[Orina Reset] 🔍 API Keys in localStorage BEFORE reset:`);
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('api') || key.includes('API'))) {
      console.log(`[Orina Reset]   - ${key}`);
    }
  }
  
  // ═══════════════════════════════════════════════════════
  // PHASE 1: Clear NEW address-based keys
  // ═══════════════════════════════════════════════════════
  
  console.log(`\n[Orina Reset] 🔄 PHASE 1: Clearing address-based storage...`);
  
  const addressBasedKeys = [
    // Conversations & Messages
    `orina_conversations_${addressLower}`,
    `orina_messages_${addressLower}`,
    
    // Favorites & Watchlist
    `orina_favorites_${addressLower}`,
    `orina_watchlist_${addressLower}`,
    `orina_watchlist_alerts_${addressLower}`,
    
    // Notifications
    `orina_notifications_${addressLower}`,
    `orina_notification_prefs_${addressLower}`,
    
    // API Keys
    `orina_api_keys_${addressLower}`,
    `orina_api_pending_ops_${addressLower}`,
    
    // Avatar
    `orina_avatar_seed_${addressLower}`,
    
    // Migration flag
    `orina_migration_complete_${addressLower}`,
  ];
  
  addressBasedKeys.forEach(key => {
    const exists = localStorage.getItem(key);
    if (exists) {
      localStorage.removeItem(key);
      console.log(`[Orina Reset] ✓ Removed: ${key}`);
    }
  });
  
  // Also use the utility function to clear conversations
  clearAllConversations(address);
  
  // Clear API keys using the manager (handles both formats)
  APIKeyManager.clearAllKeysForWallet(address);
  console.log(`[Orina Reset] ✓ Cleared API keys via APIKeyManager`);
  
  // ═══════════════════════════════════════════════════════
  // PHASE 2: Clear LEGACY storage
  // ═══════════════════════════════════════════════════════
  
  console.log(`\n[Orina Reset] 🔄 PHASE 2: Clearing legacy storage...`);
  
  // ✅ REBUILT: Clean up old userId-based keys (no longer need getUserIdFromAddress)
  // Just remove the old mapping table since we're address-based now
  console.log(`[Orina Reset] Removing old address-to-userId mapping...`);
  localStorage.removeItem('studio_address_to_userid');
  
  // Clean up any orphaned userId-based profiles (studio_user_profile_user_*)
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('studio_user_profile_user_')) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    console.log(`[Orina Reset] ✓ Removed old profile: ${key}`);
  });
  
  // ═══════════════════════════════════════════════════════
  // PHASE 3: Clean from GLOBAL keys (if data exists)
  // ═══════════════════════════════════════════════════════
  
  console.log(`\n[Orina Reset] 🔄 PHASE 3: Cleaning from global storage...`);
  
  // Clean from global conversations
  cleanFromGlobalKey('orina_conversations', (item: any) => 
    item.address?.toLowerCase() !== addressLower
  );
  
  // Clean from global messages
  cleanFromGlobalKey('orina_messages', (item: any) => 
    item.userAddress?.toLowerCase() !== addressLower
  );
  
  // Clean from global favorites (legacy cleanup - address-based for now)
  cleanFromGlobalKey('studio_favorites', (item: any) => 
    item.userAddress?.toLowerCase() !== addressLower
  );
  
  // Clean from global watchlist (legacy cleanup)
  cleanFromGlobalKey('studio_watchlist', (item: any) => 
    item.userAddress?.toLowerCase() !== addressLower
  );
  
  // Clean from global watchlist alerts (legacy cleanup)
  cleanFromGlobalKey('studio_watchlist_alerts', (item: any) => 
    item.userAddress?.toLowerCase() !== addressLower
  );
  
  // Clean from global notifications (legacy cleanup)
  cleanFromGlobalKey('studio_notifications', (item: any) => 
    item.userAddress?.toLowerCase() !== addressLower
  );
  
  // ═══════════════════════════════════════════════════════
  // PHASE 4: Clear address mapping & global data
  // ═══════════════════════════════════════════════════════
  
  console.log(`\n[Orina Reset] 🔄 PHASE 4: Clearing mappings & global data...`);
  
  // Clear UserContext data
  localStorage.removeItem('orina_user_data');
  console.log(`[Orina Reset] ✓ Cleared UserContext data`);
  
  // ═══════════════════════════════════════════════════════
  // PHASE 5: Wildcard cleanup for any remaining keys
  // ═══════════════════════════════════════════════════════
  
  console.log(`\n[Orina Reset] 🔄 PHASE 5: Wildcard cleanup...`);
  
  const wildcardKeys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (
      key.includes(addressLower) ||
      key.startsWith('orina_community_user_actions') ||
      key.startsWith('orina_ai_agent_') ||
      key.startsWith('orina_ipfs_')
    )) {
      wildcardKeys.push(key);
    }
  }
  
  wildcardKeys.forEach(key => {
    localStorage.removeItem(key);
    console.log(`[Orina Reset] ✓ Removed (wildcard): ${key}`);
  });
  
  // ═══════════════════════════════════════════════════════
  // PHASE 6: Generate new avatar & validation
  // ═══════════════════════════════════════════════════════
  
  console.log(`\n[Orina Reset] 🔄 PHASE 6: Finalizing...`);
  
  // Generate NEW random avatar seed
  generateRandomAvatarSeed(address);
  console.log(`[Orina Reset] ✓ Generated new random avatar seed`);
  
  // 🔍 DEBUG: List all API-related keys AFTER reset
  console.log(`\n[Orina Reset] 🔍 API Keys in localStorage AFTER reset:`);
  let remainingApiKeys = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('api') || key.includes('API'))) {
      console.log(`[Orina Reset]   - ${key} ⚠️ STILL EXISTS!`);
      remainingApiKeys++;
    }
  }
  if (remainingApiKeys === 0) {
    console.log(`[Orina Reset]   ✅ No API keys remaining!`);
  }
  
  // Final validation
  console.log(`\n[Orina Reset] 🔍 Final validation - checking for ${addressLower} in storage:`);
  let remainingKeys = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.includes(addressLower)) {
      console.log(`[Orina Reset]   - ${key} ⚠️ STILL EXISTS!`);
      remainingKeys++;
    }
  }
  if (remainingKeys === 0) {
    console.log(`[Orina Reset]   ✅ No address-specific keys remaining!`);
  }
  
  console.log(`\n[Orina Reset] ════════════════════════════════════`);
  console.log(`[Orina Reset] ✅ Profile reset complete for ${address}`);
  console.log(`[Orina Reset] ✅ Cleared: ${addressBasedKeys.length + wildcardKeys.length + 6} keys`);
  console.log(`[Orina Reset] ════════════════════════════════════\n`);
}

/**
 * Helper function to clean user data from global storage keys
 * @param storageKey - The global storage key
 * @param filterFn - Function that returns true to KEEP the item
 */
function cleanFromGlobalKey(storageKey: string, filterFn: (item: any) => boolean): void {
  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return;
    
    const allItems = JSON.parse(stored);
    const filtered = allItems.filter(filterFn);
    
    if (filtered.length === 0) {
      localStorage.removeItem(storageKey);
      console.log(`[Orina Reset] ✓ Removed empty global key: ${storageKey}`);
    } else if (filtered.length < allItems.length) {
      localStorage.setItem(storageKey, JSON.stringify(filtered));
      console.log(`[Orina Reset] ✓ Cleaned ${allItems.length - filtered.length} items from: ${storageKey}`);
    }
  } catch (error) {
    console.error(`[Orina Reset] Error cleaning ${storageKey}:`, error);
  }
}

/**
 * Reset all profile data in the entire app (nuclear option)
 */
export function resetAllProfiles(): void {
  console.log('[Orina Reset] ⚠️ Starting NUCLEAR RESET - clearing ALL profile data');
  
  const keysToRemove: string[] = [];
  
  // Find all profile-related keys
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (
      // Legacy patterns
      key.startsWith('studio_user_profile_') ||
      key.startsWith('studio_user_activities_') ||
      key.startsWith('studio_favorites') ||
      key.startsWith('studio_watchlist') ||
      key.startsWith('studio_price_alerts_') ||
      key === 'studio_address_to_userid' ||
      // New address-based patterns
      key.startsWith('orina_profile_') ||
      key.startsWith('orina_conversations_') ||
      key.startsWith('orina_messages_') ||
      key.startsWith('orina_favorites_') ||
      key.startsWith('orina_watchlist_') ||
      key.startsWith('orina_notifications_') ||
      key.startsWith('orina_api_keys_') ||
      key.startsWith('orina_migration_complete_')
    )) {
      keysToRemove.push(key);
    }
  }
  
  // Remove all found keys
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    console.log(`[Orina Reset] ✓ Removed: ${key}`);
  });
  
  console.log(`[Orina Reset] ✅ Nuclear reset complete - removed ${keysToRemove.length} items`);
}