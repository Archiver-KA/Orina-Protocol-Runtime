import type { MyAssetReceipt } from '@/app/components/cards/my-asset-cards';
import type { OrderUiRecord } from '@/types/order';
import { formatOrderGrossPrice } from '@/utils/orderDisplay';
import { LIVE_PROTOCOL_CHAIN_ID, LIVE_PROTOCOL_CONTRACTS } from '@/utils/protocolNetwork';
import {
  dispatchSyncEvent,
  encodeEq,
  encodeIn,
  isSupabaseRestEnabled,
  restSelect,
  toQuery,
} from '@/utils/supabaseRest';
import { ensureSupabaseBridgeAccessToken } from '@/utils/supabaseAuthClaimBridge';
import {
  fromProtocolOrderRow,
  loadRuntimeOrders,
  mergeOrderRecords,
  readProjectedOrdersForWallet,
  type ProtocolOrderRow,
  type RuntimeOrderScope,
} from '@/utils/runtimeOrders';
import { getSupabaseFunctionUrl } from '/utils/supabase/functions';
import { runtimeConfig } from '/utils/runtimeConfig';

export interface RuntimeReceiptScope extends Pick<RuntimeOrderScope, 'chainId' | 'marketplaceContract' | 'assetContract'> {
  receiptContract?: string | null;
}

interface ProtocolReceiptRow {
  token_id?: string | number | null;
  order_id?: string | number | null;
  owner_address?: string | null;
  amount?: string | number | null;
  asset_type?: number | null;
  chain_id?: number | null;
  contract_address?: string | null;
  tx_hash?: string | null;
  log_index?: number | null;
  block_number?: number | null;
  block_time?: string | null;
}

interface ProtocolAssetRow {
  token_id?: string | null;
  asset_contract?: string | null;
  metadata?: Record<string, unknown> | null;
}

interface StoredRuntimeReceiptAsset extends MyAssetReceipt {
  ownerWallet: string;
}

export interface RuntimeReceiptSyncResponse {
  success: boolean;
  walletAddress: string;
  synced: number;
  errors: number;
  fromBlock: number;
  toBlock: number;
  receiptCount: number;
  syncMode?: string;
  receipts: ProtocolReceiptRow[];
  ownedReceipts: MyAssetReceipt[];
}

export const RUNTIME_RECEIPTS_CHANGED_EVENT = 'orina:receipts-changed';

const DEFAULT_RECEIPT_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><rect width="160" height="160" rx="24" fill="#18181b"/><rect x="38" y="36" width="84" height="88" rx="14" fill="#6d28d9" opacity="0.22"/><path d="M52 58h56M52 78h56M52 98h34" stroke="#c4b5fd" stroke-width="10" stroke-linecap="round"/></svg>',
  );

function normalizeWalletAddress(value?: string | null): string {
  return String(value || '').trim().toLowerCase();
}

function resolveRuntimeReceiptScope(scope?: RuntimeReceiptScope) {
  const chainId = scope?.chainId ?? LIVE_PROTOCOL_CHAIN_ID;
  return {
    chainId,
    receiptContract: String(
      scope?.receiptContract
      ?? LIVE_PROTOCOL_CONTRACTS.RECEIPT_NFT
      ?? '',
    ).trim().toLowerCase(),
    marketplaceContract: String(
      scope?.marketplaceContract
      ?? LIVE_PROTOCOL_CONTRACTS.MARKETPLACE_ATP
      ?? '',
    ).trim().toLowerCase(),
    assetContract: String(
      scope?.assetContract
      ?? LIVE_PROTOCOL_CONTRACTS.ORINA_RWA
      ?? '',
    ).trim().toLowerCase(),
  };
}

function getRuntimeReceiptsStorageKey(scope?: RuntimeReceiptScope) {
  const resolvedScope = resolveRuntimeReceiptScope(scope);
  return `orina_runtime_receipts_v1:${resolvedScope.chainId}:${resolvedScope.receiptContract || 'default'}`;
}

function readLocalRuntimeReceipts(scope?: RuntimeReceiptScope): StoredRuntimeReceiptAsset[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(getRuntimeReceiptsStorageKey(scope));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredRuntimeReceiptAsset[];
    return Array.isArray(parsed) ? parsed.filter((item) => item?.id && item?.ownerWallet) : [];
  } catch {
    return [];
  }
}

