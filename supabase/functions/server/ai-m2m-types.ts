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
