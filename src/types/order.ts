import type { RwaSelectedAttribute } from '@/app/types/asset';

export interface OrderUiSignatures {
  buyer1: boolean;
  seller: boolean;
  buyer2: boolean;
}

export interface OrderUiRecord {
  orderId: bigint;
  buyer: `0x${string}`;
  seller: `0x${string}`;
  assetId: bigint;
  assetName: string;
  network: string;
  assetImage: string;
  amount: bigint;
  grossPrice: bigint;
  payDeadline: bigint;
  autoReleaseAt: bigint;
  disputeDeadline?: bigint;
  disputeOpenedAt?: bigint;
  state: number;
  finalized: boolean;
  proposedAt: bigint;
  paidAt: bigint;
  depositedAt: bigint;
  sellerConfirmedAt: bigint;
  estDeliverySeconds: bigint;
  paymentToken: `0x${string}`;
  platformFeeBpsSnapshot: bigint;
  daoFeeBpsSnapshot: bigint;
  burnFeeBpsSnapshot: bigint;
  selectedAttributes?: RwaSelectedAttribute[];
  settlementType: number;
  sellerConfirmed: boolean;
  progress: number;
  signatures: OrderUiSignatures;
}
