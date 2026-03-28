/**
 * Orina ATP Protocol v3.4-m2m - Complete Contract ABIs
 * ======================================================
 * Generated from Solidity source code.
 * All core contracts: MarketplaceATP, OrinaRWA, RWAReceiptNFT,
 * DisputeManager, AutoTimeManager, FeeManager, PaymentGateway,
 * UnitRegistry, ShippingRegistry
 */

// ============================================================
// 1. MARKETPLACE ATP - Core Order Lifecycle
// ============================================================
export const MARKETPLACE_ABI = [
  // ── Read Functions ──────────────────────────────────────────
  {
    inputs: [{ name: 'orderId', type: 'uint256' }],
    name: 'orders',
    outputs: [
      { name: 'buyer', type: 'address' },
      { name: 'seller', type: 'address' },
      { name: 'payer', type: 'address' },
      { name: 'refundRecipient', type: 'address' },
      { name: 'paymentToken', type: 'address' },
      { name: 'assetId', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
      { name: 'grossPrice', type: 'uint256' },
      { name: 'proposedAt', type: 'uint256' },
      { name: 'paidAt', type: 'uint256' },
      { name: 'autoReleaseAt', type: 'uint256' },
      { name: 'estDeliverySeconds', type: 'uint256' },
      { name: 'payDeadline', type: 'uint256' },
      { name: 'state', type: 'uint8' },
      { name: 'settlementType', type: 'uint8' },
      {
        name: 'split',
        type: 'tuple',
        components: [
          { name: 'buyerShareBps', type: 'uint256' },
          { name: 'sellerShareBps', type: 'uint256' },
        ],
      },
      { name: 'platformFeeBpsSnapshot', type: 'uint256' },
      { name: 'daoFeeBpsSnapshot', type: 'uint256' },
      { name: 'burnFeeBpsSnapshot', type: 'uint256' },
      { name: 'referralFeeBpsSnapshot', type: 'uint256' },
      { name: 'finalized', type: 'bool' },
      { name: 'sellerConfirmed', type: 'bool' },
      { name: 'buyerSig1', type: 'bytes' },
      { name: 'sellerSig', type: 'bytes' },
      { name: 'buyerSig2', type: 'bytes' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'orderId', type: 'uint256' }],
    name: 'getOrderStatus',
    outputs: [
      { name: 'status', type: 'uint8' },
      { name: 'remainingTime', type: 'uint256' },
      { name: 'statusText', type: 'string' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'nextOrderId',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'VERSION',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'BUYER_ACTION_WINDOW',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'SELLER_CONFIRM_WINDOW',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'PAY_TIMEOUT',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // View helpers
  {
    inputs: [{ name: 'orderId', type: 'uint256' }],
    name: 'isPendingConfirm',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'orderId', type: 'uint256' }],
    name: 'isPaid',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'orderId', type: 'uint256' }],
    name: 'isOrderDisputed',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'orderId', type: 'uint256' }],
    name: 'isFinalized',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'orderId', type: 'uint256' }],
    name: 'isCancelled',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'orderId', type: 'uint256' }],
    name: 'isSellerConfirmed',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'orderId', type: 'uint256' }],
    name: 'proposedAt',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'orderId', type: 'uint256' }],
    name: 'autoReleaseAt',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'orderId', type: 'uint256' }],
    name: 'grossPrice',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'orderId', type: 'uint256' }],
    name: 'payDeadline',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Contract references
  {
    inputs: [],
    name: 'rwa',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'receiptNft',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'paymentGateway',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'orderId', type: 'uint256' }],
    name: 'phase1Deadline',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'orderId', type: 'uint256' },
      { name: 'verdict', type: 'uint8' },
      { name: 'buyerShareBps', type: 'uint256' },
      { name: 'sellerShareBps', type: 'uint256' },
    ],
    name: 'agreementDigest',
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'feeManager',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'autoTimeManager',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'disputeManager',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'name', type: 'string' }],
    name: 'moduleRegistry',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },

  // ── Write Functions ─────────────────────────────────────────
  // Buyer creates order (Sig 1)
  {
    inputs: [
      { name: 'seller', type: 'address' },
      { name: 'paymentToken', type: 'address' },
      { name: 'assetId', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
      { name: 'grossPriceProposed', type: 'uint256' },
      { name: 'proposedEstDeliverySeconds', type: 'uint256' },
      { name: 'buyerSig1', type: 'bytes' },
    ],
    name: 'createOrder',
    outputs: [{ name: 'orderId', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Seller confirms with delivery time (Sig 2)
  {
    inputs: [
      { name: 'orderId', type: 'uint256' },
      { name: 'estDeliverySeconds', type: 'uint256' },
      { name: 'sellerSig', type: 'bytes' },
    ],
    name: 'sellerConfirm',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Buyer pays (Sig 3 - accepts seller's delivery time)
  {
    inputs: [
      { name: 'orderId', type: 'uint256' },
      { name: 'buyerSig2', type: 'bytes' },
    ],
    name: 'payOrder',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Buyer confirms delivery
  {
    inputs: [{ name: 'orderId', type: 'uint256' }],
    name: 'confirmDelivery',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // AutoTimeManager auto-release
  {
    inputs: [{ name: 'orderId', type: 'uint256' }],
    name: 'autoRelease',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // AutoTimeManager cancel (seller timeout / buyer pay timeout)
  {
    inputs: [{ name: 'orderId', type: 'uint256' }],
    name: 'cancelOrder',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Seller voluntary cancel during the initial 24h seller window
  {
    inputs: [{ name: 'orderId', type: 'uint256' }],
    name: 'cancelBySeller',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Buyer voluntary cancel
  {
    inputs: [{ name: 'orderId', type: 'uint256' }],
    name: 'cancelByBuyer',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Open dispute (buyer only, within 3-day window)
  {
    inputs: [{ name: 'orderId', type: 'uint256' }],
    name: 'openDispute',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // DisputeManager callback
  {
    inputs: [
      { name: 'orderId', type: 'uint256' },
      { name: 'settlement', type: 'uint8' },
      { name: 'buyerShareBps', type: 'uint256' },
      { name: 'sellerShareBps', type: 'uint256' },
    ],
    name: 'setDisputeResolved',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Governance - Module management
  {
    inputs: [
      { name: 'name', type: 'string' },
      { name: 'moduleAddr', type: 'address' },
    ],
    name: 'addModule',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'name', type: 'string' }],
    name: 'removeModule',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Governance - Set dispute manager
  {
    inputs: [{ name: '_dm', type: 'address' }],
    name: 'setDisputeManager',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },

  // ── Events ──────────────────────────────────────────────────
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'orderId', type: 'uint256' },
      { indexed: false, name: 'signature', type: 'bytes' },
    ],
    name: 'BuyerSigned1',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'orderId', type: 'uint256' },
      { indexed: false, name: 'signature', type: 'bytes' },
    ],
    name: 'SellerSigned',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'orderId', type: 'uint256' },
      { indexed: false, name: 'signature', type: 'bytes' },
    ],
    name: 'BuyerSigned2',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'orderId', type: 'uint256' },
      { indexed: true, name: 'buyer', type: 'address' },
      { indexed: true, name: 'seller', type: 'address' },
    ],
    name: 'OrderProposed',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, name: 'orderId', type: 'uint256' }],
    name: 'SellerConfirmed',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'orderId', type: 'uint256' },
      { indexed: false, name: 'estDeliverySeconds', type: 'uint256' },
    ],
    name: 'DeliveryTimeSet',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'orderId', type: 'uint256' },
      { indexed: false, name: 'payDeadline', type: 'uint256' },
    ],
    name: 'PayDeadlineSet',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, name: 'orderId', type: 'uint256' }],
    name: 'DeliveryTimeAccepted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, name: 'orderId', type: 'uint256' }],
    name: 'OrderPaid',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'orderId', type: 'uint256' },
      { indexed: false, name: 'settlement', type: 'uint8' },
    ],
    name: 'OrderFinalized',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, name: 'orderId', type: 'uint256' }],
    name: 'OrderCancelled',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, name: 'orderId', type: 'uint256' }],
    name: 'OrderCancelledBySeller',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, name: 'orderId', type: 'uint256' }],
    name: 'OrderCancelledByBuyer',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, name: 'orderId', type: 'uint256' }],
    name: 'AutoReleased',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'orderId', type: 'uint256' },
      { indexed: true, name: 'opener', type: 'address' },
    ],
    name: 'DisputeOpened',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'orderId', type: 'uint256' },
      { indexed: false, name: 'settlement', type: 'uint8' },
      { indexed: false, name: 'buyerShareBps', type: 'uint256' },
      { indexed: false, name: 'sellerShareBps', type: 'uint256' },
    ],
    name: 'DisputeResolved',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'name', type: 'string' },
      { indexed: true, name: 'moduleAddr', type: 'address' },
    ],
    name: 'ModuleAdded',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'name', type: 'string' },
      { indexed: true, name: 'moduleAddr', type: 'address' },
    ],
    name: 'ModuleRemoved',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'name', type: 'string' },
      { indexed: true, name: 'orderId', type: 'uint256' },
      { indexed: false, name: 'success', type: 'bool' },
    ],
    name: 'ModuleExecuted',
    type: 'event',
  },
] as const;