function writeLocalRuntimeReceipts(receipts: StoredRuntimeReceiptAsset[], scope?: RuntimeReceiptScope) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(getRuntimeReceiptsStorageKey(scope), JSON.stringify(receipts));
    dispatchSyncEvent(RUNTIME_RECEIPTS_CHANGED_EVENT);
  } catch {
    // Ignore storage failures.
  }
}

function dedupeRuntimeReceipts(receipts: StoredRuntimeReceiptAsset[]): StoredRuntimeReceiptAsset[] {
  const merged = new Map<string, StoredRuntimeReceiptAsset>();
  for (const receipt of receipts) {
    if (!receipt?.id) continue;
    const key = `${receipt.ownerWallet}:${receipt.id}`;
    if (!merged.has(key)) {
      merged.set(key, receipt);
    }
  }
  return Array.from(merged.values());
}

function mergeRuntimeReceipts(primary: StoredRuntimeReceiptAsset[], secondary: StoredRuntimeReceiptAsset[]) {
  return dedupeRuntimeReceipts([...primary, ...secondary]);
}

function firstNonEmpty(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  return undefined;
}

function safeObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function ensureReceiptName(name: string): string {
  return /receipt/i.test(name) ? name : `${name} Receipt`;
}

function formatReceiptPurchaseDate(blockTime?: string | null, updatedAtMs?: number, createdAtMs?: number): string {
  const source = blockTime
    ? Date.parse(blockTime)
    : Number.isFinite(updatedAtMs)
      ? Number(updatedAtMs)
      : Number.isFinite(createdAtMs)
        ? Number(createdAtMs)
        : NaN;
  if (!Number.isFinite(source)) return 'Unknown date';
  return new Date(source).toISOString().slice(0, 10);
}

function resolveReceiptNetworkLabel(chainId: number, fallback?: string): string {
  if (fallback && fallback.trim()) return fallback.trim();
  if (chainId === 97) return 'BSC Testnet';
  if (chainId === 56) return 'BSC';
  if (chainId === 1) return 'Ethereum';
  return `Chain ${chainId}`;
}

function assetContractMatches(assetRow: ProtocolAssetRow, expectedContract: string, orderAssetContract?: string) {
  const assetContract = String(assetRow.asset_contract || '').trim().toLowerCase();
  if (orderAssetContract && assetContract === orderAssetContract.toLowerCase()) return true;
  if (expectedContract && assetContract === expectedContract) return true;
  return !assetContract;
}

function getAssetProjectionKey(assetContract?: string | null, tokenId?: string | number | null) {
  const normalizedTokenId = String(tokenId || '').trim();
  if (!normalizedTokenId) return '';
  const normalizedContract = String(assetContract || '').trim().toLowerCase();
  return `${normalizedContract}:${normalizedTokenId}`;
}

function getOrderStatusPriority(status?: string | null) {
  switch (String(status || '').trim().toLowerCase()) {
    case 'finalized':
      return 5;
    case 'disputed':
      return 4;
    case 'paid':
    case 'pending_delivery':
      return 3;
    case 'pending_settlement':
      return 2;
    case 'cancelled':
      return 1;
    default:
      return 0;
  }
}

function getOrderProjectionPriority(row: ProtocolOrderRow) {
  const metadata = safeObject(row.metadata);
  const projectionState = String(metadata.projection_state || metadata.status_source || '').trim().toLowerCase();
  if (projectionState === 'chain_projection') return 2;
  if (projectionState === 'chain_backfill') return 1;
  return 0;
}

function compareProtocolOrderRows(a: ProtocolOrderRow, b: ProtocolOrderRow) {
  const statusDelta = getOrderStatusPriority(b.status) - getOrderStatusPriority(a.status);
  if (statusDelta !== 0) return statusDelta;

  const projectionDelta = getOrderProjectionPriority(b) - getOrderProjectionPriority(a);
  if (projectionDelta !== 0) return projectionDelta;

  const updatedAtA = Date.parse(String(a.updated_at || a.created_at || '')) || 0;
  const updatedAtB = Date.parse(String(b.updated_at || b.created_at || '')) || 0;
  return updatedAtB - updatedAtA;
}

