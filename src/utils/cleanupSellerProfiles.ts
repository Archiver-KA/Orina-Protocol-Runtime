/**
 * 🧹 COMPREHENSIVE CLEANUP UTILITY
 * Clean ALL old/stale seller profile data from localStorage
 * 
 * Run this on app startup or before rendering SellerProfile
 */

export interface CleanupReport {
  totalCleaned: number;
  categoriesFound: {
    cyberArtist: number;
    fallbackBio: number;
    invalidData: number;
    mockData: number;
  };
  keysRemoved: string[];
}

/**
 * Clean ALL stale seller profiles from localStorage
 */
export function cleanupAllStaleSellerProfiles(): CleanupReport {
  console.log('🧹 [Cleanup] Starting comprehensive seller profile cleanup...');
  
  const report: CleanupReport = {
    totalCleaned: 0,
    categoriesFound: {
      cyberArtist: 0,
      fallbackBio: 0,
      invalidData: 0,
      mockData: 0,
    },
    keysRemoved: [],
  };
  
  try {
    const allKeys = Object.keys(localStorage);
    
    allKeys.forEach(key => {
      // ✅ Check all profile-related keys
      if (key.startsWith('user_profile_') || 
          key.startsWith('studio_user_profile_') ||
          key.startsWith('orina_profile_')) {
        
        try {
          const profileData = localStorage.getItem(key);
          if (!profileData) return;
          
          const profile = JSON.parse(profileData);
          let shouldDelete = false;
          let reason = '';
          
          // 🧹 CATEGORY 1: CyberArtist mock data
          if (profile.displayName === 'CyberArtist' || 
              profile.username === 'cyber_artist_pro' ||
              (profile.socialLinks && profile.socialLinks.website === 'https://cyberartist.studio')) {
            shouldDelete = true;
            reason = 'CyberArtist mock';
            report.categoriesFound.cyberArtist++;
          }
          
          // 🧹 CATEGORY 2: Fallback bio (incomplete/stale data)
          if (profile.bio === 'Community Member on Orina platform') {
            shouldDelete = true;
            reason = 'Fallback bio';
            report.categoriesFound.fallbackBio++;
          }
          
          // 🧹 CATEGORY 2.5: NEW - Any role-based bio (from old SellerProfile component)
          if (profile.bio && (
            profile.bio.includes('on Orina platform') ||
            profile.bio.includes('Orina Platform Member')
          )) {
            shouldDelete = true;
            reason = 'Old SellerProfile bio';
            report.categoriesFound.fallbackBio++;
          }
          
          // 🧹 CATEGORY 3: Invalid/corrupted data
          if (!profile.id || !profile.address) {
            shouldDelete = true;
            reason = 'Invalid data';
            report.categoriesFound.invalidData++;
          }
          
          // 🧹 CATEGORY 4: Known mock addresses
          const mockAddresses = [
            '0x1234567890abcdef1234567890abcdef12345678',
            '0xF1E2D3C4B5A6978869504132230241',
            '0x8a1...2f3',
            '0xf1e...9d2',
            'CryptoPunk #293',
          ];
          
          if (mockAddresses.some(mockAddr => 
            profile.address?.includes(mockAddr) || 
            profile.id?.includes(mockAddr)
          )) {
            shouldDelete = true;
            reason = 'Mock address';
            report.categoriesFound.mockData++;
          }
          
          // Delete if flagged
          if (shouldDelete) {
            console.log(`🧹 [Cleanup] Removing ${reason}: ${key}`, {
              displayName: profile.displayName,
              bio: profile.bio,
              address: profile.address,
            });
            localStorage.removeItem(key);
            report.keysRemoved.push(key);
            report.totalCleaned++;
          }
          
        } catch (error) {
          // If parse fails, it's corrupted data - delete it
          console.warn(`🧹 [Cleanup] Removing corrupted profile key: ${key}`, error);
          localStorage.removeItem(key);
          report.keysRemoved.push(key);
          report.totalCleaned++;
          report.categoriesFound.invalidData++;
        }
      }
    });
    
    // Summary log
    if (report.totalCleaned > 0) {
      console.log('✅ [Cleanup] Cleanup complete!', {
        total: report.totalCleaned,
        categories: report.categoriesFound,
        keys: report.keysRemoved,
      });
    } else {
      console.log('✅ [Cleanup] No stale profiles found - storage is clean!');
    }
    
  } catch (error) {
    console.error('❌ [Cleanup] Error during cleanup:', error);
  }
  
  return report;
}