// ============================================================
// 2. ORINA RWA - Asset Management
// ============================================================
export const ORINA_RWA_ABI = [
  // ── Read Functions ──────────────────────────────────────────
  {
    inputs: [{ name: 'assetId', type: 'uint256' }],
    name: 'getAsset',
    outputs: [
      {
        components: [
          { name: 'seller', type: 'address' },
          { name: 'unitId', type: 'uint256' },
          { name: 'totalAmount', type: 'uint256' },
          { name: 'availableAmount', type: 'uint256' },
          { name: 'consumedAmount', type: 'uint256' },
          { name: 'active', type: 'bool' },
          { name: 'expiryAt', type: 'uint256' },
          { name: 'finalized', type: 'bool' },
          { name: 'assetType', type: 'uint8' },
        ],
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'nextAssetId',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'assetId', type: 'uint256' }],
    name: 'totalLocked',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'assetId', type: 'uint256' }],
    name: 'totalLockedPerAsset',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'assetId', type: 'uint256' },
      { name: 'orderId', type: 'uint256' },
    ],
    name: 'lockedAmounts',
    outputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'lockedAt', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'VERSION',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'unitRegistry',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },

  // ── Write Functions ─────────────────────────────────────────
  // Seller mints a new asset (RWA or NFT)
  {
    inputs: [
      { name: 'unitId', type: 'uint256' },
      { name: 'totalAmount', type: 'uint256' },
      { name: 'expiryAt', type: 'uint256' },
      { name: 'assetType', type: 'uint8' }, // 0 = RWA, 1 = NFT
    ],
    name: 'mintAsset',
    outputs: [{ name: 'assetId', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // MARKETPLACE_ROLE only
  {
    inputs: [
      { name: 'assetId', type: 'uint256' },
      { name: 'orderId', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'lockAmount',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'assetId', type: 'uint256' },
      { name: 'orderId', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'consumeLocked',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'assetId', type: 'uint256' },
      { name: 'orderId', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'unlockAmount',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // GOVERNANCE_ROLE only
  {
    inputs: [{ name: 'assetId', type: 'uint256' }],
    name: 'burnAsset',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },

  // ── Events ──────────────────────────────────────────────────
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'assetId', type: 'uint256' },
      { indexed: true, name: 'seller', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' },
      { indexed: false, name: 'assetType', type: 'uint8' },
    ],
    name: 'AssetMinted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'assetId', type: 'uint256' },
      { indexed: true, name: 'orderId', type: 'uint256' },
      { indexed: false, name: 'amount', type: 'uint256' },
    ],
    name: 'AmountLocked',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'assetId', type: 'uint256' },
      { indexed: true, name: 'orderId', type: 'uint256' },
      { indexed: false, name: 'amount', type: 'uint256' },
    ],
    name: 'AmountUnlocked',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'assetId', type: 'uint256' },
      { indexed: true, name: 'orderId', type: 'uint256' },
      { indexed: false, name: 'amount', type: 'uint256' },
    ],
    name: 'AmountConsumed',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, name: 'assetId', type: 'uint256' }],
    name: 'AssetFinalized',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, name: 'assetId', type: 'uint256' }],
    name: 'AssetBurned',
    type: 'event',
  },
] as const;