async function readFallbackReceiptOrdersForWallet(
  walletAddress: string,
  orderIds: string[],
  scope: ReturnType<typeof resolveRuntimeReceiptScope>,
) {
  if (orderIds.length === 0) return [] as OrderUiRecord[];

  const remoteRows = await restSelect<ProtocolOrderRow>(
    'protocol_orders',
    `?chain_id=eq.${scope.chainId}&order_uid=${encodeIn(orderIds)}&or=(buyer_address.eq.${walletAddress},seller_address.eq.${walletAddress})&order=updated_at.desc&limit=200`,
  );

  const selectedRows = new Map<string, ProtocolOrderRow>();
  for (const row of [...remoteRows].sort(compareProtocolOrderRows)) {
    const orderId = String(row.order_uid || '').trim();
    if (!orderId || selectedRows.has(orderId)) continue;
    selectedRows.set(orderId, row);
  }

  const nextOrders: OrderUiRecord[] = [];
  for (const row of selectedRows.values()) {
    const mapped = fromProtocolOrderRow(row, {
      chainId: row.chain_id ?? scope.chainId,
      marketplaceContract: row.marketplace_contract ?? undefined,
      assetContract: row.asset_contract ?? undefined,
    });
    if (mapped) {
      nextOrders.push(mapped);
    }
  }

  return nextOrders;
}

function mapReceiptRowToAsset(
  row: ProtocolReceiptRow,
  orderMap: Map<string, OrderUiRecord>,
  assetMap: Map<string, ProtocolAssetRow>,
  scope: ReturnType<typeof resolveRuntimeReceiptScope>,
  ownerWallet: string,
): StoredRuntimeReceiptAsset {
  const orderId = String(row.order_id || '');
  const order = orderMap.get(orderId);
  const assetRow = order
    ? assetMap.get(getAssetProjectionKey(order.assetContract, order.assetId.toString()))
    : undefined;
  const assetMetadata = safeObject(assetRow?.metadata);
  const metadataMyAsset = safeObject(assetMetadata.myAsset);
  const metadataDetails = safeObject(assetMetadata.details);
  const metadataSeller = safeObject(metadataDetails.seller);

  const baseName = firstNonEmpty(
    order?.assetName,
    typeof metadataMyAsset.name === 'string' ? metadataMyAsset.name : undefined,
    typeof metadataDetails.name === 'string' ? metadataDetails.name : undefined,
    order ? `Asset #${order.assetId.toString()}` : undefined,
    `Receipt #${String(row.token_id || row.order_id || 'unknown')}`,
  ) || 'Receipt NFT';

  const image = firstNonEmpty(
    order?.assetImage,
    typeof metadataMyAsset.image === 'string' ? metadataMyAsset.image : undefined,
    typeof metadataDetails.image === 'string' ? metadataDetails.image : undefined,
    DEFAULT_RECEIPT_IMAGE,
  ) || DEFAULT_RECEIPT_IMAGE;

  const seller = firstNonEmpty(
    order?.seller,
    typeof metadataSeller.address === 'string' ? metadataSeller.address : undefined,
    typeof metadataDetails.creator === 'string' ? metadataDetails.creator : undefined,
    'Unknown seller',
  ) || 'Unknown seller';
  const linkedAssetId = firstNonEmpty(
    order?.assetUid,
    order?.tokenId,
    order?.assetId ? order.assetId.toString() : undefined,
  );

  return {
    ownerWallet,
    id: `receipt-${String(row.token_id || row.order_id || row.tx_hash || 'unknown')}`,
    name: ensureReceiptName(baseName),
    type: 'Receipt',
    category: firstNonEmpty(
      typeof metadataMyAsset.category === 'string' ? metadataMyAsset.category : undefined,
      typeof metadataDetails.category === 'string' ? metadataDetails.category : undefined,
      'Real World Asset',
    ) || 'Real World Asset',
    orderId,
    image,
    purchaseValue: order
      ? formatOrderGrossPrice(order.grossPrice, order.paymentTokenSymbol, order.paymentTokenDecimals)
      : `${String(row.amount || '1')} Receipt`,
    purchaseDate: formatReceiptPurchaseDate(row.block_time, order?.updatedAt, order?.createdAt),
    seller,
    blockchain: resolveReceiptNetworkLabel(
      scope.chainId,
      typeof metadataDetails.blockchain === 'string' ? metadataDetails.blockchain : undefined,
    ),
    linkedAssetId,
    mintTxHash: firstNonEmpty(row.tx_hash),
    chainId: scope.chainId,
  };
}

