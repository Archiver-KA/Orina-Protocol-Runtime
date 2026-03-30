import { ACTIVE_CHAIN_ID, CONTRACTS, PAYMENT_TOKENS, PROTOCOL } from "@/config/contracts";
import { deriveOrderProgress } from "@/utils/orderLifecycle";
import type { OrderShippingAddressSnapshot, OrderUiRecord } from "@/types/order";
import { parseOnchainBigIntLike } from "@/utils/onchainNormalization";
import {
  dispatchSyncEvent,
  isSupabaseRestEnabled,
  restSelect,
} from "@/utils/supabaseRest";
import {
  getProtocolNetworkOptionByKey,
  PROTOCOL_NETWORK_STORAGE_KEY,
} from "@/utils/protocolNetwork";

export const RUNTIME_ORDERS_CHANGED_EVENT = "orina:orders-changed";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as `0x${string}`;
const DEFAULT_TOKEN_DECIMALS = 18;
const DEFAULT_ASSET_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><rect width="160" height="160" rx="24" fill="#18181b"/><path d="M36 104l24-28 18 22 20-26 26 32H36z" fill="#2CC295" opacity="0.85"/><circle cx="60" cy="56" r="12" fill="#3f3f46"/></svg>',
  );
const PAYMENT_TOKEN_DECIMALS_BY_SYMBOL: Record<string, number> = {
  USDT: 6,
  USDC: 6,
  WBNB: 18,
  ORI: 18,
};

export interface RuntimeOrderScope {
  chainId?: number | null;
  marketplaceContract?: string | null;
  assetContract?: string | null;
  disputeManagerAddress?: string | null;
  unitRegistryAddress?: string | null;
}

type PaymentTokenSnapshot = {
  symbol?: string;
  decimals?: number;
};

export type PersistedOrderUiRecord = Omit<
  OrderUiRecord,
  | "orderId"
  | "assetId"
  | "unitId"
  | "amount"
  | "grossPrice"
  | "payDeadline"
  | "autoReleaseAt"
  | "disputeDeadline"
  | "disputeOpenedAt"
  | "proposedAt"
  | "paidAt"
  | "depositedAt"
  | "sellerConfirmedAt"
  | "estDeliverySeconds"
  | "platformFeeBpsSnapshot"
  | "daoFeeBpsSnapshot"
  | "burnFeeBpsSnapshot"
  | "disputeBuyerShareBps"
  | "disputeSellerShareBps"
> & {
  orderId: string;
  assetId: string;
  unitId?: string;
  amount: string;
  grossPrice: string;
  payDeadline: string;
  autoReleaseAt: string;
  disputeDeadline?: string;
  disputeOpenedAt?: string;
  proposedAt: string;
  paidAt: string;
  depositedAt: string;
  sellerConfirmedAt: string;
  estDeliverySeconds: string;
  platformFeeBpsSnapshot: string;
  daoFeeBpsSnapshot: string;
  burnFeeBpsSnapshot: string;
  disputeBuyerShareBps?: string;
  disputeSellerShareBps?: string;
};

export interface ProtocolOrderRow {
  id?: string;
  order_uid?: string | null;
  chain_id?: number | null;
  marketplace_contract?: string | null;
  asset_contract?: string | null;
  asset_token_id?: string | null;
  buyer_address?: string | null;
  seller_address?: string | null;
  status?: string | null;
  amount?: string | number | null;
  price_per_unit?: string | number | null;
  total_value?: string | number | null;
  currency_symbol?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  metadata?: Record<string, unknown> | null;
}

function toPersistedOrder(order: OrderUiRecord): PersistedOrderUiRecord {
  return {
    ...order,
    orderId: order.orderId.toString(),
    assetId: order.assetId.toString(),
    unitId: order.unitId?.toString(),
    amount: order.amount.toString(),
    grossPrice: order.grossPrice.toString(),
    payDeadline: order.payDeadline.toString(),
    autoReleaseAt: order.autoReleaseAt.toString(),
    disputeDeadline: order.disputeDeadline?.toString(),
    disputeOpenedAt: order.disputeOpenedAt?.toString(),
    proposedAt: order.proposedAt.toString(),
    paidAt: order.paidAt.toString(),
    depositedAt: order.depositedAt.toString(),
    sellerConfirmedAt: order.sellerConfirmedAt.toString(),
    estDeliverySeconds: order.estDeliverySeconds.toString(),
    platformFeeBpsSnapshot: order.platformFeeBpsSnapshot.toString(),
    daoFeeBpsSnapshot: order.daoFeeBpsSnapshot.toString(),
    burnFeeBpsSnapshot: order.burnFeeBpsSnapshot.toString(),
    disputeBuyerShareBps: order.disputeBuyerShareBps?.toString(),
    disputeSellerShareBps: order.disputeSellerShareBps?.toString(),
  };
}