// ============================================================
// 3. RWA RECEIPT NFT - ERC721 + Soulbound Receipt
// ============================================================
export const RECEIPT_NFT_ABI = [
  // ── ERC721 Standard Read ────────────────────────────────────
  {
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'tokenURI',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'name',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  // ── Custom Read ─────────────────────────────────────────────
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'receipts',
    outputs: [
      { name: 'orderId', type: 'uint256' },
      { name: 'assetId', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
      { name: 'assetType', type: 'uint8' }, // 0 = RWA (non-transferable), 1 = NFT (transferable)
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'VERSION',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'marketplace',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'rwa',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },

  // ── ERC721 Write ────────────────────────────────────────────
  {
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
    ],
    name: 'transferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
    ],
    name: 'safeTransferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // ── Custom Write (MINTER_ROLE) ──────────────────────────────
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'orderId', type: 'uint256' },
      { name: 'assetId', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'mint',
    outputs: [{ name: 'tokenId', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Governance
  {
    inputs: [{ name: 'newUri', type: 'string' }],
    name: 'setBaseURI',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },

  // ── Events ──────────────────────────────────────────────────
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'tokenId', type: 'uint256' },
      { indexed: true, name: 'orderId', type: 'uint256' },
      { indexed: true, name: 'to', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' },
      { indexed: false, name: 'assetType', type: 'uint8' },
    ],
    name: 'ReceiptMinted',
    type: 'event',
  },
  // Standard ERC721 Transfer
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'from', type: 'address' },
      { indexed: true, name: 'to', type: 'address' },
      { indexed: true, name: 'tokenId', type: 'uint256' },
    ],
    name: 'Transfer',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'owner', type: 'address' },
      { indexed: true, name: 'approved', type: 'address' },
      { indexed: true, name: 'tokenId', type: 'uint256' },
    ],
    name: 'Approval',
    type: 'event',
  },
] as const;

