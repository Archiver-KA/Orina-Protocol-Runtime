import type { RwaConfigurableAttributeGroup } from '@/app/types/asset';
import type { DeliveryAddressDraft, DeliveryAddressRecord } from '@/types/address';
import type { AssetLocationSnapshot } from '@/types/asset';
import { dispatchSyncEvent } from '@/utils/supabaseRest';

export const MINTING_DRAFTS_CHANGED_EVENT = 'orina:minting-drafts-changed';

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

function getStorageKey(walletAddress?: string | null) {
  const normalized = normalizeWalletAddress(walletAddress);
  return normalized ? `${MINTING_DRAFTS_STORAGE_KEY}:${normalized}` : '';
}

function readLocalMintingDrafts(walletAddress?: string | null): MintingDraftRecord[] {
  if (typeof window === 'undefined') return [];

  const key = getStorageKey(walletAddress);
  if (!key) return [];

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? (parsed as MintingDraftRecord[]).filter((draft) => normalizeWalletAddress(draft.walletAddress) === normalizeWalletAddress(walletAddress))
      : [];
  } catch {
    return [];
  }
}

function writeLocalMintingDrafts(walletAddress: string, drafts: MintingDraftRecord[]) {
  if (typeof window === 'undefined') return;

  const key = getStorageKey(walletAddress);
  if (!key) return;

  window.localStorage.setItem(key, JSON.stringify(drafts));
  dispatchSyncEvent(MINTING_DRAFTS_CHANGED_EVENT);
}

function sortDrafts(drafts: MintingDraftRecord[]) {
  return [...drafts].sort((left, right) => right.updatedAt - left.updatedAt);
}

export function createMintingDraftId() {
  return `mint-draft-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function loadMintingDrafts(walletAddress?: string | null) {
  return sortDrafts(readLocalMintingDrafts(walletAddress));
}

export function getMintingDraftById(walletAddress: string | null | undefined, draftId: string) {
  return loadMintingDrafts(walletAddress).find((draft) => draft.id === draftId) ?? null;
}

export function upsertMintingDraft(draft: MintingDraftRecord) {
  const walletAddress = normalizeWalletAddress(draft.walletAddress);
  if (!walletAddress) return null;

  const current = readLocalMintingDrafts(walletAddress);
  const next = sortDrafts([
    {
      ...draft,
      walletAddress,
    },
    ...current.filter((item) => item.id !== draft.id),
  ]);

  writeLocalMintingDrafts(walletAddress, next);
  return draft;
}

export function deleteMintingDraft(walletAddress: string | null | undefined, draftId: string) {
  const normalized = normalizeWalletAddress(walletAddress);
  if (!normalized) return;

  const current = readLocalMintingDrafts(normalized);
  const next = current.filter((draft) => draft.id !== draftId);
  writeLocalMintingDrafts(normalized, next);
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
