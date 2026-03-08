import { APIKey, APIKeyGenerateOptions, PendingOperation } from '@/app/types/api-key';

/**
 * 🔒 SECURITY-FIRST API KEY MANAGER
 * ✅ REBUILT: Address-based only, no userId concept
 */

// Legacy key for migration
const LEGACY_STORAGE_KEY = 'marketplace_api_keys';
const PENDING_OPS_KEY_PREFIX = 'orina_api_pending_ops';

export class APIKeyManager {
  /**
   * Get storage key for a specific wallet address
   * Uses wallet address directly for better isolation and reliability
   * @private
   */
  private static getStorageKey(walletAddress: string): string {
    // Use wallet address directly (normalized to lowercase)
    // This ensures keys are always accessible regardless of userId mapping
    return `orina_api_keys_${walletAddress.toLowerCase()}`;
  }

  /**
   * Get pending operations storage key for a specific wallet
   * @private
   */
  private static getPendingOpsKey(walletAddress: string): string {
    return `${PENDING_OPS_KEY_PREFIX}_${walletAddress.toLowerCase()}`;
  }

  /**
   * Simple encryption for API keys (basic obfuscation)
   * @private
   */
  private static encryptKey(key: string): string {
    // Basic Base64 encoding with salt
    const salt = 'orina_secure_salt_2026';
    return btoa(`${salt}:${key}`);
  }

  /**
   * Decrypt API key
   * @private
   */
  private static decryptKey(encrypted: string): string {
    try {
      const decoded = atob(encrypted);
      const parts = decoded.split(':');
      return parts[1] || '';
    } catch {
      return encrypted; // Fallback to original if decryption fails
    }
  }

  /**
   * Migrate legacy keys to user-specific storage
   * @private
   */
  private static migrateLegacyKeys(walletAddress: string): void {
    const legacyData = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!legacyData) return;