// ============================================================
// 4. DISPUTE MANAGER - Dispute Lifecycle
// ============================================================
export const DISPUTE_MANAGER_ABI = [
  // ── Read Functions ──────────────────────────────────────────
  {
    inputs: [{ name: 'orderId', type: 'uint256' }],
    name: 'disputes',
    outputs: [
      { name: 'active', type: 'bool' },
      { name: 'verdict', type: 'uint8' },    // 0=NONE, 1=BUYER_WINS, 2=SELLER_WINS, 3=SPLIT
      { name: 'openedAt', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'extended', type: 'bool' },
      { name: 'buyerShareBps', type: 'uint256' },
      { name: 'sellerShareBps', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'VERSION',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'DISPUTE_PERIOD',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'DISPUTE_FEE_BPS',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'marketplace',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'paymentGateway',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },

  // ── Write Functions ─────────────────────────────────────────
  // Called by Marketplace only
  {
    inputs: [{ name: 'orderId', type: 'uint256' }],
    name: 'openDispute',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // ARBITER_ROLE extends dispute deadline by 14 days (once)
  {
    inputs: [{ name: 'orderId', type: 'uint256' }],
    name: 'extendDispute',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // 2/3 agreement on any dispute proposal
  {
    inputs: [
      { name: 'orderId', type: 'uint256' },
      { name: 'verdict', type: 'uint8' },
      { name: 'buyerShareBps', type: 'uint256' },
      { name: 'sellerShareBps', type: 'uint256' },
      { name: 'buyerSig', type: 'bytes' },
      { name: 'sellerSig', type: 'bytes' },
      { name: 'arbiterSig', type: 'bytes' },
    ],
    name: 'resolveByAgreement',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Mutual resolution - both parties sign EIP-712 → 50/50 split
  {
    inputs: [
      { name: 'orderId', type: 'uint256' },
      { name: 'buyer', type: 'address' },
      { name: 'seller', type: 'address' },
      { name: 'buyerSig', type: 'bytes' },
      { name: 'sellerSig', type: 'bytes' },
    ],
    name: 'resolveMutualSplit',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // ARBITER_ROLE resolves dispute with verdict
  {
    inputs: [
      { name: 'orderId', type: 'uint256' },
      { name: 'verdict', type: 'uint8' },       // Verdict enum
      { name: 'buyerShareBps', type: 'uint256' },
      { name: 'sellerShareBps', type: 'uint256' },
    ],
    name: 'resolveDispute',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Stale dispute → 50/50 auto-split after deadline
  {
    inputs: [{ name: 'orderId', type: 'uint256' }],
    name: 'resolveStaleDispute',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },

  // ── Events ──────────────────────────────────────────────────
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'orderId', type: 'uint256' },
      { indexed: false, name: 'opener', type: 'address' },
    ],
    name: 'DisputeOpened',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'orderId', type: 'uint256' },
      { indexed: false, name: 'verdict', type: 'uint8' },
      { indexed: false, name: 'buyerShareBps', type: 'uint256' },
      { indexed: false, name: 'sellerShareBps', type: 'uint256' },
    ],
    name: 'DisputeResolved',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'orderId', type: 'uint256' },
      { indexed: false, name: 'phase1Deadline', type: 'uint256' },
      { indexed: false, name: 'finalDeadline', type: 'uint256' },
    ],
    name: 'DisputeExtended',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'orderId', type: 'uint256' },
      { indexed: false, name: 'verdict', type: 'uint8' },
      { indexed: false, name: 'buyerShareBps', type: 'uint256' },
      { indexed: false, name: 'sellerShareBps', type: 'uint256' },
      { indexed: false, name: 'signatureCount', type: 'uint256' },
    ],
    name: 'DisputeResolvedByAgreement',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'orderId', type: 'uint256' },
      { indexed: false, name: 'verdict', type: 'uint8' },
      { indexed: false, name: 'buyerShareBps', type: 'uint256' },
      { indexed: false, name: 'sellerShareBps', type: 'uint256' },
    ],
    name: 'DisputeResolvedByArbiter',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'orderId', type: 'uint256' },
      { indexed: false, name: 'buyerShareBps', type: 'uint256' },
      { indexed: false, name: 'sellerShareBps', type: 'uint256' },
      { indexed: false, name: 'extended', type: 'bool' },
    ],
    name: 'DisputeAutoSplit',
    type: 'event',
  },
] as const;

