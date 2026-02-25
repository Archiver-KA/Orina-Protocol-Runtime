/**
 * useAssets - OrinaRWA Asset Hooks
 * ================================
 * Updated for ATP v3.3-final:
 *   - getAsset returns Asset struct with assetType field
 *   - mintAsset requires assetType param (0=RWA, 1=NFT)
 *   - Added lockedAmounts hook
 */

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACTS, AssetType } from '@/config/contracts';
import { ORINA_RWA_ABI } from '@/config/abis';
import type { Asset } from '@/types/contracts';

// ── Read Hooks ────────────────────────────────────────────────

/** Get total number of assets */
export function useNextAssetId() {
  return useReadContract({
    address: CONTRACTS.ORINA_RWA,
    abi: ORINA_RWA_ABI,
    functionName: 'nextAssetId',
  });
}

/** Get a single asset by ID (returns typed Asset with assetType) */
export function useAsset(assetId: number | bigint) {
  const result = useReadContract({
    address: CONTRACTS.ORINA_RWA,
    abi: ORINA_RWA_ABI,
    functionName: 'getAsset',
    args: [BigInt(assetId)],
  });

  // Transform tuple result into typed Asset object
  let asset: Asset | undefined;

  if (result.data) {
    const data = result.data as any;
    // getAsset returns a tuple struct
    asset = {
      seller: data.seller || data[0],
      unitId: data.unitId || data[1],
      totalAmount: data.totalAmount || data[2],
      availableAmount: data.availableAmount || data[3],
      consumedAmount: data.consumedAmount || data[4],
      active: data.active ?? data[5],
      expiryAt: data.expiryAt || data[6],
      finalized: data.finalized ?? data[7],
      assetType: data.assetType ?? data[8] ?? AssetType.RWA,
    };
  }

  return { ...result, asset };
}

/** Get locked amount for an asset */
export function useTotalLocked(assetId: number | bigint) {
  return useReadContract({
    address: CONTRACTS.ORINA_RWA,
    abi: ORINA_RWA_ABI,
    functionName: 'totalLocked',
    args: [BigInt(assetId)],
  });
}

/** Get locked amount for a specific asset + order */
export function useLockedAmount(assetId: bigint | undefined, orderId: bigint | undefined) {
  return useReadContract({
    address: CONTRACTS.ORINA_RWA,
    abi: ORINA_RWA_ABI,
    functionName: 'lockedAmounts',
    args: assetId !== undefined && orderId !== undefined ? [assetId, orderId] : undefined,
    query: { enabled: assetId !== undefined && orderId !== undefined },
  });
}

/** Fetch multiple assets (helper) */
export function useAssets(assetIds: number[]) {
  const results = assetIds.map((id) => useAsset(id));

  return {
    assets: results.map((r) => r.asset).filter((a): a is Asset => a !== undefined),
    isLoading: results.some((r) => r.isLoading),
    isError: results.some((r) => r.isError),
  };
}

// ── Write Hooks ───────────────────────────────────────────────

/**
 * Mint a new asset on OrinaRWA.
 * Updated for v3.3: now requires assetType param.
 *
 * @param unitId - Unit type ID from UnitRegistry
 * @param totalAmount - Total fractional amount
 * @param expiryAt - Expiry timestamp (0 for no expiry)
 * @param assetType - 0=RWA (non-transferable receipt), 1=NFT (transferable receipt)
 */
export function useMintAsset() {
  const { data: hash, writeContract, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const mintAsset = async (
    unitId: bigint,
    totalAmount: bigint,
    expiryAt: bigint,
    assetType: AssetType = AssetType.RWA,
  ) => {
    writeContract({
      address: CONTRACTS.ORINA_RWA,
      abi: ORINA_RWA_ABI,
      functionName: 'mintAsset',
      args: [unitId, totalAmount, expiryAt, assetType],
    });
  };

  return { mintAsset, hash, isPending, isConfirming, isConfirmed, error, reset };
}

// ── Asset Conservation Helper ─────────────────────────────────

/**
 * Calculate asset conservation invariant:
 *   totalAmount = availableAmount + totalLocked + consumedAmount
 */
export function checkAssetConservation(asset: Asset, totalLocked: bigint): boolean {
  return asset.totalAmount === asset.availableAmount + totalLocked + asset.consumedAmount;
}