    try {
      const allKeys: APIKey[] = JSON.parse(legacyData);
      const userKeys = allKeys.filter(
        k => k.walletAddress.toLowerCase() === walletAddress.toLowerCase()
      );

      if (userKeys.length > 0) {
        const storageKey = this.getStorageKey(walletAddress);
        const existing = localStorage.getItem(storageKey);
        
        if (!existing) {
          // Encrypt keys before saving
          const encryptedKeys = userKeys.map(k => ({
            ...k,
            key: this.encryptKey(k.key)
          }));
          
          localStorage.setItem(storageKey, JSON.stringify(encryptedKeys));
          console.log(`[API Keys] Migrated ${userKeys.length} keys for user`);
        }
      }

      // Remove user's keys from legacy storage
      const remainingKeys = allKeys.filter(
        k => k.walletAddress.toLowerCase() !== walletAddress.toLowerCase()
      );
      
      if (remainingKeys.length === 0) {
        localStorage.removeItem(LEGACY_STORAGE_KEY);
        console.log('[API Keys] Removed legacy storage (empty)');
      } else {
        localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(remainingKeys));
      }
    } catch (error) {
      console.error('[API Keys] Migration error:', error);
    }
  }

  // Generate new API key
  static generateKey(walletAddress: string, options: APIKeyGenerateOptions): APIKey {
    const keyId = this.generateRandomId();
    const apiKey = `sk_seller_${this.generateRandomToken(32)}`;
    
    const now = new Date().toISOString();
    const expiresAt = options.expiresInDays 
      ? new Date(Date.now() + options.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const newKey: APIKey = {
      id: keyId,
      key: apiKey,
      name: options.name,
      walletAddress,
      permissions: options.permissions,
      createdAt: now,
      lastUsedAt: null,
      expiresAt,
      isActive: true,
      usageStats: {
        totalRequests: 0,
        successRate: 100,
        lastDayRequests: 0
      }
    };

    this.saveKey(walletAddress, newKey);
    
    console.log(`[API Keys] Generated new key "${options.name}" for user`);
    
    return {
      ...newKey,
      key: apiKey // Return unencrypted key to show user ONCE
    };
  }

  // Get all keys for wallet
  static getKeysForWallet(walletAddress: string): APIKey[] {
    // Try migration first
    this.migrateLegacyKeys(walletAddress);
    
    const storageKey = this.getStorageKey(walletAddress);
    const stored = localStorage.getItem(storageKey);
    if (!stored) {
      return [];
    }

    try {
      const keys: APIKey[] = JSON.parse(stored);
      // Decrypt keys for display
      return keys.map(k => ({
        ...k,
        key: this.decryptKey(k.key)
      }));
    } catch (error) {
      console.error('[API Keys] Error loading keys:', error);
      return [];
    }
  }

  // Revoke key
  static revokeKey(walletAddress: string, keyId: string): boolean {
    const keys = this.getKeysForWallet(walletAddress);
    const keyIndex = keys.findIndex(k => k.id === keyId);
    
    if (keyIndex === -1) return false;
    
    keys[keyIndex].isActive = false;
    this.saveAllKeys(walletAddress, keys);
    
    console.log(`[API Keys] Revoked key ${keyId}`);
    
    return true;
  }

  // Delete key permanently
  static deleteKey(walletAddress: string, keyId: string): boolean {
    const keys = this.getKeysForWallet(walletAddress);
    const filtered = keys.filter(k => k.id !== keyId);
    
    if (filtered.length === keys.length) return false;
    
    this.saveAllKeys(walletAddress, filtered);
    
    console.log(`[API Keys] Deleted key ${keyId}`);
    
    return true;
  }

  // Validate API key
  static validateKey(apiKey: string): APIKey | null {
    // This would need to check ALL users' keys in a real system
    // For now, we'll keep a simple implementation
    // In production, this should be server-side validation
    
    console.warn('[API Keys] validateKey should be implemented server-side');
    return null;
  }

  // Update usage stats
  static updateUsage(walletAddress: string, keyId: string, success: boolean): void {
    const keys = this.getKeysForWallet(walletAddress);
    const key = keys.find(k => k.id === keyId);
    
    if (!key) return;
    
    key.lastUsedAt = new Date().toISOString();
    key.usageStats.totalRequests++;
    key.usageStats.lastDayRequests++;
    
    if (success) {
      key.usageStats.successRate = 
        (key.usageStats.successRate * (key.usageStats.totalRequests - 1) + 100) / 
        key.usageStats.totalRequests;
    } else {
      key.usageStats.successRate = 
        (key.usageStats.successRate * (key.usageStats.totalRequests - 1)) / 
        key.usageStats.totalRequests;
    }
    
    this.saveAllKeys(walletAddress, keys);
  }

  // Pending operations management
  static createPendingOperation(
    walletAddress: string,
    operation: Omit<PendingOperation, 'id' | 'createdAt' | 'status'>
  ): PendingOperation {
    const newOp: PendingOperation = {
      ...operation,
      id: this.generateRandomId(),
      createdAt: new Date().toISOString(),
      status: 'pending'
    };
    
    const ops = this.getAllPendingOperations(walletAddress);
    ops.push(newOp);
    this.savePendingOperations(walletAddress, ops);
    
    return newOp;
  }

  static getPendingOperations(walletAddress: string): PendingOperation[] {
    const ops = this.getAllPendingOperations(walletAddress);
    return ops.filter(op => op.status === 'pending');
  }

  static updateOperationStatus(
    walletAddress: string,
    operationId: string, 
    status: PendingOperation['status'],
    transactionHash?: string,
    error?: string
  ): void {
    const ops = this.getAllPendingOperations(walletAddress);
    const op = ops.find(o => o.id === operationId);
    
    if (!op) return;
    
    op.status = status;
    if (transactionHash) op.transactionHash = transactionHash;
    if (error) op.error = error;
    
    this.savePendingOperations(walletAddress, ops);
  }

  static approvePendingOperation(walletAddress: string, operationId: string): PendingOperation | null {
    const ops = this.getAllPendingOperations(walletAddress);
    const op = ops.find(o => o.id === operationId);
    
    if (!op || op.status !== 'pending') return null;
    
    op.status = 'approved';
    this.savePendingOperations(walletAddress, ops);
    
    return op;
  }

  static rejectPendingOperation(walletAddress: string, operationId: string): void {
    this.updateOperationStatus(walletAddress, operationId, 'rejected');
  }

  // Helper methods
  private static saveAllKeys(walletAddress: string, keys: APIKey[]): void {
    const storageKey = this.getStorageKey(walletAddress);
    
    // Encrypt keys before saving
    const encryptedKeys = keys.map(k => ({
      ...k,
      key: this.encryptKey(k.key)
    }));
    
    localStorage.setItem(storageKey, JSON.stringify(encryptedKeys));
  }

  private static saveKey(walletAddress: string, key: APIKey): void {
    const keys = this.getKeysForWallet(walletAddress);
    keys.push(key);
    this.saveAllKeys(walletAddress, keys);
  }

  private static getAllPendingOperations(walletAddress: string): PendingOperation[] {
    const key = this.getPendingOpsKey(walletAddress);
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  }

  private static savePendingOperations(walletAddress: string, ops: PendingOperation[]): void {
    const key = this.getPendingOpsKey(walletAddress);
    localStorage.setItem(key, JSON.stringify(ops));
  }

  private static generateRandomId(): string {
    return `key_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static generateRandomToken(length: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * 🔒 Clear all API keys for a specific wallet (for profile reset)
   */
  static clearAllKeysForWallet(walletAddress: string): void {
    console.log(`[API Keys Clear] Starting cleanup for wallet: ${walletAddress}`);
    
    const storageKey = this.getStorageKey(walletAddress);
    const pendingOpsKey = this.getPendingOpsKey(walletAddress);
    
    console.log(`[API Keys Clear] Target storage key: ${storageKey}`);
    console.log(`[API Keys Clear] Target pending ops key: ${pendingOpsKey}`);
    
    // Clear primary storage
    const beforeClear = localStorage.getItem(storageKey);
    localStorage.removeItem(storageKey);
    localStorage.removeItem(pendingOpsKey);
    console.log(`[API Keys Clear] ✓ Removed: ${storageKey} (had data: ${!!beforeClear})`);
    console.log(`[API Keys Clear] ✓ Removed: ${pendingOpsKey}`);
    
    // Also clean legacy storage if it contains this user's keys
    const legacyData = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyData) {
      console.log(`[API Keys Clear] Found legacy storage, cleaning...`);
      try {
        const allKeys: APIKey[] = JSON.parse(legacyData);
        const filtered = allKeys.filter(
          k => k.walletAddress.toLowerCase() !== walletAddress.toLowerCase()
        );
        
        if (filtered.length === 0) {
          localStorage.removeItem(LEGACY_STORAGE_KEY);
          console.log('[API Keys Clear] ✓ Removed legacy storage (empty)');
        } else if (filtered.length !== allKeys.length) {
          localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(filtered));
          console.log(`[API Keys Clear] ✓ Cleaned user keys from legacy storage (${allKeys.length - filtered.length} removed)`);
        }
      } catch (error) {
        console.error('[API Keys Clear] Error cleaning legacy storage:', error);
      }
    }
    
    // 🧹 Wildcard cleanup: Remove ANY orphaned keys for this wallet
    console.log(`[API Keys Clear] Starting wildcard cleanup...`);
    const keysToRemove: string[] = [];
    const addressLower = walletAddress.toLowerCase();
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('orina_api_keys_') || 
        key.startsWith('orina_api_pending_ops_')
      )) {
        console.log(`[API Keys Clear] Checking: ${key}`);
        // Check if this key belongs to current wallet
        try {
          const data = localStorage.getItem(key);
          if (data) {
            const parsed: APIKey[] = JSON.parse(data);
            // If any key in this storage belongs to this wallet, mark for removal
            if (parsed.some && parsed.some((k: any) => k.walletAddress?.toLowerCase() === addressLower)) {
              console.log(`[API Keys Clear]   → Belongs to user, marking for removal`);
              keysToRemove.push(key);
            } else {
              console.log(`[API Keys Clear]   → Belongs to different user, skipping`);
            }
          }
        } catch (e) {
          // If parse fails, check if key contains wallet address
          if (key.includes(addressLower)) {
            console.log(`[API Keys Clear]   → Contains wallet address, marking for removal`);
            keysToRemove.push(key);
          }
        }
      }
    }
    
    // Remove orphaned keys
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log(`[API Keys Clear] 🧹 Cleaned orphaned: ${key}`);
    });
    
    console.log(`[API Keys Clear] ✅ Cleanup complete (removed ${keysToRemove.length + 2} items)`);
  }
}