/**
 * Clean profiles with specific displayName
 */
export function cleanupProfilesByName(displayName: string): number {
  console.log(`🧹 [Cleanup] Cleaning profiles with displayName: "${displayName}"`);
  
  let cleaned = 0;
  const allKeys = Object.keys(localStorage);
  
  allKeys.forEach(key => {
    if (key.startsWith('user_profile_') || 
        key.startsWith('studio_user_profile_') ||
        key.startsWith('orina_profile_')) {
      
      try {
        const profileData = localStorage.getItem(key);
        if (profileData) {
          const profile = JSON.parse(profileData);
          if (profile.displayName === displayName) {
            console.log(`🧹 [Cleanup] Removing profile: ${key}`);
            localStorage.removeItem(key);
            cleaned++;
          }
        }
      } catch (error) {
        // Ignore parse errors
      }
    }
  });
  
  console.log(`✅ [Cleanup] Removed ${cleaned} profiles with name "${displayName}"`);
  return cleaned;
}

/**
 * Clean profiles with specific bio text
 */
export function cleanupProfilesByBio(bioText: string): number {
  console.log(`🧹 [Cleanup] Cleaning profiles with bio: "${bioText}"`);
  
  let cleaned = 0;
  const allKeys = Object.keys(localStorage);
  
  allKeys.forEach(key => {
    if (key.startsWith('user_profile_') || 
        key.startsWith('studio_user_profile_') ||
        key.startsWith('orina_profile_')) {
      
      try {
        const profileData = localStorage.getItem(key);
        if (profileData) {
          const profile = JSON.parse(profileData);
          if (profile.bio === bioText) {
            console.log(`🧹 [Cleanup] Removing profile: ${key}`, profile.displayName);
            localStorage.removeItem(key);
            cleaned++;
          }
        }
      } catch (error) {
        // Ignore parse errors
      }
    }
  });
  
  console.log(`✅ [Cleanup] Removed ${cleaned} profiles with bio "${bioText}"`);
  return cleaned;
}

/**
 * List all profiles in localStorage (for debugging)
 */
export function listAllProfiles(): any[] {
  const profiles: any[] = [];
  const allKeys = Object.keys(localStorage);
  
  allKeys.forEach(key => {
    if (key.startsWith('user_profile_') || 
        key.startsWith('studio_user_profile_') ||
        key.startsWith('orina_profile_')) {
      
      try {
        const profileData = localStorage.getItem(key);
        if (profileData) {
          const profile = JSON.parse(profileData);
          profiles.push({
            key,
            displayName: profile.displayName,
            username: profile.username,
            bio: profile.bio,
            address: profile.address,
            id: profile.id,
          });
        }
      } catch (error) {
        profiles.push({
          key,
          error: 'Parse failed - corrupted data',
        });
      }
    }
  });
  
  console.log(`📋 [Cleanup] Found ${profiles.length} profiles in localStorage:`, profiles);
  return profiles;
}

/**
 * Nuclear option: Delete ALL profile keys
 * USE WITH CAUTION!
 */
export function nuclearCleanupAllProfiles(): number {
  console.warn('☢️ [Cleanup] NUCLEAR CLEANUP - Removing ALL profiles!');
  
  let cleaned = 0;
  const allKeys = Object.keys(localStorage);
  
  allKeys.forEach(key => {
    if (key.startsWith('user_profile_') || 
        key.startsWith('studio_user_profile_') ||
        key.startsWith('orina_profile_')) {
      
      console.log(`☢️ [Cleanup] Removing: ${key}`);
      localStorage.removeItem(key);
      cleaned++;
    }
  });
  
  console.warn(`☢️ [Cleanup] NUCLEAR CLEANUP COMPLETE - Removed ${cleaned} profiles!`);
  return cleaned;
}