export function loadRuntimeReceipts(walletAddress?: string | null, scope?: RuntimeReceiptScope) {
  const normalizedWallet = normalizeWalletAddress(walletAddress);
  if (!normalizedWallet) return [];
  return readLocalRuntimeReceipts(scope)
    .filter((receipt) => receipt.ownerWallet === normalizedWallet)
    .map(({ ownerWallet: _ownerWallet, ...receipt }) => receipt);
}

export async function hydrateRuntimeReceiptsFromSupabase(
  walletAddress?: string | null,
  scope?: RuntimeReceiptScope,
) {
  const resolvedScope = resolveRuntimeReceiptScope(scope);
  const normalizedWallet = normalizeWalletAddress(walletAddress);
  if (!isSupabaseRestEnabled() || !normalizedWallet) {
    return loadRuntimeReceipts(walletAddress, resolvedScope);
  }

  try {
    const receiptRows = await restSelect<ProtocolReceiptRow>(
      'protocol_receipts',
      toQuery({
        chain_id: encodeEq(resolvedScope.chainId),
        owner_address: encodeEq(normalizedWallet),
        ...(resolvedScope.receiptContract ? { contract_address: encodeEq(resolvedScope.receiptContract) } : {}),
        order: 'block_number.desc',
        limit: '100',
      }),
    );

    const orderScope: RuntimeOrderScope = {
      chainId: resolvedScope.chainId,
      marketplaceContract: resolvedScope.marketplaceContract,
      assetContract: resolvedScope.assetContract,
    };
    const [projectedOrders, runtimeOrders] = await Promise.all([
      readProjectedOrdersForWallet(walletAddress, orderScope).catch(() => []),
      Promise.resolve(loadRuntimeOrders(walletAddress, orderScope)),
    ]);

    const mergedOrders = mergeOrderRecords(runtimeOrders, projectedOrders);
    const orderIdsWithReceipts = new Set(receiptRows.map((row) => String(row.order_id || '')));
    const relatedOrders = mergedOrders.filter((order) => orderIdsWithReceipts.has(order.orderId.toString()));
    const orderMap = new Map(relatedOrders.map((order) => [order.orderId.toString(), order]));
    const missingOrderIds = Array.from(orderIdsWithReceipts).filter((orderId) => orderId && !orderMap.has(orderId));
    const fallbackOrders = missingOrderIds.length > 0
      ? await readFallbackReceiptOrdersForWallet(normalizedWallet, missingOrderIds, resolvedScope).catch(() => [])
      : [];

    for (const fallbackOrder of fallbackOrders) {
      if (!orderMap.has(fallbackOrder.orderId.toString())) {
        orderMap.set(fallbackOrder.orderId.toString(), fallbackOrder);
      }
    }

    const receiptOrders = Array.from(orderMap.values());
    const assetRefs = new Map<string, { tokenId: string; assetContract?: string | null }>();
    for (const order of receiptOrders) {
      const assetKey = getAssetProjectionKey(order.assetContract, order.assetId.toString());
      if (!assetKey || assetRefs.has(assetKey)) continue;
      assetRefs.set(assetKey, {
        tokenId: order.assetId.toString(),
        assetContract: order.assetContract,
      });
    }

    const assetTokenIds = Array.from(new Set(Array.from(assetRefs.values()).map((assetRef) => assetRef.tokenId)));

    const assetRows = assetTokenIds.length > 0
      ? await restSelect<ProtocolAssetRow>(
          'protocol_assets',
          toQuery({
            chain_id: encodeEq(resolvedScope.chainId),
            token_id: encodeIn(assetTokenIds),
            order: 'updated_at.desc',
            limit: '200',
          }),
        ).catch(() => [])
      : [];

    const assetMap = new Map<string, ProtocolAssetRow>();
    for (const assetRow of assetRows) {
      const tokenId = String(assetRow.token_id || '');
      if (!tokenId) continue;

      for (const [assetKey, assetRef] of assetRefs.entries()) {
        if (assetRef.tokenId !== tokenId) continue;
        if (!assetContractMatches(assetRow, resolvedScope.assetContract, assetRef.assetContract)) continue;
        if (assetMap.has(assetKey)) continue;
        assetMap.set(assetKey, assetRow);
      }
    }

    const nextReceipts = dedupeRuntimeReceipts(
      receiptRows.map((row) => mapReceiptRowToAsset(row, orderMap, assetMap, resolvedScope, normalizedWallet)),
    );
    const localWithoutCurrentWallet = readLocalRuntimeReceipts(resolvedScope)
      .filter((receipt) => receipt.ownerWallet !== normalizedWallet);
    writeLocalRuntimeReceipts(mergeRuntimeReceipts(localWithoutCurrentWallet, nextReceipts), resolvedScope);
    return loadRuntimeReceipts(walletAddress, resolvedScope);
  } catch (error) {
    console.warn('[runtimeReceipts] Failed to hydrate receipt NFTs from Supabase', error);
    return loadRuntimeReceipts(walletAddress, resolvedScope);
  }
}