export function fromPersistedOrder(order: PersistedOrderUiRecord): OrderUiRecord {
  return {
    ...order,
    orderId: BigInt(order.orderId),
    assetId: BigInt(order.assetId),
    unitId: order.unitId ? BigInt(order.unitId) : undefined,
    amount: BigInt(order.amount),
    grossPrice: BigInt(order.grossPrice),
    payDeadline: BigInt(order.payDeadline),
    autoReleaseAt: BigInt(order.autoReleaseAt),
    disputeDeadline: order.disputeDeadline ? BigInt(order.disputeDeadline) : undefined,
    disputeOpenedAt: order.disputeOpenedAt ? BigInt(order.disputeOpenedAt) : undefined,
    proposedAt: BigInt(order.proposedAt),
    paidAt: BigInt(order.paidAt),
    depositedAt: BigInt(order.depositedAt),
    sellerConfirmedAt: BigInt(order.sellerConfirmedAt),
    estDeliverySeconds: BigInt(order.estDeliverySeconds),
    platformFeeBpsSnapshot: BigInt(order.platformFeeBpsSnapshot),
    daoFeeBpsSnapshot: BigInt(order.daoFeeBpsSnapshot),
    burnFeeBpsSnapshot: BigInt(order.burnFeeBpsSnapshot),
    disputeBuyerShareBps: order.disputeBuyerShareBps ? BigInt(order.disputeBuyerShareBps) : undefined,
    disputeSellerShareBps: order.disputeSellerShareBps ? BigInt(order.disputeSellerShareBps) : undefined,
  };
}

function readLocalRuntimeOrders(scope?: RuntimeOrderScope): OrderUiRecord[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(getRuntimeOrdersStorageKey(scope));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as PersistedOrderUiRecord[];
    return Array.isArray(parsed) ? parsed.map(fromPersistedOrder) : [];
  } catch {
    return [];
  }
}

function writeLocalRuntimeOrders(orders: OrderUiRecord[], scope?: RuntimeOrderScope) {
  if (typeof window === "undefined") return;
  const serialized = JSON.stringify(orders.map(toPersistedOrder));
  window.localStorage.setItem(getRuntimeOrdersStorageKey(scope), serialized);
  dispatchSyncEvent(RUNTIME_ORDERS_CHANGED_EVENT);
}

export function mergeOrderRecords(primaryOrders: OrderUiRecord[], secondaryOrders: OrderUiRecord[]) {
  const merged = new Map<string, OrderUiRecord>();
  for (const order of [...secondaryOrders, ...primaryOrders]) {
    const key = order.orderId.toString();
    const existing = merged.get(key);
    if (!existing || (existing.updatedAt ?? 0) < (order.updatedAt ?? 0)) {
      merged.set(key, order);
    }
  }
  return Array.from(merged.values()).sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
}

