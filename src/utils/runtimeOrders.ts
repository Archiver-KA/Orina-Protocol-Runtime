import { ACTIVE_CHAIN_ID, CONTRACTS } from "@/config/contracts";
import type { OrderUiRecord } from "@/types/order";
import {
  dispatchSyncEvent,
  isSupabaseRestEnabled,
  restSelect,
  restUpsert,
} from "@/utils/supabaseRest";

const RUNTIME_ORDERS_STORAGE_KEY = "orina_runtime_orders_v1";
export const RUNTIME_ORDERS_CHANGED_EVENT = "orina:orders-changed";

type PersistedOrderUiRecord = Omit<OrderUiRecord, "orderId" | "assetId" | "amount" | "grossPrice"> & {
  orderId: string;
  assetId: string;
  amount: string;
  grossPrice: string;
};

interface ProtocolOrderRow {
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
    amount: order.amount.toString(),
    grossPrice: order.grossPrice.toString(),
  };
}

function fromPersistedOrder(order: PersistedOrderUiRecord): OrderUiRecord {
  return {
    ...order,
    orderId: BigInt(order.orderId),
    assetId: BigInt(order.assetId),
    amount: BigInt(order.amount),
    grossPrice: BigInt(order.grossPrice),
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

function mergeRuntimeOrders(localOrders: OrderUiRecord[], remoteOrders: OrderUiRecord[]) {
  const merged = new Map<string, OrderUiRecord>();
  for (const order of [...remoteOrders, ...localOrders]) {
    const key = order.orderId.toString();
    const existing = merged.get(key);
    if (!existing || existing.updatedAt < order.updatedAt) {
      merged.set(key, order);
    }
  }
  return Array.from(merged.values()).sort((a, b) => b.updatedAt - a.updatedAt);
}

function toProtocolOrderRow(order: OrderUiRecord): ProtocolOrderRow {
  const amount = Number(order.amount || 0n);
  const grossPrice = Number(order.grossPrice || 0n);
  const pricePerUnit = amount > 0 ? grossPrice / amount : grossPrice;
  return {
    order_uid: order.orderId.toString(),
    chain_id: ACTIVE_CHAIN_ID,
    marketplace_contract: CONTRACTS.MARKETPLACE_ATP,
    asset_contract: CONTRACTS.ORINA_RWA,
    asset_token_id: order.assetId.toString(),
    buyer_address: order.buyer.address.toLowerCase(),
    seller_address: order.seller.address.toLowerCase(),
    status: "pending_settlement",
    amount: String(amount),
    price_per_unit: String(pricePerUnit),
    total_value: String(grossPrice),
    currency_symbol: "ETH",
    metadata: {
      runtimeOrderVersion: 1,
      projection_state: "pending_settlement",
      status_source: "runtime_shadow",
      canonical_status_source: "chain_projection",
      runtimeOrder: toPersistedOrder(order),
      selectedAttributes: order.selectedAttributes ?? [],
    },
  };
}

function fromProtocolOrderRow(row: ProtocolOrderRow): OrderUiRecord | null {
  const metadata = row.metadata;
  if (!metadata || typeof metadata !== "object") return null;
  const persisted = (metadata as { runtimeOrder?: PersistedOrderUiRecord }).runtimeOrder;
  if (!persisted) return null;
  return fromPersistedOrder(persisted);
}

async function syncRuntimeOrderToSupabase(order: OrderUiRecord) {
  if (!isSupabaseRestEnabled()) return;
  try {
    await restUpsert<ProtocolOrderRow>("protocol_orders", [toProtocolOrderRow(order)], {
      onConflict: "order_uid",
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
    const normalized = walletAddress.toLowerCase();
    const remoteRows = await restSelect<ProtocolOrderRow>(
      "protocol_orders",
      `or=(buyer_address.eq.${encodeURIComponent(normalized)},seller_address.eq.${encodeURIComponent(normalized)})`,
    );
    const remoteOrders = remoteRows.map(fromProtocolOrderRow).filter((value): value is OrderUiRecord => !!value);
    const merged = mergeRuntimeOrders(readLocalRuntimeOrders(), remoteOrders);
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
      order.buyer.address.toLowerCase() === normalized || order.seller.address.toLowerCase() === normalized,
  );
}

export function saveRuntimeOrders(orders: OrderUiRecord[]) {
  writeLocalRuntimeOrders(orders);
}

export function upsertRuntimeOrder(order: OrderUiRecord) {
  const current = readLocalRuntimeOrders();
  const next = mergeRuntimeOrders(
    current.filter((existing) => existing.orderId !== order.orderId),
    [order],
  );
  writeLocalRuntimeOrders(next);
  void syncRuntimeOrderToSupabase(order);
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
  assetId: string;
  assetName: string;
  assetImage: string;
  buyerAddress: string;
  sellerAddress: string;
  quantity: number;
  totalEth: number;
  selectedAttributes?: OrderUiRecord["selectedAttributes"];
}) {
  const orderNow = Date.now();
  const orderId = BigInt(orderNow);
  const quantity = BigInt(Math.max(1, Math.trunc(params.quantity)));
  const totalWei = BigInt(Math.max(0, Math.round(params.totalEth * 1_000_000)));

  const order: OrderUiRecord = {
    orderId,
    state: "PENDING_CONFIRM",
    finalized: false,
    disputed: false,
    sellerConfirmed: false,
    paymentSent: false,
    deliveryConfirmed: false,
    createdAt: orderNow,
    updatedAt: orderNow,
    deliveryDeadline: orderNow + 7 * 24 * 60 * 60 * 1000,
    assetId: BigInt(Number(params.assetId) || orderNow),
    assetName: params.assetName,
    assetImage: params.assetImage,
    amount: quantity,
    grossPrice: totalWei,
    buyer: {
      address: params.buyerAddress,
      label: `${params.buyerAddress.slice(0, 6)}...${params.buyerAddress.slice(-4)}`,
      avatarSeed: params.buyerAddress,
    },
    seller: {
      address: params.sellerAddress,
      label: `${params.sellerAddress.slice(0, 6)}...${params.sellerAddress.slice(-4)}`,
      avatarSeed: params.sellerAddress,
    },
    selectedAttributes: params.selectedAttributes ?? [],
  };

  upsertRuntimeOrder(order);
  return order;
}
