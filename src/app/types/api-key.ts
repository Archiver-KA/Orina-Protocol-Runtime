export type APIKeyPermission = 'read' | 'write' | 'mint' | 'delete';

export interface APIKey {
  id: string;
  key: string; // Raw key is only returned once at creation time
  keyPreview?: string;
  rawKeyAvailable?: boolean;
  name: string;
  walletAddress: string;
  permissions: APIKeyPermission[];
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt?: string | null;
  isActive: boolean;
  usageStats: {
    totalRequests: number;
    successRate: number;
    lastDayRequests: number;
  };
}

export interface PendingOperation {
  id: string;
  apiKeyId: string;
  type: 'create' | 'update' | 'delete' | 'mint' | 'price_change';
  assetId?: string;
  payload: any;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'failed';
  createdAt: string;
  createdBy: 'ai_agent' | 'manual';
  requiresSignature: boolean;
  transactionHash?: string;
  error?: string;
}

export interface APIKeyGenerateOptions {
  name: string;
  permissions: APIKeyPermission[];
  expiresInDays?: number;
}

export interface APIUsageStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  rateLimitHits: number;
  averageResponseTime: number;
  requestsByEndpoint: Record<string, number>;
  last30Days: {
    date: string;
    requests: number;
  }[];
}