function parseBigIntLike(value?: string | number | null, fallback = 0n) {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(Math.trunc(value));
  if (typeof value === "string" && value.length > 0) {
    try {
      return BigInt(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function parseNumberLike(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function parseTimestampMs(value?: string | number | null, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsedDate = Date.parse(value);
    if (Number.isFinite(parsedDate)) return parsedDate;
    const parsedNumber = Number(value);
    if (Number.isFinite(parsedNumber)) return parsedNumber;
  }
  return fallback;
}

function looksLikeAddress(value?: string | null) {
  return typeof value === "string" && /^0x[a-fA-F0-9]{40}$/.test(value.trim());
}

function readStoredRuntimeOrderScope(): RuntimeOrderScope {
  if (typeof window === "undefined") {
    return {
      chainId: ACTIVE_CHAIN_ID,
      marketplaceContract: CONTRACTS.MARKETPLACE_ATP,
      assetContract: CONTRACTS.ORINA_RWA,
    };
  }

  try {
    const selectedNetworkKey = window.localStorage.getItem(PROTOCOL_NETWORK_STORAGE_KEY);
    const selectedNetwork = getProtocolNetworkOptionByKey(selectedNetworkKey);
    return {
      chainId: selectedNetwork?.chainId ?? ACTIVE_CHAIN_ID,
      marketplaceContract:
        selectedNetwork?.contracts?.MARKETPLACE_ATP ?? null,
      assetContract:
        selectedNetwork?.contracts?.ORINA_RWA ?? null,
    };
  } catch {
    return {
      chainId: ACTIVE_CHAIN_ID,
      marketplaceContract: CONTRACTS.MARKETPLACE_ATP,
      assetContract: CONTRACTS.ORINA_RWA,
    };
  }
}

function resolveRuntimeOrderScope(scope?: RuntimeOrderScope) {
  const stored = readStoredRuntimeOrderScope();
  const chainId = scope?.chainId ?? stored.chainId ?? ACTIVE_CHAIN_ID;
  const marketplaceContract = String(
    scope?.marketplaceContract
    ?? stored.marketplaceContract
    ?? `unconfigured-marketplace-${chainId}`,
  ).toLowerCase();
  const assetContract = String(
    scope?.assetContract
    ?? stored.assetContract
    ?? `unconfigured-asset-${chainId}`,
  ).toLowerCase();
  const disputeManagerAddress = scope?.disputeManagerAddress ?? null;
  const unitRegistryAddress = scope?.unitRegistryAddress ?? null;

  return {
    chainId,
    marketplaceContract,
    assetContract,
    marketplaceContractAddress: looksLikeAddress(marketplaceContract)
      ? (marketplaceContract as `0x${string}`)
      : null,
    assetContractAddress: looksLikeAddress(assetContract)
      ? (assetContract as `0x${string}`)
      : null,
    disputeManagerAddress: looksLikeAddress(disputeManagerAddress)
      ? (disputeManagerAddress as `0x${string}`)
      : null,
    unitRegistryAddress: looksLikeAddress(unitRegistryAddress)
      ? (unitRegistryAddress as `0x${string}`)
      : null,
  };
}

function getRuntimeOrdersStorageKey(scope?: RuntimeOrderScope) {
  const resolvedScope = resolveRuntimeOrderScope(scope);
  return `orina_runtime_orders_v2:${resolvedScope.chainId}:${resolvedScope.marketplaceContract}`;
}

function coalesceString(...values: Array<unknown>) {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return undefined;
}

function parseAddressLike(value?: string | null) {
  if (value && value.startsWith("0x") && value.length === 42) {
    return value as `0x${string}`;
  }
  return ZERO_ADDRESS;
}

function normalizePaymentTokenAddress(value?: `0x${string}` | null) {
  return (value ?? ZERO_ADDRESS).toLowerCase();
}

function resolvePaymentTokenSnapshot(
  paymentToken?: `0x${string}` | null,
  symbolHint?: string | null,
  decimalsHint?: number | null,
): Required<PaymentTokenSnapshot> {
  if (symbolHint && typeof decimalsHint === "number") {
    return {
      symbol: symbolHint,
      decimals: decimalsHint,
    };
  }

  const normalized = normalizePaymentTokenAddress(paymentToken);
  for (const [symbol, address] of Object.entries(PAYMENT_TOKENS)) {
    if (address.toLowerCase() === normalized) {
      return {
        symbol,
        decimals: PAYMENT_TOKEN_DECIMALS_BY_SYMBOL[symbol] ?? DEFAULT_TOKEN_DECIMALS,
      };
    }
  }

  return {
    symbol: symbolHint || "ERC20",
    decimals: typeof decimalsHint === "number" ? decimalsHint : DEFAULT_TOKEN_DECIMALS,
  };
}

function extractRuntimeOrderMetadata(row: ProtocolOrderRow) {
  if (!row.metadata || typeof row.metadata !== "object") {
    return {};
  }

  const metadata = row.metadata as {
    runtimeOrder?: PersistedOrderUiRecord;
    paymentTokenSymbol?: string;
    paymentTokenDecimals?: number;
    assetUid?: string;
    onchainAssetId?: string | number;
    tokenId?: string;
    assetContract?: string;
    unitId?: string | number;
    unitName?: string;
    unitLabel?: string;
    shippingAddressSnapshot?: OrderShippingAddressSnapshot | null;
    shippingMethodLabel?: string;
    paymentToken?: string;
    assetName?: string;
    assetImage?: string;
    selectedAttributes?: OrderUiRecord["selectedAttributes"];
    chainSnapshot?: Record<string, unknown>;
  };

  return metadata;
}

function toProtocolOrderRow(order: OrderUiRecord, scope?: RuntimeOrderScope): ProtocolOrderRow {
  const resolvedScope = resolveRuntimeOrderScope(scope);
  const amount = Number(order.amount || 0n);
  const grossPrice = Number(order.grossPrice || 0n);
  const pricePerUnit = amount > 0 ? grossPrice / amount : grossPrice;
  const paymentTokenSnapshot = resolvePaymentTokenSnapshot(
    order.paymentToken,
    order.paymentTokenSymbol,
    order.paymentTokenDecimals,
  );
  return {
    order_uid: order.orderId.toString(),
    chain_id: resolvedScope.chainId,
    marketplace_contract: resolvedScope.marketplaceContract,
    asset_contract: (order.assetContract ?? resolvedScope.assetContract).toLowerCase(),
    asset_token_id: order.assetId.toString(),
    buyer_address: order.buyer.toLowerCase(),
    seller_address: order.seller.toLowerCase(),
    status: "pending_settlement",
    amount: String(amount),
    price_per_unit: String(pricePerUnit),
    total_value: String(grossPrice),
    currency_symbol: order.paymentToken,
    metadata: {
      runtimeOrderVersion: 2,
      projection_state: "pending_settlement",
      status_source: "runtime_shadow",
      canonical_status_source: "chain_projection",
      paymentTokenSymbol: paymentTokenSnapshot.symbol,
      paymentTokenDecimals: paymentTokenSnapshot.decimals,
      assetUid: order.assetUid ?? null,
      onchainAssetId: order.assetId.toString(),
      tokenId: order.tokenId ?? order.assetId.toString(),
      assetContract: order.assetContract ?? resolvedScope.assetContract,
      unitId: order.unitId?.toString(),
      unitName: order.unitName ?? null,
      unitLabel: order.unitLabel ?? order.unitName ?? null,
      shippingAddressSnapshot: order.shippingAddressSnapshot ?? null,
      shippingMethodLabel: order.shippingMethodLabel ?? null,
      deploymentScope: {
        chainId: resolvedScope.chainId,
        marketplaceContract: resolvedScope.marketplaceContract,
        assetContract: resolvedScope.assetContract,
      },
      runtimeOrder: toPersistedOrder(order),
      selectedAttributes: order.selectedAttributes ?? [],
    },
  };
}

export function fromProtocolOrderRow(row: ProtocolOrderRow, scope?: RuntimeOrderScope): OrderUiRecord | null {
  const resolvedScope = resolveRuntimeOrderScope(scope);
  const metadata = extractRuntimeOrderMetadata(row);
  const persisted = metadata.runtimeOrder;
  if (persisted) {
    return fromPersistedOrder(persisted);
  }

  if (!row.order_uid || !row.buyer_address || !row.seller_address || !row.asset_token_id) {
    return null;
  }

  const assetId = parseBigIntLike(row.asset_token_id);
  const grossPrice = parseBigIntLike(row.total_value);
  const amount = parseBigIntLike(row.amount, 1n);
  const chainSnapshot =
    metadata.chainSnapshot && typeof metadata.chainSnapshot === "object"
      ? (metadata.chainSnapshot as Record<string, unknown>)
      : null;
  const paymentToken = parseAddressLike(
    coalesceString(
      typeof chainSnapshot?.paymentToken === "string" ? chainSnapshot.paymentToken : undefined,
      metadata.paymentToken,
      looksLikeAddress(row.currency_symbol) ? row.currency_symbol : undefined,
    ),
  );
  const paymentTokenSnapshot = resolvePaymentTokenSnapshot(
    paymentToken,
    coalesceString(
      typeof chainSnapshot?.paymentTokenSymbol === "string" ? chainSnapshot.paymentTokenSymbol : undefined,
      metadata.paymentTokenSymbol,
      looksLikeAddress(row.currency_symbol) ? undefined : row.currency_symbol ?? undefined,
    ),
    parseNumberLike(
      chainSnapshot?.paymentTokenDecimals ?? metadata.paymentTokenDecimals ?? null,
      DEFAULT_TOKEN_DECIMALS,
    ),
  );
  const selectedAttributes = metadata.selectedAttributes ?? [];
  const proposedAt = parseBigIntLike(
    typeof chainSnapshot?.proposedAt === "string" || typeof chainSnapshot?.proposedAt === "number"
      ? (chainSnapshot.proposedAt as string | number)
      : null,
  );
  const paidAt = parseBigIntLike(
    typeof chainSnapshot?.paidAt === "string" || typeof chainSnapshot?.paidAt === "number"
      ? (chainSnapshot.paidAt as string | number)
      : null,
  );
  const autoReleaseAt = parseBigIntLike(
    typeof chainSnapshot?.autoReleaseAt === "string" || typeof chainSnapshot?.autoReleaseAt === "number"
      ? (chainSnapshot.autoReleaseAt as string | number)
      : null,
  );
  const payDeadline = parseBigIntLike(
    typeof chainSnapshot?.payDeadline === "string" || typeof chainSnapshot?.payDeadline === "number"
      ? (chainSnapshot.payDeadline as string | number)
      : null,
  );
  const disputeDeadline = parseBigIntLike(
    typeof chainSnapshot?.disputeDeadline === "string" || typeof chainSnapshot?.disputeDeadline === "number"
      ? (chainSnapshot.disputeDeadline as string | number)
      : null,
  );
  const disputeOpenedAt = parseBigIntLike(
    typeof chainSnapshot?.disputeOpenedAt === "string" || typeof chainSnapshot?.disputeOpenedAt === "number"
      ? (chainSnapshot.disputeOpenedAt as string | number)
      : null,
  );
  const sellerConfirmed = Boolean(chainSnapshot?.sellerConfirmed);
  const finalized = Boolean(chainSnapshot?.finalized);
  const disputed =
    Boolean(chainSnapshot?.disputedActive) || String(row.status || "").trim().toLowerCase() === "disputed";
  const state = (() => {
    if (typeof chainSnapshot?.state === "number" && Number.isFinite(chainSnapshot.state)) {
      return chainSnapshot.state;
    }
    const normalized = String(row.status || "").trim().toLowerCase();
    if (normalized === "finalized") return 3;
    if (normalized === "cancelled") return 4;
    if (normalized === "disputed") return 2;
    if (normalized === "paid" || normalized === "pending_delivery") return 1;
    return 0;
  })();
  const sellerConfirmedAt = parseBigIntLike(
    typeof chainSnapshot?.sellerConfirmedAt === "string" || typeof chainSnapshot?.sellerConfirmedAt === "number"
      ? (chainSnapshot.sellerConfirmedAt as string | number)
      : sellerConfirmed
        ? proposedAt
        : null,
  );
  const estDeliverySeconds = parseBigIntLike(
    typeof chainSnapshot?.estDeliverySeconds === "string" || typeof chainSnapshot?.estDeliverySeconds === "number"
      ? (chainSnapshot.estDeliverySeconds as string | number)
      : null,
  );
  const platformFeeBpsSnapshot = parseBigIntLike(
    typeof chainSnapshot?.platformFeeBpsSnapshot === "string" || typeof chainSnapshot?.platformFeeBpsSnapshot === "number"
      ? (chainSnapshot.platformFeeBpsSnapshot as string | number)
      : null,
  );
  const daoFeeBpsSnapshot = parseBigIntLike(
    typeof chainSnapshot?.daoFeeBpsSnapshot === "string" || typeof chainSnapshot?.daoFeeBpsSnapshot === "number"
      ? (chainSnapshot.daoFeeBpsSnapshot as string | number)
      : null,
  );
  const burnFeeBpsSnapshot = parseBigIntLike(
    typeof chainSnapshot?.burnFeeBpsSnapshot === "string" || typeof chainSnapshot?.burnFeeBpsSnapshot === "number"
      ? (chainSnapshot.burnFeeBpsSnapshot as string | number)
      : null,
  );
  const createdAt = parseTimestampMs(row.created_at, proposedAt > 0n ? Number(proposedAt) * 1000 : Date.now());
  const updatedAt = parseTimestampMs(row.updated_at, createdAt);
  const assetName =
    coalesceString(
      typeof chainSnapshot?.assetName === "string" ? chainSnapshot.assetName : undefined,
      metadata.assetName,
    ) ?? `Asset #${assetId.toString()}`;
  const assetUid = coalesceString(
    typeof chainSnapshot?.assetUid === "string" ? chainSnapshot.assetUid : undefined,
    metadata.assetUid,
  );
  const tokenId = coalesceString(
    typeof chainSnapshot?.tokenId === "string" ? chainSnapshot.tokenId : undefined,
    metadata.tokenId,
    row.asset_token_id,
  );
  const assetContract = parseAddressLike(
    coalesceString(
      typeof chainSnapshot?.assetContract === "string" ? chainSnapshot.assetContract : undefined,
      metadata.assetContract,
      row.asset_contract,
      resolvedScope.assetContractAddress ?? undefined,
    ),
  );
  const unitIdSource =
    chainSnapshot?.unitId !== undefined
      ? (chainSnapshot.unitId as string | number)
      : metadata.unitId;
  const unitName =
    coalesceString(
      typeof chainSnapshot?.unitName === "string" ? chainSnapshot.unitName : undefined,
      metadata.unitName,
    );
  const unitLabel =
    coalesceString(
      typeof chainSnapshot?.unitLabel === "string" ? chainSnapshot.unitLabel : undefined,
      metadata.unitLabel,
      unitName,
    );
  const buyerSig1Present =
    chainSnapshot?.buyerSig1Present === undefined ? true : Boolean(chainSnapshot.buyerSig1Present);
  const sellerSigPresent =
    chainSnapshot?.sellerSigPresent === undefined ? sellerConfirmed : Boolean(chainSnapshot.sellerSigPresent);
  const buyerSig2Present =
    chainSnapshot?.buyerSig2Present === undefined
      ? Boolean(finalized || state >= 1 || paidAt > 0n)
      : Boolean(chainSnapshot.buyerSig2Present);

  return {
    orderId: parseBigIntLike(row.order_uid),
    buyer: parseAddressLike(row.buyer_address),
    seller: parseAddressLike(row.seller_address),
    assetId,
    assetUid,
    tokenId,
    assetContract,
    assetName,
    unitId: unitIdSource !== undefined ? parseBigIntLike(unitIdSource) : undefined,
    unitName,
    unitLabel,
    network:
      resolvedScope.chainId === 56 || resolvedScope.chainId === 97
        ? "bnb"
        : `chain-${resolvedScope.chainId}`,
    assetImage: metadata.assetImage || DEFAULT_ASSET_IMAGE,
    amount: amount > 0n ? amount : 1n,
    grossPrice,
    payDeadline,
    autoReleaseAt,
    disputeDeadline: disputeDeadline > 0n ? disputeDeadline : undefined,
    disputeOpenedAt: disputeOpenedAt > 0n ? disputeOpenedAt : undefined,
    state,
    finalized,
    disputed,
    disputeExtended: Boolean(chainSnapshot?.disputeExtended),
    sellerConfirmed,
    paymentSent: paidAt > 0n || state >= 1,
    deliveryConfirmed: finalized || state === 3,
    createdAt,
    updatedAt,
    proposedAt,
    paidAt,
    depositedAt: paidAt > 0n ? paidAt : proposedAt,
    sellerConfirmedAt,
    estDeliverySeconds,
    paymentToken,
    paymentTokenSymbol: paymentTokenSnapshot.symbol,
    paymentTokenDecimals: paymentTokenSnapshot.decimals,
    platformFeeBpsSnapshot,
    daoFeeBpsSnapshot,
    burnFeeBpsSnapshot,
    shippingAddressSnapshot: metadata.shippingAddressSnapshot ?? null,
    shippingMethodLabel: metadata.shippingMethodLabel,
    disputeBuyerShareBps: parseBigIntLike(
      typeof chainSnapshot?.disputeBuyerShareBps === "string" || typeof chainSnapshot?.disputeBuyerShareBps === "number"
        ? (chainSnapshot.disputeBuyerShareBps as string | number)
        : null,
    ) || undefined,
    disputeSellerShareBps: parseBigIntLike(
      typeof chainSnapshot?.disputeSellerShareBps === "string" || typeof chainSnapshot?.disputeSellerShareBps === "number"
        ? (chainSnapshot.disputeSellerShareBps as string | number)
        : null,
    ) || undefined,
    selectedAttributes,
    settlementType: parseNumberLike(chainSnapshot?.settlementType, 0),
    progress: deriveOrderProgress(state, finalized, sellerConfirmed, payDeadline, autoReleaseAt, proposedAt),
    signatures: {
      buyer1: buyerSig1Present,
      seller: sellerSigPresent,
      buyer2: buyerSig2Present,
    },
  };
}

export async function readProjectedOrdersForWallet(
  walletAddress?: string | null,
  scope?: RuntimeOrderScope,
) {
  const resolvedScope = resolveRuntimeOrderScope(scope);
  if (
    !isSupabaseRestEnabled()
    || !walletAddress
    || !resolvedScope.marketplaceContractAddress
  ) {
    return [] as OrderUiRecord[];
  }

  const normalized = walletAddress.toLowerCase();
  const remoteRows = await restSelect<ProtocolOrderRow>(
    "protocol_orders",
    `?chain_id=eq.${resolvedScope.chainId}&marketplace_contract=eq.${resolvedScope.marketplaceContract}&or=(buyer_address.eq.${normalized},seller_address.eq.${normalized})`,
  );
  return remoteRows
    .map((row) => fromProtocolOrderRow(row, resolvedScope))
    .filter((value): value is OrderUiRecord => !!value);
}

export async function hydrateRuntimeOrdersFromSupabase(
  walletAddress?: string | null,
  scope?: RuntimeOrderScope,
) {
  if (!isSupabaseRestEnabled() || !walletAddress) {
    return loadRuntimeOrders(walletAddress, scope);
  }

  try {
    const resolvedScope = resolveRuntimeOrderScope(scope);
    const remoteOrders = await readProjectedOrdersForWallet(walletAddress, resolvedScope);
    const remoteOrderIds = new Set(remoteOrders.map((order) => order.orderId.toString()));
    const localOnlyOrders = readLocalRuntimeOrders(resolvedScope).filter(
      (order) => !remoteOrderIds.has(order.orderId.toString()),
    );
    const merged = mergeOrderRecords(remoteOrders, localOnlyOrders);
    writeLocalRuntimeOrders(merged, resolvedScope);
    return loadRuntimeOrders(walletAddress, resolvedScope);
  } catch (error) {
    console.warn("[runtimeOrders] Failed to hydrate runtime orders from Supabase", error);
    return loadRuntimeOrders(walletAddress, scope);
  }
}

export function loadRuntimeOrders(walletAddress?: string | null, scope?: RuntimeOrderScope): OrderUiRecord[] {
  const orders = readLocalRuntimeOrders(scope);
  if (!walletAddress) return orders;
  const normalized = walletAddress.toLowerCase();
  return orders.filter(
    (order) =>
      order.buyer.toLowerCase() === normalized || order.seller.toLowerCase() === normalized,
  );
}

export function saveRuntimeOrders(orders: OrderUiRecord[], scope?: RuntimeOrderScope) {
  writeLocalRuntimeOrders(orders, scope);
}

export function upsertRuntimeOrder(order: OrderUiRecord, scope?: RuntimeOrderScope) {
  const current = readLocalRuntimeOrders(scope);
  const next = mergeOrderRecords(
    current.filter((existing) => existing.orderId !== order.orderId),
    [order],
  );
  writeLocalRuntimeOrders(next, scope);
}

export function patchRuntimeOrder(
  orderId: bigint,
  updater: (order: OrderUiRecord) => OrderUiRecord,
  scope?: RuntimeOrderScope,
) {
  const current = readLocalRuntimeOrders(scope);
  const target = current.find((order) => order.orderId === orderId);
  if (!target) return null;
  const nextOrder = updater(target);
  upsertRuntimeOrder(nextOrder, scope);
  return nextOrder;
}

export function subscribeToRuntimeOrders(listener: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => listener();
  window.addEventListener(RUNTIME_ORDERS_CHANGED_EVENT, handler as EventListener);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(RUNTIME_ORDERS_CHANGED_EVENT, handler as EventListener);
    window.removeEventListener("storage", handler);
  };
}

export function createRuntimeOrderFromRwaIntent(params: {
  orderId: bigint;
  buyer: `0x${string}`;
  asset: {
    id: bigint | number | string;
    assetUid?: string;
    tokenId?: string;
    onchainAssetId?: bigint | number | string;
    assetContract?: `0x${string}`;
    name?: string;
    image?: string;
    imageUrl?: string;
    unitId?: bigint | number | string;
    unitName?: string;
    unitLabel?: string;
    seller: { address: `0x${string}` } | `0x${string}`;
  };
  quantity: number;
  grossPrice: bigint;
  estDeliverySeconds: bigint;
  paymentToken: `0x${string}`;
  paymentTokenSymbol?: string;
  paymentTokenDecimals?: number;
  shippingAddressSnapshot?: OrderShippingAddressSnapshot | null;
  shippingMethodLabel?: string;
  selectedAttributes?: OrderUiRecord["selectedAttributes"];
  scope?: RuntimeOrderScope;
}) {
  const resolvedScope = resolveRuntimeOrderScope(params.scope);
  const orderNow = Date.now();
  const quantity = BigInt(Math.max(1, Math.trunc(params.quantity)));
  const sellerAddress =
    typeof params.asset.seller === "string" ? params.asset.seller : params.asset.seller.address;
  const canonicalAssetIdSource =
    params.asset.onchainAssetId ?? params.asset.tokenId ?? params.asset.id;
  const assetIdValue = parseOnchainBigIntLike(canonicalAssetIdSource);
  if (assetIdValue === null) {
    throw new Error("createRuntimeOrderFromRwaIntent requires a canonical on-chain assetId");
  }
  const unitIdValue =
    params.asset.unitId === undefined
      ? undefined
      : parseOnchainBigIntLike(params.asset.unitId);
  if (params.asset.unitId !== undefined && unitIdValue === null) {
    throw new Error("createRuntimeOrderFromRwaIntent received an invalid unitId");
  }
  const proposedAt = BigInt(Math.floor(orderNow / 1000));
  const paymentToken = params.paymentToken;
  const paymentTokenSnapshot = resolvePaymentTokenSnapshot(
    paymentToken,
    params.paymentTokenSymbol,
    params.paymentTokenDecimals,
  );

  const order: OrderUiRecord = {
    orderId: params.orderId,
    buyer: params.buyer,
    seller: sellerAddress,
    assetId: assetIdValue,
    assetUid: params.asset.assetUid ?? (typeof params.asset.id === "string" ? params.asset.id : undefined),
    tokenId:
      typeof params.asset.tokenId === "string"
        ? params.asset.tokenId
        : typeof canonicalAssetIdSource === "string" || typeof canonicalAssetIdSource === "number"
          ? String(canonicalAssetIdSource)
          : assetIdValue.toString(),
    assetContract:
      params.asset.assetContract
      ?? resolvedScope.assetContractAddress
      ?? CONTRACTS.ORINA_RWA,
    assetName: params.asset.name ?? `Asset #${assetIdValue.toString()}`,
    unitId: unitIdValue,
    unitName: params.asset.unitName,
    unitLabel: params.asset.unitLabel ?? params.asset.unitName,
    network:
      resolvedScope.chainId === 56 || resolvedScope.chainId === 97
        ? "bnb"
        : `chain-${resolvedScope.chainId}`,
    assetImage: params.asset.imageUrl ?? params.asset.image ?? "",
    amount: quantity,
    grossPrice: params.grossPrice,
    payDeadline: 0n,
    autoReleaseAt: 0n,
    state: 0,
    finalized: false,
    disputed: false,
    disputeExtended: false,
    sellerConfirmed: false,
    paymentSent: false,
    deliveryConfirmed: false,
    createdAt: orderNow,
    updatedAt: orderNow,
    deliveryDeadline: orderNow + Number(params.estDeliverySeconds) * 1000,
    proposedAt,
    paidAt: 0n,
    depositedAt: proposedAt,
    sellerConfirmedAt: 0n,
    estDeliverySeconds: params.estDeliverySeconds,
    paymentToken,
    paymentTokenSymbol: paymentTokenSnapshot.symbol,
    paymentTokenDecimals: paymentTokenSnapshot.decimals,
    platformFeeBpsSnapshot: BigInt(PROTOCOL.STABLECOIN_PLATFORM_FEE_BPS),
    daoFeeBpsSnapshot: BigInt(PROTOCOL.DEFAULT_DAO_FEE_BPS),
    burnFeeBpsSnapshot: BigInt(PROTOCOL.DEFAULT_BURN_FEE_BPS),
    shippingAddressSnapshot: params.shippingAddressSnapshot ?? null,
    shippingMethodLabel: params.shippingMethodLabel,
    disputeBuyerShareBps: undefined,
    disputeSellerShareBps: undefined,
    selectedAttributes: params.selectedAttributes ?? [],
    settlementType: 0,
    progress: 15,
    signatures: {
      buyer1: true,
      seller: false,
      buyer2: false,
    },
  };

  upsertRuntimeOrder(order, resolvedScope);
  return order;
}
