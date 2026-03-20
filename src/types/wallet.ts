// Wallet types for connect/transaction flow

export type WalletModalStep = 'connect' | 'signature' | 'processing' | 'success' | null;

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
  signatureData?: SignatureRequestData;
  transactionResult?: TransactionResult;
  onConfirm?: WalletModalConfirmHandler;
  onCancel?: () => void;
}

// Wallet reviews data
export interface WalletReview {
  username: string;
  rating: number;
  comment: string;
}

export const MOCK_REVIEWS: WalletReview[] = [
  {
    username: 'SecurityExpert_99',
    rating: 5,
    comment: 'Extremely secure and seamless integration. Best in class UX.',
  },
  {
    username: 'Web3_Collector',
    rating: 5,
    comment: 'Highly recommended for anyone entering the marketplace. Fast and reliable.',
  },
  {
    username: 'Eth_Whale',
    rating: 4,
    comment: 'Solid interface, though gas fee estimates could be more precise.',
  },
  {
    username: 'Alex Rivers',
    rating: 5,
    comment: 'Fast confirmation and smooth interface. Very satisfied with the experience.',
  },
  {
    username: 'CryptoMinter',
    rating: 4,
    comment: 'Top-tier quality. A bit high on fee but the security is worth it.',
  },
  {
    username: 'Sarah Jenkins',
    rating: 5,
    comment: 'Transparent and reliable. Love how the details are presented.',
  },
];