// ============================================================
// 5. AUTO TIME MANAGER - Permissionless Timeout Handler
// ============================================================
export const AUTO_TIME_MANAGER_ABI = [
  // ── Read Functions ──────────────────────────────────────────
  {
    inputs: [],
    name: 'VERSION',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'SELLER_CONFIRM_TIMEOUT',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'MAX_BATCH_SIZE',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'marketplace',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'disputeManager',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },

  // ── Write Functions (Permissionless) ────────────────────────
  // Anyone can call to trigger timeout actions
  {
    inputs: [{ name: 'orderId', type: 'uint256' }],
    name: 'checkAndExecute',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Batch execution (max 100 per call)
  {
    inputs: [{ name: 'orderIds', type: 'uint256[]' }],
    name: 'batchCheckAndExecute',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // GOVERNANCE_ROLE
  {
    inputs: [{ name: '_dm', type: 'address' }],
    name: 'setDisputeManager',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },

  // ── Events ──────────────────────────────────────────────────
  {
    anonymous: false,
    inputs: [{ indexed: true, name: 'orderId', type: 'uint256' }],
    name: 'StaleDisputeResolved',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'caller', type: 'address' },
      { indexed: false, name: 'batchSize', type: 'uint256' },
    ],
    name: 'BatchExecuted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'orderId', type: 'uint256' },
      { indexed: false, name: 'reason', type: 'string' },
    ],
    name: 'OrderAutoCancelled',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, name: 'orderId', type: 'uint256' }],
    name: 'OrderAutoReleased',
    type: 'event',
  },
] as const;