export async function syncRuntimeReceiptsForWallet(
  walletAddress?: string | null,
  scope?: RuntimeReceiptScope,
  options?: {
    fromBlock?: number;
    toBlock?: number;
    promptOnAuthMissing?: boolean;
  },
): Promise<RuntimeReceiptSyncResponse | null> {
  const resolvedScope = resolveRuntimeReceiptScope(scope);
  const normalizedWallet = normalizeWalletAddress(walletAddress);
  const functionUrl = getSupabaseFunctionUrl('sync-wallet', runtimeConfig.supabaseReceiptSyncFunctionName);
  if (!normalizedWallet || !functionUrl) return null;

  const accessToken = await ensureSupabaseBridgeAccessToken({
    walletAddress: normalizedWallet,
    promptOnAuthMissing: options?.promptOnAuthMissing ?? false,
  }).catch((error) => {
    console.debug('[runtimeReceipts] Receipt sync token exchange skipped:', error);
    return null;
  });

  if (!accessToken) {
    return null;
  }

  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...(typeof options?.fromBlock === 'number' ? { fromBlock: options.fromBlock } : {}),
      ...(typeof options?.toBlock === 'number' ? { toBlock: options.toBlock } : {}),
    }),
  });

  const text = await response.text();
  let payload: Record<string, unknown> | null = null;
  try {
    payload = text ? JSON.parse(text) as Record<string, unknown> : null;
  } catch {
    payload = { raw: text };
  }

  if (!response.ok) {
    throw new Error(String(payload?.error || payload?.message || `Receipt sync failed (${response.status})`));
  }

  const ownedReceipts = await hydrateRuntimeReceiptsFromSupabase(normalizedWallet, resolvedScope);
  return {
    success: true,
    walletAddress: String(payload?.walletAddress || normalizedWallet),
    synced: Number(payload?.synced || 0),
    errors: Number(payload?.errors || 0),
    fromBlock: Number(payload?.fromBlock || 0),
    toBlock: Number(payload?.toBlock || 0),
    receiptCount: Number(payload?.receiptCount || ownedReceipts.length),
    syncMode: typeof payload?.syncMode === 'string' ? payload.syncMode : undefined,
    receipts: Array.isArray(payload?.receipts) ? payload.receipts as ProtocolReceiptRow[] : [],
    ownedReceipts,
  };
}

export function subscribeToRuntimeReceipts(listener: () => void) {
  if (typeof window === 'undefined') return () => {};
  const handler = () => listener();
  window.addEventListener(RUNTIME_RECEIPTS_CHANGED_EVENT, handler as EventListener);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(RUNTIME_RECEIPTS_CHANGED_EVENT, handler as EventListener);
    window.removeEventListener('storage', handler);
  };
}
