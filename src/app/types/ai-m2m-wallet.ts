export type AIM2MAction = 'buy' | 'mint' | 'sign_order';
export type AIM2MDelegateMode = 'generated' | 'enrolled';
export type AIM2MDelegateStatus = 'verified' | 'revoked';
export type AIM2MDelegateInviteStatus = 'pending' | 'claimed' | 'expired';

export interface AIM2MDelegateRecord {
  id: string;
  rootWalletAddress: string;
  delegateAddress: string;
  mode: AIM2MDelegateMode;
  status: AIM2MDelegateStatus;
  label: string | null;
  managedByServer: boolean;
  createdAt: string;
  verifiedAt: string;
}

export interface AIM2MDelegateInvite {
  id: string;
  rootWalletAddress: string;
  status: AIM2MDelegateInviteStatus;
  createdAt: string;
  expiresAt: string;
  claimedAt: string | null;
  claimedByWalletAddress: string | null;
}

export interface AIM2MWalletConfig {
  id: string;
  walletAddress: string;
  enabled: boolean;
  selectedDelegateId: string | null;
  delegateAddress: string;
  paymentToken: string | null;
  allowedActions: AIM2MAction[];
  maxPerOrder: string;
  maxTotal: string;
  expiryDays: number;
  counterpartyAllowlist: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AIM2MActionMapping {
  action: AIM2MAction;
  actionBits: string[];
  description: string;
}

export interface AIM2MPolicyPreview {
  actionBits: string[];
  mappings: AIM2MActionMapping[];
  warnings: string[];
  guardrails: string[];
}

export interface AIM2MWalletOverview {
  rootWalletAddress: string;
  sessionModel: 'delegated_session_v1';
  executionMode: 'direct_delegate_transactions';
  configStatus: 'ready' | 'needs_review';
  rootFallbackEnabled: boolean;
  prefundRequired: boolean;
  rotateOnExpiry: boolean;
  sweepIdleFundsToParent: boolean;
  preview: AIM2MPolicyPreview;
}

export interface AIM2MConfigResponse {
  success: boolean;
  config: AIM2MWalletConfig;
  overview: AIM2MWalletOverview;
  delegates: AIM2MDelegateRecord[];
  pendingInvites: AIM2MDelegateInvite[];
}

export type AIM2MStepId =
  | 'configure'
  | 'deploy_ai_wallet'
  | 'prefund_activate'
  | 'revoke_close';

export type AIM2MStepStatus = 'complete' | 'current' | 'locked';

export interface AIM2MStepSnapshot {
  id: AIM2MStepId;
  label: string;
  description: string;
  status: AIM2MStepStatus;
}

export type AIM2MActivityStatus = 'pending' | 'success' | 'neutral';

export interface AIM2MActivityItem {
  id: string;
  label: string;
  detail: string;
  timestamp: string | null;
  status: AIM2MActivityStatus;
}

export interface AIM2MWalletRuntimeSnapshot {
  rootWalletAddress: string;
  chainId: number | null;
  networkKey: string;
  networkLabel: string;
  enabled: boolean;
  rootFallbackEnabled: boolean;
  hasGeneratedDelegate: boolean;
  selectedDelegate: AIM2MDelegateRecord | null;
  delegates: AIM2MDelegateRecord[];
  pendingInvites: AIM2MDelegateInvite[];
  paymentToken: string | null;
  paymentTokenSymbol: string | null;
  allowedActions: AIM2MAction[];
  maxPerOrder: string;
  maxTotal: string;
  expiryDays: number;
  configUpdatedAt: string | null;
  predictedWalletAddress: string | null;
  deployedWalletAddress: string | null;
  walletBalanceRaw: string | null;
  walletBalanceFormatted: string | null;
  tokenDecimals: number | null;
  latestSessionNonce: string | null;
  sessionStatus: 'none' | 'active' | 'revoked' | 'expired' | 'consumed';
  sessionExists: boolean;
  walletInitialized: boolean | null;
  walletIsActive: boolean | null;
  steps: AIM2MStepSnapshot[];
  activity: AIM2MActivityItem[];
}

export type AIM2MClientErrorCode =
  | 'service_not_configured'
  | 'bridge_disabled'
  | 'wallet_session_required'
  | 'bridge_exchange_failed'
  | 'http_unauthorized'
  | 'http_forbidden'
  | 'http_not_found'
  | 'http_server_error'
  | 'http_error'
  | 'network_error'
  | 'invalid_request'
  | 'unknown_error';

export interface AIM2MClientError {
  code: AIM2MClientErrorCode;
  message: string;
  status?: number;
  requestPath?: string;
  details?: unknown;
}

export type AIM2MClientResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: AIM2MClientError;
    };
