import type { RwaConfigurableAttributeGroup } from '@/app/types/asset';
import type { DeliveryAddressDraft, DeliveryAddressRecord } from '@/types/address';
import type { AssetLocationSnapshot } from '@/types/asset';
import { dispatchSyncEvent } from '@/utils/supabaseRest';
import {
  restSelect,
  restUpsert,
  restDelete,
  isSupabaseRestEnabled,
  encodeEq,
  toQuery,
} from '@/utils/supabaseRest';

export const MINTING_DRAFTS_CHANGED_EVENT = 'orina:minting-drafts-changed';

/** @deprecated Kept only for one-time migration read, then cleared. */
const MINTING_DRAFTS_STORAGE_KEY = 'orina_minting_drafts_v1';

export interface MintingDraftMedia {
  ipfsHash: string;
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface MintingDraftDeliveryState {
  mode: 'default' | 'other';
  defaultAddress: DeliveryAddressRecord | null;
  otherDraft: DeliveryAddressDraft;
  effectiveDraft: DeliveryAddressDraft | null;
  preview: string;
  locationSnapshot: AssetLocationSnapshot | null;
  isValid: boolean;
}

export interface MintingDraftRecord {
  id: string;
  walletAddress: string;
  status: 'draft';
  assetType: 'RWA' | 'NFT';
  name: string;
  description: string;
  category: string;
  subcategory: string;
  blockchain: string;
  unitId: string;
  totalAmount: string;
  price: string;
  priceCurrency: string;
  expiryType: 'Expiry' | 'Non-Expiry';
  expiryDays: string;
  uploadedMedia: MintingDraftMedia | null;
  uploadedImages: MintingDraftMedia[];
  configurableAttributes: RwaConfigurableAttributeGroup[];
  deliveryState: MintingDraftDeliveryState | null;
  previewImage: string;
  completeness: number;
  createdAt: number;
  updatedAt: number;
}

function normalizeWalletAddress(value?: string | null) {
  return String(value || '').trim().toLowerCase();
}

// ─── Server row ↔ Client record mappers ──────────────────────────────────────

interface MintingDraftRow {
  id: string;
  wallet_address: string;
  status: string;
  asset_type: string;
  name: string;
  description: string;
  category: string;
  subcategory: string;
  blockchain: string;
  unit_id: string;
  total_amount: string;
  price: string;
  price_currency: string;
  expiry_type: string;
  expiry_days: string;
  media_data: any;
  delivery_state: any;
  configurable_attributes: any;
  preview_image: string | null;
  completeness: number;
  created_at: string;
  updated_at: string;
}

function rowToRecord(row: MintingDraftRow): MintingDraftRecord {
  return {
    id: row.id,
    walletAddress: row.wallet_address,
    status: 'draft',
    assetType: (row.asset_type || 'RWA') as 'RWA' | 'NFT',
    name: row.name,
    description: row.description,
    category: row.category,
    subcategory: row.subcategory,
    blockchain: row.blockchain,
    unitId: row.unit_id,
    totalAmount: row.total_amount,
    price: row.price,
    priceCurrency: row.price_currency,
    expiryType: (row.expiry_type || 'Non-Expiry') as 'Expiry' | 'Non-Expiry',
    expiryDays: row.expiry_days,
    uploadedMedia: row.media_data?.uploadedMedia ?? null,
    uploadedImages: row.media_data?.uploadedImages ?? [],
    configurableAttributes: row.configurable_attributes ?? [],
    deliveryState: row.delivery_state ?? null,
    previewImage: row.preview_image ?? '',
    completeness: row.completeness ?? 0,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

function recordToRow(draft: MintingDraftRecord): Record<string, any> {
  return {
    id: draft.id,
    wallet_address: normalizeWalletAddress(draft.walletAddress),
    status: draft.status,
    asset_type: draft.assetType,
    name: draft.name,
    description: draft.description,
    category: draft.category,
    subcategory: draft.subcategory,
    blockchain: draft.blockchain,
    unit_id: draft.unitId,
    total_amount: draft.totalAmount,
    price: draft.price,
    price_currency: draft.priceCurrency,
    expiry_type: draft.expiryType,
    expiry_days: draft.expiryDays,
    media_data: {
      uploadedMedia: draft.uploadedMedia,
      uploadedImages: draft.uploadedImages,
    },
    delivery_state: draft.deliveryState,
    configurable_attributes: draft.configurableAttributes,
    preview_image: draft.previewImage || null,
    completeness: draft.completeness,
  };
}

// ─── Legacy localStorage (read-once migration) ──────────────────────────────

function readAndClearLegacyDrafts(walletAddress: string): MintingDraftRecord[] {
  if (typeof window === 'undefined') return [];
  const normalized = normalizeWalletAddress(walletAddress);
  if (!normalized) return [];

  const key = `${MINTING_DRAFTS_STORAGE_KEY}:${normalized}`;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    // Clear after reading
    window.localStorage.removeItem(key);
    return Array.isArray(parsed) ? parsed as MintingDraftRecord[] : [];
  } catch {
    return [];
  }
}

function sortDrafts(drafts: MintingDraftRecord[]) {
  return [...drafts].sort((left, right) => right.updatedAt - left.updatedAt);
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function createMintingDraftId() {
  return `mint-draft-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function loadMintingDrafts(walletAddress?: string | null): Promise<MintingDraftRecord[]> {
  const normalized = normalizeWalletAddress(walletAddress);
  if (!normalized) return [];

  // Try server first
  if (isSupabaseRestEnabled()) {
    try {
      const query = toQuery({
        wallet_address: encodeEq(normalized),
        order: 'updated_at.desc',
        limit: '50',
      });
      const rows = await restSelect<MintingDraftRow>('minting_drafts', query);
      if (rows.length > 0) return rows.map(rowToRecord);

      // No server data — check for legacy migration
      const legacy = readAndClearLegacyDrafts(normalized);
      if (legacy.length > 0) {
        // Migrate legacy to server
        for (const draft of legacy) {
          try {
            await restUpsert('minting_drafts', recordToRow(draft), { onConflict: 'id' });
          } catch { /* best effort */ }
        }
        return sortDrafts(legacy);
      }
      return [];
    } catch (err) {
      console.warn('[mintingDrafts] Server read failed, returning empty:', err);
      return [];
    }
  }

  // Fallback: no supabase configured  
  return [];
}

export function getMintingDraftById(walletAddress: string | null | undefined, draftId: string) {
  // Sync wrapper for backward compat — returns null, caller should use async version
  return null;
}

/** Async version: fetches from server */
export async function getMintingDraftByIdAsync(
  walletAddress: string | null | undefined,
  draftId: string,
): Promise<MintingDraftRecord | null> {
  const drafts = await loadMintingDrafts(walletAddress);
  return drafts.find((d) => d.id === draftId) ?? null;
}

export async function upsertMintingDraft(draft: MintingDraftRecord): Promise<MintingDraftRecord | null> {
  const walletAddress = normalizeWalletAddress(draft.walletAddress);
  if (!walletAddress) return null;

  const row = recordToRow({ ...draft, walletAddress });

  if (isSupabaseRestEnabled()) {
    try {
      await restUpsert('minting_drafts', row, { onConflict: 'id' });
    } catch (err) {
      console.error('[mintingDrafts] Failed to upsert:', err);
    }
  }

  dispatchSyncEvent(MINTING_DRAFTS_CHANGED_EVENT);
  return draft;
}

export async function deleteMintingDraft(walletAddress: string | null | undefined, draftId: string) {
  const normalized = normalizeWalletAddress(walletAddress);
  if (!normalized || !draftId) return;

  if (isSupabaseRestEnabled()) {
    try {
      const query = toQuery({
        id: encodeEq(draftId),
        wallet_address: encodeEq(normalized),
      });
      await restDelete('minting_drafts', query);
    } catch (err) {
      console.error('[mintingDrafts] Failed to delete:', err);
    }
  }

  dispatchSyncEvent(MINTING_DRAFTS_CHANGED_EVENT);
}

export function subscribeToMintingDrafts(listener: () => void) {
  if (typeof window === 'undefined') return () => {};

  const handler = () => listener();
  window.addEventListener(MINTING_DRAFTS_CHANGED_EVENT, handler as EventListener);
  window.addEventListener('storage', handler);

  return () => {
    window.removeEventListener(MINTING_DRAFTS_CHANGED_EVENT, handler as EventListener);
    window.removeEventListener('storage', handler);
  };
}