// ============================================================
// 6. FEE MANAGER - Fee Calculation & Governance
// ============================================================
export const FEE_MANAGER_ABI = [
  // ── Read Functions ──────────────────────────────────────────
  {
    inputs: [],
    name: 'STABLECOIN_PLATFORM_FEE_BPS',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'ORI_PLATFORM_FEE_BPS',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'platformFeeBps',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'daoFeeBps',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'burnFeeBps',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'referralFeeBps',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'referralVault',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'burnAddress',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'MAX_TOTAL_BPS',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'VERSION',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getTotalFeeBps',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'paymentToken', type: 'address' }],
    name: 'getPlatformFeeBpsForToken',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'paymentToken', type: 'address' }],
    name: 'getTotalFeeBpsForToken',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'paymentToken', type: 'address' }],
    name: 'platformFeePresetByToken',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'amount', type: 'uint256' }],
    name: 'calculateFees',
    outputs: [
      { name: 'platform', type: 'uint256' },
      { name: 'dao', type: 'uint256' },
      { name: 'burn', type: 'uint256' },
      { name: 'referral', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'paymentToken', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'calculateFeesForToken',
    outputs: [
      { name: 'platform', type: 'uint256' },
      { name: 'dao', type: 'uint256' },
      { name: 'burn', type: 'uint256' },
      { name: 'referral', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },

  // ── Write Functions (GOVERNANCE_ROLE) ───────────────────────
  {
    inputs: [{ name: 'newPlatformFeeBps', type: 'uint256' }],
    name: 'setPlatformFeeBps',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'newPlatformFeeBps', type: 'uint256' },
      { name: 'newDaoFeeBps', type: 'uint256' },
      { name: 'newBurnFeeBps', type: 'uint256' },
      { name: 'newReferralFeeBps', type: 'uint256' },
    ],
    name: 'setFees',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'preset', type: 'uint8' },
    ],
    name: 'setPlatformFeePreset',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'newVault', type: 'address' }],
    name: 'setReferralVault',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },

  // ── Events ──────────────────────────────────────────────────
  {
    anonymous: false,
    inputs: [
      { indexed: false, name: 'platformBps', type: 'uint256' },
      { indexed: false, name: 'daoBps', type: 'uint256' },
      { indexed: false, name: 'burnBps', type: 'uint256' },
      { indexed: false, name: 'referralBps', type: 'uint256' },
    ],
    name: 'FeesUpdated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'token', type: 'address' },
      { indexed: false, name: 'preset', type: 'uint8' },
      { indexed: false, name: 'platformBps', type: 'uint256' },
    ],
    name: 'PlatformFeePresetUpdated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, name: 'newVault', type: 'address' }],
    name: 'ReferralVaultUpdated',
    type: 'event',
  },
] as const;

