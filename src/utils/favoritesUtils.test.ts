import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { adjustMarketplaceAssetLikeCount, dispatchSyncEvent } = vi.hoisted(() => ({
  adjustMarketplaceAssetLikeCount: vi.fn(),
  dispatchSyncEvent: vi.fn(),
}));

vi.mock('@/utils/testWalletAssetFixtures', () => ({
  getTestWalletMyAssets: () => null,
}));

vi.mock('@/utils/assetMetadataSync', () => ({
  ensureAssetMetadataSeedForIds: vi.fn(),
}));

vi.mock('@/utils/guestMode', () => ({
  isGuestModeForced: () => false,
}));

vi.mock('@/utils/marketplaceCatalog', () => ({
  adjustMarketplaceAssetLikeCount,
  getMarketplaceCatalogAssetById: (assetId: string, assets: Array<{ id: string; tokenId?: string }>) =>
    assets.find((asset) => asset.id === String(assetId || '').toLowerCase() || asset.tokenId === String(assetId || '').toLowerCase()),
  loadMarketplaceCatalogSync: () => [{ id: 'asset-001', tokenId: '1' }],
}));

vi.mock('@/utils/supabaseRest', () => ({
  dispatchSyncEvent,
  encodeEq: vi.fn(),
  encodeIn: vi.fn(),
  getLocalSupabaseId: vi.fn(),
  isSupabaseRestEnabled: () => false,
  restDelete: vi.fn(),
  restSelect: vi.fn(),
  restUpsert: vi.fn(),
  setLocalSupabaseId: vi.fn(),
  toQuery: vi.fn(),
}));

vi.mock('@/utils/profileUtils', () => ({
  ensureRemoteProfileIdForWallet: vi.fn(),
  getCachedRemoteProfileId: vi.fn(),
}));

import { addFavorite, loadFavorites, removeFavorite } from '@/utils/favoritesUtils';

function createStorage() {
  const store = new Map<string, string>();
  return {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
    removeItem(key: string) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
}

describe('favoritesUtils like count sync', () => {
  const walletAddress = '0x1234567890abcdef1234567890abcdef12345678';
  const originalWindow = globalThis.window;
  const originalLocalStorage = globalThis.localStorage;

  beforeEach(() => {
    const storage = createStorage();
    adjustMarketplaceAssetLikeCount.mockReset();
    dispatchSyncEvent.mockReset();

    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: storage,
    });
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        localStorage: storage,
      },
    });
  });

  afterEach(() => {
    if (originalWindow === undefined) {
      Reflect.deleteProperty(globalThis, 'window');
    } else {
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: originalWindow,
      });
    }

    if (originalLocalStorage === undefined) {
      Reflect.deleteProperty(globalThis, 'localStorage');
    } else {
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: originalLocalStorage,
      });
    }
  });

  it('increments the asset like count when adding a favorite', async () => {
    await addFavorite(walletAddress, 'asset-001');

    expect(loadFavorites(walletAddress)).toEqual([
      expect.objectContaining({ assetId: 'asset-001' }),
    ]);
    expect(adjustMarketplaceAssetLikeCount).toHaveBeenCalledWith('asset-001', 1);
  });

  it('does not increment again when the asset is already favorited', async () => {
    await addFavorite(walletAddress, 'asset-001');
    adjustMarketplaceAssetLikeCount.mockClear();

    await addFavorite(walletAddress, 'asset-001');

    expect(loadFavorites(walletAddress)).toHaveLength(1);
    expect(adjustMarketplaceAssetLikeCount).not.toHaveBeenCalled();
  });

  it('decrements the asset like count when removing a stored favorite', async () => {
    await addFavorite(walletAddress, 'asset-001');
    adjustMarketplaceAssetLikeCount.mockClear();

    await removeFavorite(walletAddress, 'asset-001');

    expect(loadFavorites(walletAddress)).toEqual([]);
    expect(adjustMarketplaceAssetLikeCount).toHaveBeenCalledWith('asset-001', -1);
  });

  it('does not decrement when the asset is not in favorites', async () => {
    await removeFavorite(walletAddress, 'asset-001');

    expect(loadFavorites(walletAddress)).toEqual([]);
    expect(adjustMarketplaceAssetLikeCount).not.toHaveBeenCalled();
  });
});
