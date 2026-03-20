import { ACTIVE_CHAIN_ID, CONTRACTS, PAYMENT_TOKENS, PROTOCOL } from "@/config/contracts";
import type { OrderShippingAddressSnapshot, OrderUiRecord } from "@/types/order";
import {
  dispatchSyncEvent,
  isSupabaseRestEnabled,
  restSelect,
  restUpsert,
} from "@/utils/supabaseRest";

const CURRENT_MARKETPLACE_CONTRACT = CONTRACTS.MARKETPLACE_ATP.toLowerCase();
const CURRENT_ASSET_CONTRACT = CONTRACTS.ORINA_RWA.toLowerCase();
const RUNTIME_ORDERS_STORAGE_KEY = `orina_runtime_orders_v2:${ACTIVE_CHAIN_ID}:${CURRENT_MARKETPLACE_CONTRACT}`;
export const RUNTIME_ORDERS_CHANGED_EVENT = "orina:orders-changed";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as `0x${string}`;
const DEFAULT_TOKEN_DECIMALS = 18;
const PAYMENT_TOKEN_DECIMALS_BY_SYMBOL: Record<string, number> = {
  USDT: 6,
  USDC: 6,
  WBNB: 18,
  ORI: 18,
};

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

function readLocalRuntimeOrders(): OrderUiRecord[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(RUNTIME_ORDERS_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as PersistedOrderUiRecord[];
    return Array.isArray(parsed) ? parsed.map(fromPersistedOrder) : [];
  } catch {
    return [];
  }
}

function writeLocalRuntimeOrders(orders: OrderUiRecord[]) {
  if (typeof window === "undefined") return;
  const serialized = JSON.stringify(orders.map(toPersistedOrder));
  window.localStorage.setItem(RUNTIME_ORDERS_STORAGE_KEY, serialized);
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
    unitId?: string | number;
    unitName?: string;
    shippingAddressSnapshot?: OrderShippingAddressSnapshot | null;
    shippingMethodLabel?: string;
  };

  return metadata;
}

function toProtocolOrderRow(order: OrderUiRecord): ProtocolOrderRow {
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
    chain_id: ACTIVE_CHAIN_ID,
    marketplace_contract: CURRENT_MARKETPLACE_CONTRACT,
    asset_contract: CURRENT_ASSET_CONTRACT,
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
      unitId: order.unitId?.toString(),
      unitName: order.unitName ?? null,
      shippingAddressSnapshot: order.shippingAddressSnapshot ?? null,
      shippingMethodLabel: order.shippingMethodLabel ?? null,
      deploymentScope: {
        chainId: ACTIVE_CHAIN_ID,
        marketplaceContract: CURRENT_MARKETPLACE_CONTRACT,
        assetContract: CURRENT_ASSET_CONTRACT,
      },
      runtimeOrder: toPersistedOrder(order),
      selectedAttributes: order.selectedAttributes ?? [],
    },
  };
}

export function fromProtocolOrderRow(row: ProtocolOrderRow): OrderUiRecord | null {
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
  const paymentToken = parseAddressLike(row.currency_symbol);
  const paymentTokenSnapshot = resolvePaymentTokenSnapshot(
    paymentToken,
    metadata.paymentTokenSymbol,
    metadata.paymentTokenDecimals,
  );
  const selectedAttributes = metadata.selectedAttributes ?? [];
  const nowMs = Date.now();

  return {
    orderId: parseBigIntLike(row.order_uid),
    buyer: parseAddressLike(row.buyer_address),
    seller: parseAddressLike(row.seller_address),
    assetId,
    assetName: `Asset #${assetId.toString()}`,
    unitId: metadata.unitId !== undefined ? parseBigIntLike(metadata.unitId) : undefined,
    unitName: metadata.unitName,
    network: "bnb",
    assetImage: "",
    amount: amount > 0n ? amount : 1n,
    grossPrice,
    payDeadline: 0n,
    autoReleaseAt: 0n,
    state: 0,
    finalized: false,
    disputed: false,
    disputeExtended: false,
    sellerConfirmed: false,
    paymentSent: false,
    deliveryConfirmed: false,
    createdAt: nowMs,
    updatedAt: nowMs,
    proposedAt: 0n,
    paidAt: 0n,
    depositedAt: 0n,
    sellerConfirmedAt: 0n,
    estDeliverySeconds: 0n,
    paymentToken,
    paymentTokenSymbol: paymentTokenSnapshot.symbol,
    paymentTokenDecimals: paymentTokenSnapshot.decimals,
    platformFeeBpsSnapshot: 0n,
    daoFeeBpsSnapshot: 0n,
    burnFeeBpsSnapshot: 0n,
    shippingAddressSnapshot: metadata.shippingAddressSnapshot ?? null,
    shippingMethodLabel: metadata.shippingMethodLabel,
    disputeBuyerShareBps: undefined,
    disputeSellerShareBps: undefined,
    selectedAttributes,
    settlementType: 0,
    progress: 15,
    signatures: {
      buyer1: true,
      seller: false,
      buyer2: false,
    },
  };
}

