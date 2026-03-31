import { APIKey, APIKeyGenerateOptions, PendingOperation } from '@/app/types/api-key';

/**
 * @deprecated — LOCAL STORAGE REMOVED.
 * API keys are now managed server-side via the `api_credentials` table
 * (see migration 000049_api_credentials_and_reports.sql).
 * All methods below are no-ops that log deprecation warnings.
 * New code must use the server-side credential vault via edge functions.
 * See spec: 15-local-api-audit-and-server-migration-plan.md § F2
 */

export class APIKeyManager {
  /** @deprecated Server-side only. */
  static generateKey(walletAddress: string, options: APIKeyGenerateOptions): APIKey {
    console.warn('[APIKeyManager] generateKey() is deprecated — use server-side api_credentials');
    return {
      id: `key_${Date.now()}`,
      key: '',
      name: options.name,
      walletAddress,
      permissions: options.permissions,
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
      expiresAt: null,
      isActive: false,
      usageStats: { totalRequests: 0, successRate: 0, lastDayRequests: 0 },
    };
  }

  /** @deprecated Server-side only. */
  static getKeysForWallet(_walletAddress: string): APIKey[] {
    console.warn('[APIKeyManager] getKeysForWallet() is deprecated — use server-side api_credentials');
    return [];
  }

  /** @deprecated Server-side only. */
  static revokeKey(_walletAddress: string, _keyId: string): boolean {
    console.warn('[APIKeyManager] revokeKey() is deprecated — use server-side api_credentials');
    return false;
  }

  /** @deprecated Server-side only. */
  static deleteKey(_walletAddress: string, _keyId: string): boolean {
    console.warn('[APIKeyManager] deleteKey() is deprecated — use server-side api_credentials');
    return false;
  }

  /** @deprecated Server-side only. */
  static validateKey(_apiKey: string): APIKey | null {
    console.warn('[APIKeyManager] validateKey() is deprecated — use server-side api_credentials');
    return null;
  }

  /** @deprecated Server-side only. */
  static updateUsage(_walletAddress: string, _keyId: string, _success: boolean): void {
    console.warn('[APIKeyManager] updateUsage() is deprecated — use server-side api_credentials');
  }

  /** @deprecated Server-side only. */
  static createPendingOperation(
    _walletAddress: string,
    operation: Omit<PendingOperation, 'id' | 'createdAt' | 'status'>
  ): PendingOperation {
    console.warn('[APIKeyManager] createPendingOperation() is deprecated');
    return {
      ...operation,
      id: `op_${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: 'pending',
    };
  }

  /** @deprecated Server-side only. */
  static getPendingOperations(_walletAddress: string): PendingOperation[] {
    return [];
  }

  /** @deprecated Server-side only. */
  static updateOperationStatus(
    _walletAddress: string,
    _operationId: string,
    _status: PendingOperation['status'],
    _transactionHash?: string,
    _error?: string
  ): void {}

  /** @deprecated Server-side only. */
  static approvePendingOperation(_walletAddress: string, _operationId: string): PendingOperation | null {
    return null;
  }

  /** @deprecated Server-side only. */
  static rejectPendingOperation(_walletAddress: string, _operationId: string): void {}

  /** @deprecated No-op — localStorage keys cleared. */
  static clearAllKeysForWallet(_walletAddress: string): void {
    console.warn('[APIKeyManager] clearAllKeysForWallet() is deprecated — no localStorage keys to clear');
  }
}