// ============================================================
// 7. PAYMENT GATEWAY - Escrow & Fund Management
// ============================================================
export const PAYMENT_GATEWAY_ABI = [
  // ── Read Functions ──────────────────────────────────────────
  {
    inputs: [{ name: 'orderId', type: 'uint256' }],
    name: 'escrows',
    outputs: [
      { name: 'token', type: 'address' },
      { name: 'buyer', type: 'address' },
      { name: 'payer', type: 'address' },
      { name: 'refundRecipient', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'token', type: 'address' }],
    name: 'totalEscrowedByToken',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'feeVault',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'burnAddress',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'marketplace',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'VERSION',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },

  // ── Write Functions (MARKETPLACE_ROLE) ──────────────────────
  {
    inputs: [
      { name: 'orderId', type: 'uint256' },
      { name: 'token', type: 'address' },
      { name: 'buyer', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'depositEscrow',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'orderId', type: 'uint256' },
      { name: 'seller', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'releaseToSeller',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'orderId', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'refundBuyer',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'orderId', type: 'uint256' },
      { name: 'p', type: 'uint256' },
      { name: 'd', type: 'uint256' },
      { name: 'b', type: 'uint256' },
    ],
    name: 'distributeFees',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'orderId', type: 'uint256' },
      { name: 'feeAmount', type: 'uint256' },
    ],
    name: 'deductDisputeFee',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // EMERGENCY_ROLE
  {
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'emergencyWithdraw',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // GOVERNANCE_ROLE
  {
    inputs: [],
    name: 'pause',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'unpause',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

// ============================================================
// 8. UNIT REGISTRY - Asset Unit Validation
// ============================================================
export const UNIT_REGISTRY_ABI = [
  // ── Read Functions ──────────────────────────────────────────
  {
    inputs: [{ name: 'unitId', type: 'uint256' }],
    name: 'getUnit',
    outputs: [
      {
        components: [
          { name: 'name', type: 'string' },
          { name: 'step', type: 'uint256' },
          { name: 'minAmount', type: 'uint256' },
          { name: 'active', type: 'bool' },
          { name: 'locked', type: 'bool' },
        ],
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'nextUnitId',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'VERSION',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'unitId', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'validateAmount',
    outputs: [],
    stateMutability: 'view',
    type: 'function',
  },

  // ── Write Functions (GOVERNANCE_ROLE) ───────────────────────
  {
    inputs: [
      { name: 'name', type: 'string' },
      { name: 'step', type: 'uint256' },
      { name: 'minAmount', type: 'uint256' },
    ],
    name: 'createUnit',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'unitId', type: 'uint256' },
      { name: 'active', type: 'bool' },
    ],
    name: 'toggleUnitActive',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'unitId', type: 'uint256' },
      { name: 'newStep', type: 'uint256' },
      { name: 'newMin', type: 'uint256' },
    ],
    name: 'updateLimits',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // RWA_ROLE
  {
    inputs: [{ name: 'unitId', type: 'uint256' }],
    name: 'lockUnit',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

// ============================================================
// 9. SHIPPING REGISTRY - Shipping Options
// ============================================================
export const SHIPPING_REGISTRY_ABI = [
  // ── Read Functions ──────────────────────────────────────────
  {
    inputs: [{ name: 'id', type: 'uint256' }],
    name: 'getOption',
    outputs: [
      {
        components: [
          { name: 'shipType', type: 'uint8' },   // 0=FREE, 1=ORINA_API, 2=SELF
          { name: 'estTimeMin', type: 'uint256' },
          { name: 'estTimeMax', type: 'uint256' },
          { name: 'feeBps', type: 'uint256' },
          { name: 'active', type: 'bool' },
        ],
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'nextOptionId',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'MAX_FEE_BPS',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'VERSION',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },

  // ── Write Functions (GOVERNANCE_ROLE) ───────────────────────
  {
    inputs: [
      { name: 'shipType', type: 'uint8' },
      { name: 'minT', type: 'uint256' },
      { name: 'maxT', type: 'uint256' },
      { name: 'feeBps', type: 'uint256' },
    ],
    name: 'createOption',
    outputs: [{ name: 'id', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'id', type: 'uint256' },
      { name: 'active', type: 'bool' },
    ],
    name: 'toggleOption',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

// ============================================================
// 10. ERC20 Standard (for PaymentGateway token interactions)
// ============================================================
export const ERC20_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'name',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// ============================================================
// 11. M2M / Delegated Session ABI Fragments
// ============================================================

export const MARKETPLACE_M2M_ABI = [
  {
    inputs: [{ name: 'orderId', type: 'uint256' }],
    name: 'orderFunding',
    outputs: [
      { name: 'buyer', type: 'address' },
      { name: 'payer', type: 'address' },
      { name: 'refundRecipient', type: 'address' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'orderId', type: 'uint256' }],
    name: 'orderParties',
    outputs: [
      { name: 'buyer', type: 'address' },
      { name: 'seller', type: 'address' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'delegationManager',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: '_delegationManager', type: 'address' }],
    name: 'setDelegationManager',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'rootBuyer', type: 'address' },
      { name: 'seller', type: 'address' },
      { name: 'payerVault', type: 'address' },
      { name: 'paymentToken', type: 'address' },
      { name: 'assetId', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
      { name: 'grossPriceProposed', type: 'uint256' },
      { name: 'proposedEstDeliverySeconds', type: 'uint256' },
      { name: 'sessionNonce', type: 'uint256' },
    ],
    name: 'createOrderFor',
    outputs: [{ name: 'orderId', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'orderId', type: 'uint256' },
      { name: 'rootBuyer', type: 'address' },
      { name: 'payerVault', type: 'address' },
      { name: 'sessionNonce', type: 'uint256' },
    ],
    name: 'payOrderFor',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'rootSeller', type: 'address' },
      { name: 'unitId', type: 'uint256' },
      { name: 'totalAmount', type: 'uint256' },
      { name: 'expiryAt', type: 'uint256' },
      { name: 'assetType', type: 'uint8' },
      { name: 'sessionNonce', type: 'uint256' },
    ],
    name: 'mintAssetFor',
    outputs: [{ name: 'assetId', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'orderId', type: 'uint256' },
      { name: 'rootSeller', type: 'address' },
      { name: 'estDeliverySeconds', type: 'uint256' },
      { name: 'sessionNonce', type: 'uint256' },
    ],
    name: 'sellerConfirmFor',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

export const PAYMENT_GATEWAY_M2M_ABI = [
  {
    inputs: [{ name: 'orderId', type: 'uint256' }],
    name: 'escrowRouting',
    outputs: [
      { name: 'buyer', type: 'address' },
      { name: 'payer', type: 'address' },
      { name: 'refundRecipient', type: 'address' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'orderId', type: 'uint256' }],
    name: 'escrowAmount',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const DELEGATION_MANAGER_ABI = [
  {
    inputs: [{ name: 'root', type: 'address' }],
    name: 'rootEpoch',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'root', type: 'address' }],
    name: 'nextSessionNonce',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'root', type: 'address' },
    ],
    name: 'hasActiveCycle',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'root', type: 'address' },
    ],
    name: 'activeSessionNonce',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'root', type: 'address' },
      { name: 'sessionNonce', type: 'uint256' },
    ],
    name: 'computeSessionId',
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'pure',
    type: 'function',
  },
  {
    inputs: [
      { name: 'root', type: 'address' },
      { name: 'sessionNonce', type: 'uint256' },
    ],
    name: 'sessionStatus',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'root', type: 'address' },
      { name: 'sessionNonce', type: 'uint256' },
    ],
    name: 'getSession',
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'root', type: 'address' },
          { name: 'delegate', type: 'address' },
          { name: 'payerVault', type: 'address' },
          { name: 'paymentToken', type: 'address' },
          { name: 'maxPerOrder', type: 'uint256' },
          { name: 'maxTotal', type: 'uint256' },
          { name: 'spentTotal', type: 'uint256' },
          { name: 'validFrom', type: 'uint64' },
          { name: 'validUntil', type: 'uint64' },
          { name: 'actionMask', type: 'uint256' },
          { name: 'sessionEpoch', type: 'uint256' },
          { name: 'counterpartyAllowlistHash', type: 'bytes32' },
          { name: 'status', type: 'uint8' },
          { name: 'exists', type: 'bool' },
        ],
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const AI_WALLET_FACTORY_V2_ABI = [
  {
    inputs: [],
    name: 'implementation',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'root', type: 'address' },
      { name: 'sessionNonce', type: 'uint256' },
    ],
    name: 'walletOfSession',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'root', type: 'address' },
      { name: 'sessionNonce', type: 'uint256' },
    ],
    name: 'computeSalt',
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'root', type: 'address' },
      { name: 'sessionNonce', type: 'uint256' },
    ],
    name: 'predictWallet',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'root', type: 'address' },
    ],
    name: 'predictNextWallet',
    outputs: [
      { name: 'wallet', type: 'address' },
      { name: 'sessionNonce', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        name: 'config',
        type: 'tuple',
        components: [
          { name: 'root', type: 'address' },
          { name: 'delegate', type: 'address' },
          { name: 'allowedTarget', type: 'address' },
          { name: 'allowedSpender', type: 'address' },
          { name: 'allowedToken', type: 'address' },
          { name: 'expiry', type: 'uint64' },
          { name: 'actionMask', type: 'uint256' },
          { name: 'maxPerOrder', type: 'uint256' },
          { name: 'maxTotal', type: 'uint256' },
          { name: 'counterpartyAllowlistHash', type: 'bytes32' },
        ],
      },
    ],
    name: 'deployWallet',
    outputs: [
      { name: 'wallet', type: 'address' },
      { name: 'sessionNonce', type: 'uint256' },
      { name: 'sessionId', type: 'bytes32' },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'delegationManager',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const AI_WALLET_V2_ABI = [
  {
    inputs: [],
    name: 'parent',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'delegate',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'delegationManager',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'allowedTarget',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'allowedSpender',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'allowedToken',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'expiry',
    outputs: [{ name: '', type: 'uint64' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'sessionNonce',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'initialized',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'actionMask',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'closed',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'isActive',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'revokeAndSweep',
    outputs: [{ name: 'amount', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'closeExpiredAndSweep',
    outputs: [{ name: 'amount', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'target', type: 'address' },
      { name: 'data', type: 'bytes' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'callWithExactApproval',
    outputs: [{ name: 'result', type: 'bytes' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;