export async function readProjectedOrdersForWallet(walletAddress?: string | null) {
  if (!isSupabaseRestEnabled() || !walletAddress) {
    return [] as OrderUiRecord[];
  }

  const normalized = walletAddress.toLowerCase();
  const remoteRows = await restSelect<ProtocolOrderRow>(
    "protocol_orders",
    `?chain_id=eq.${ACTIVE_CHAIN_ID}&marketplace_contract=eq.${CURRENT_MARKETPLACE_CONTRACT}&or=(buyer_address.eq.${normalized},seller_address.eq.${normalized})`,
  );
  return remoteRows.map(fromProtocolOrderRow).filter((value): value is OrderUiRecord => !!value);
}

async function syncRuntimeOrderToSupabase(order: OrderUiRecord) {
  if (!isSupabaseRestEnabled()) return;
  try {
    await restUpsert<ProtocolOrderRow>("protocol_orders", [toProtocolOrderRow(order)], {
      onConflict: "chain_id,marketplace_contract,order_uid",
    });
  } catch (error) {
    console.warn("[runtimeOrders] Failed to sync runtime order to Supabase", error);
  }
}

export async function hydrateRuntimeOrdersFromSupabase(walletAddress?: string | null) {
  if (!isSupabaseRestEnabled() || !walletAddress) {
    return loadRuntimeOrders(walletAddress);
  }

  try {
    const remoteOrders = await readProjectedOrdersForWallet(walletAddress);
    const merged = mergeOrderRecords(readLocalRuntimeOrders(), remoteOrders);
    writeLocalRuntimeOrders(merged);
    return loadRuntimeOrders(walletAddress);
  } catch (error) {
    console.warn("[runtimeOrders] Failed to hydrate runtime orders from Supabase", error);
    return loadRuntimeOrders(walletAddress);
  }
}

export function loadRuntimeOrders(walletAddress?: string | null): OrderUiRecord[] {
  const orders = readLocalRuntimeOrders();
  if (!walletAddress) return orders;
  const normalized = walletAddress.toLowerCase();
  return orders.filter(
    (order) =>
      order.buyer.toLowerCase() === normalized || order.seller.toLowerCase() === normalized,
  );
}

export function saveRuntimeOrders(orders: OrderUiRecord[]) {
  writeLocalRuntimeOrders(orders);
}

export function upsertRuntimeOrder(order: OrderUiRecord) {
  const current = readLocalRuntimeOrders();
  const next = mergeOrderRecords(
    current.filter((existing) => existing.orderId !== order.orderId),
    [order],
  );
  writeLocalRuntimeOrders(next);
  void syncRuntimeOrderToSupabase(order);
}

export function patchRuntimeOrder(
  orderId: bigint,
  updater: (order: OrderUiRecord) => OrderUiRecord,
) {
  const current = readLocalRuntimeOrders();
  const target = current.find((order) => order.orderId === orderId);
  if (!target) return null;
  const nextOrder = updater(target);
  upsertRuntimeOrder(nextOrder);
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
    name?: string;
    image?: string;
    imageUrl?: string;
    unitId?: bigint | number | string;
    unitName?: string;
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
}) {
  const orderNow = Date.now();
  const quantity = BigInt(Math.max(1, Math.trunc(params.quantity)));
  const sellerAddress =
    typeof params.asset.seller === "string" ? params.asset.seller : params.asset.seller.address;
  const assetIdValue =
    typeof params.asset.id === "bigint"
      ? params.asset.id
      : BigInt(Number(params.asset.id) || orderNow);
  const unitIdValue =
    params.asset.unitId === undefined
      ? undefined
      : typeof params.asset.unitId === "bigint"
        ? params.asset.unitId
        : BigInt(Number(params.asset.unitId) || 0);
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
    assetName: params.asset.name ?? `Asset #${assetIdValue.toString()}`,
    unitId: unitIdValue,
    unitName: params.asset.unitName,
    network: "bnb",
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

  upsertRuntimeOrder(order);
  return order;
}
