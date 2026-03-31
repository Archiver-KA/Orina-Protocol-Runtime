// Wallet types for connect/transaction flow

export type WalletModalStep = 'connect' | 'security_check' | 'signature' | 'processing' | 'success' | null;

export interface WalletProvider {
  id: string;
  name: string;
  description: string;
  iconType: 'image' | 'icon';
  iconValue: string;
  iconBgColor: string;
  installed?: boolean;
  recommended?: boolean;
}

export interface TransactionData {
  orderId?: string;
  amount?: string;
  currency?: string;
  nonce?: number;
  timestamp?: number;
  expiry?: number;
  item?: string;
  action?: string;
}

export interface SignatureRequestData {
  origin: string;
  action: string;
  message: TransactionData;
}

export interface SecurityCheckRequestData {
  title: string;
  description: string;
  surfaceLabel?: string;
  confirmLabel?: string;
  helpText?: string;
  successMessage?: string;
  successDescription?: string;
}

export interface TransactionResult {
  hash: string;
  networkFee: string;
  timestamp: number;
}

export type WalletModalConfirmHandler = () => Promise<TransactionResult | void> | TransactionResult | void;

export interface WalletModalState {
  step: WalletModalStep;
  source?: 'connect' | 'auth' | 'tx';
  isBusy?: boolean;
  securityCheckData?: SecurityCheckRequestData;
  signatureData?: SignatureRequestData;
  transactionResult?: TransactionResult;
  onConfirm?: WalletModalConfirmHandler;
  onCancel?: () => void;
}
