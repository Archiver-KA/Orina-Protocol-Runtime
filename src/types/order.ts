import type { RwaSelectedAttribute } from '@/app/types/asset';
import type { DeliveryAddressRecord } from '@/types/address';

export interface OrderUiSignatures {
  buyer1: boolean;
  seller: boolean;
  buyer2: boolean;
}

export type DisputeParticipantRole = 'buyer' | 'seller' | 'arbiter' | 'system';
export type DisputeProposalOutcome = 'buyer_win' | 'seller_win' | 'split';
export type DisputeProposalStatus = 'pending' | 'executing' | 'resolved' | 'rejected';

export interface DisputeThreadMessage {
  id: string;
  sender: DisputeParticipantRole;
  senderAddress?: `0x${string}`;
  content: string;
  timestamp: number;
  type: 'message' | 'proposal' | 'system';
  proposalId?: string;
}

export interface DisputeProposalRecord {
  id: string;
  outcome: DisputeProposalOutcome;
  buyerShareBps: number;
  sellerShareBps: number;
  proposerRole: Exclude<DisputeParticipantRole, 'system'>;
  proposerAddress: `0x${string}`;
  createdAt: number;
  status: DisputeProposalStatus;
  signatures: Partial<Record<Exclude<DisputeParticipantRole, 'system'>, `0x${string}`>>;
  resolvedTxHash?: `0x${string}`;
  resolvedAt?: number;
  rejectedAt?: number;
}

export interface DisputeCaseProjection {
  reasons: string[];
  comment: string;
  evidenceUrls: string[];
  messages: DisputeThreadMessage[];
  proposals: DisputeProposalRecord[];
  extensionRequestedAt?: number;
  extensionTxHash?: `0x${string}`;
  lastResolutionTxHash?: `0x${string}`;
}

export type OrderShippingAddressSnapshot = Pick<
  DeliveryAddressRecord,
  | 'label'
  | 'recipientName'
  | 'phoneE164'
  | 'countryCode'
  | 'countryNameSnapshot'
  | 'geoPath'
  | 'leafPlaceId'
  | 'postalCode'
  | 'addressLine1'
  | 'addressLine2'
  | 'deliveryInstructions'
> & {
  formatted?: string;
};

export interface OrderUiRecord {
  orderId: bigint;
  buyer: `0x${string}`;
  seller: `0x${string}`;
  assetId: bigint;
  assetUid?: string;
  tokenId?: string;
  assetContract?: `0x${string}`;
  assetName: string;
  unitId?: bigint;
  unitName?: string;
  unitLabel?: string;
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
  paymentTokenSymbol?: string;
  paymentTokenDecimals?: number;
  platformFeeBpsSnapshot: bigint;
  daoFeeBpsSnapshot: bigint;
  burnFeeBpsSnapshot: bigint;
  shippingAddressSnapshot?: OrderShippingAddressSnapshot | null;
  shippingMethodLabel?: string;
  selectedAttributes?: RwaSelectedAttribute[];
  settlementType: number;
  sellerConfirmed: boolean;
  progress: number;
  signatures: OrderUiSignatures;
  disputed?: boolean;
  disputeExtended?: boolean;
  disputeVerdict?: number;
  disputeBuyerShareBps?: bigint;
  disputeSellerShareBps?: bigint;
  disputeCase?: DisputeCaseProjection;
  paymentSent?: boolean;
  deliveryConfirmed?: boolean;
  createdAt?: number;
  updatedAt?: number;
  deliveryDeadline?: number;
}
