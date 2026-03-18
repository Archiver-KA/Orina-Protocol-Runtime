/**
 * Hook to initialize user data when wallet connects
 * ✅ PHASE 1: Now includes auto-migration for address-based storage
 */

import { useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useUser } from '@/contexts/UserContext';
import { getAvatarTypeForAddress, getDefaultUsername } from '@/utils/avatarUtils';
import {
  forceHydrateProfileFromSupabase,
  loadUserProfile,
  loadUserProfileLocalOnlySnapshot,
  shortenUserDisplayName,
} from '@/utils/profileUtils';
import { migrateConversationsToAddressBased } from '@/utils/conversationUtils';
import { migrateFavoritesToAddressBased } from '@/utils/favoritesUtils';
import { migrateNotificationsToAddressBased } from '@/utils/notifications';

export function useUserInitialization() {
  const { address, isConnected } = useAccount();
  const { userData, updateUserData } = useUser();
  
  // Track if we've already initialized this address to prevent loops
  const initializedAddress = useRef<string | null>(null);

  useEffect(() => {
    // Handle wallet disconnect - active session state is cleared elsewhere; reset init marker here
    if (!isConnected && userData.address) {
      console.log(`[Orina] Wallet disconnected, resetting initialization state`);
      initializedAddress.current = null; // Reset on disconnect
      // Don't clear anything - keep address for profile lookup on reconnect
      return;
    }

    // Handle wallet connect - initialize userData after wallet permission connect.
    // Auth signature is deferred for protocol interactions, so social/profile UI should hydrate now.
    if (isConnected && address) {
      // Skip if we've already initialized this address
      if (initializedAddress.current === address.toLowerCase()) {
        return;
      }
      
      // Check if this is the same wallet as before
      const isSameWallet = userData.address?.toLowerCase() === address.toLowerCase();
      
      if (!isSameWallet) {
        // Different wallet or first connection
        let hasExistingProfile = false;
        
        console.log(`[Orina] Checking for existing profile...`);
        
        // PRIORITY 1: Check Profile System (studio_user_profile_${userId})
        const savedProfile = loadUserProfileLocalOnlySnapshot(address);
        if (savedProfile) {
          hasExistingProfile = true;
          const avatarType = getAvatarTypeForAddress(address);
          
          updateUserData({
            address,
            avatarType,
            displayName: savedProfile.displayName,
            username: savedProfile.username,
            avatarUrl: savedProfile.avatar,
            bannerUrl: savedProfile.banner,
            bio: savedProfile.bio,
            twitter: savedProfile.socialLinks?.twitter,
            website: savedProfile.socialLinks?.website,
          });
          
          console.log(`[Orina] ✅ Loaded profile from Profile System`);
          console.log(`[Orina] Display name: ${savedProfile.displayName || savedProfile.username}`);
          console.log(`[Orina] Avatar URL: ${savedProfile.avatar || 'default'}`);
        }
        
        // PRIORITY 2: Fallback to UserContext localStorage (orina_user_data)
        if (!hasExistingProfile) {
          const savedData = localStorage.getItem('orina_user_data');
          
          if (savedData) {
            try {
              const parsed = JSON.parse(savedData);
              console.log(`[Orina] Parsed UserContext data:`, parsed);
              
              // Check if saved data is for this address
              if (parsed.address && parsed.address.toLowerCase() === address.toLowerCase()) {
                hasExistingProfile = true;
                // Update address to ensure it's set correctly after reconnect
                updateUserData({ ...parsed, address });
                console.log(`[Orina] ✅ Loaded profile from UserContext`);
                console.log(`[Orina] Display name: ${parsed.displayName || parsed.username}`);
              }
            } catch (e) {
              console.error('[Orina] Failed to parse saved user data:', e);
            }
          }
        }
        
        // PRIORITY 3: Create default profile if no existing profile found
        if (!hasExistingProfile) {
          const avatarType = getAvatarTypeForAddress(address);
          const defaultUsername = getDefaultUsername(address);
          const defaultDisplayName = shortenUserDisplayName(address);
          
          updateUserData({
            address,
            avatarType,
            username: defaultUsername,
            displayName: defaultDisplayName,
            // Keep other fields undefined until user sets them
          });
          
          console.log(`[Orina] 🆕 Initialized new user: ${address}`);
          console.log(`[Orina] Default avatar: ${avatarType}`);
          console.log(`[Orina] Default username: ${defaultUsername}`);
          console.log(`[Orina] Default display name: ${defaultDisplayName}`);
        }
        
        // Mark this address as initialized
        initializedAddress.current = address.toLowerCase();
        
        // ═══════════════════════════════════════════════════════
        // 🔄 PHASE 1: AUTO-MIGRATION to address-based storage
        // ═══════════════════════════════════════════════════════
        runDataMigration(address);
      } else if (!userData.avatarType) {
        // Same wallet but missing avatarType - add it
        const avatarType = getAvatarTypeForAddress(address);
        updateUserData({ avatarType });
        console.log(`[Orina] Added missing avatarType: ${avatarType}`);
        
        // Mark as initialized
        initializedAddress.current = address.toLowerCase();
        
        // Also run migration for existing user
        runDataMigration(address);
      } else {
        // Same wallet and has all data - mark as initialized
        initializedAddress.current = address.toLowerCase();
        
        // Still run migration check in case it hasn't been done yet
        runDataMigration(address);
      }

      void forceHydrateProfileFromSupabase(address).then(() => {
        const hydratedProfile = loadUserProfile(address);
        if (!hydratedProfile) return;

        const avatarType = getAvatarTypeForAddress(address);
        updateUserData({
          address,
          avatarType,
          displayName: hydratedProfile.displayName,
          username: hydratedProfile.username,
          avatarUrl: hydratedProfile.avatarUrl || hydratedProfile.avatar,
          bannerUrl: hydratedProfile.bannerUrl || hydratedProfile.banner,
          bio: hydratedProfile.bio,
          twitter: hydratedProfile.socialLinks?.twitter,
          website: hydratedProfile.socialLinks?.website,
        });
      }).catch((error) => {
        console.debug('[Orina] Profile hydrate on connect skipped:', error);
      });
    }
  }, [address, isConnected]);
  // ✅ ONLY depend on address and isConnected from wagmi
  // ❌ DO NOT add userData or updateUserData to dependencies - causes infinite loop!
}

/**
 * Run data migration from legacy storage to address-based storage
 * This is called automatically on user initialization
 */
function runDataMigration(address: string) {
  // Check if migration already completed
  const migrationKey = `orina_migration_complete_${address.toLowerCase()}`;
  const migrationDone = localStorage.getItem(migrationKey);
  
  if (migrationDone === 'true') {
    console.log(`[Migration] ✅ Already migrated for ${address}`);
    return;
  }
  
  console.log(`[Migration] 🔄 Starting data migration for ${address}...`);
  
  try {
    // Migrate conversations
    migrateConversationsToAddressBased(address);
    
    // ✅ PHASE 1: Migrate favorites (no userId needed - address-based only)
    migrateFavoritesToAddressBased(address);
    
    // ✅ PHASE 1: Migrate notifications (no userId needed - address-based only)
    migrateNotificationsToAddressBased(address);
    
    // Mark migration as complete
    localStorage.setItem(migrationKey, 'true');
    
    console.log(`[Migration] ✅ Migration complete for ${address}`);
  } catch (error) {
    console.error(`[Migration] ❌ Migration failed for ${address}:`, error);
  }
}
