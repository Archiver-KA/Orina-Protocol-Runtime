import { useMemo } from 'react';
import { useReadContract, useReadContracts } from 'wagmi';
import { UNIT_IDS } from '@/config/contracts';
import { UNIT_REGISTRY_ABI } from '@/config/abis';
import type { Unit } from '@/types/contracts';
import { getUnitDisplayLabel, normalizeUnitResult } from '@/utils/onchainNormalization';
import { useProtocolDataNetwork } from './useProtocolDataNetwork';

export interface UnitOption {
  id: number;
  name: string;       // on-chain name (e.g. "KG")
  label: string;      // display label (e.g. "KG — kilogram")
  step: bigint;
  minAmount: bigint;
  active: boolean;
  locked: boolean;
}

/** Batch-fetch all 9 seeded units from UnitRegistry in one multicall. */
export function useAllUnits() {
  const { chainId, unitRegistryAddress } = useProtocolDataNetwork();
  const unitIds = Object.values(UNIT_IDS) as number[]; // [0..8]

  const { data, isLoading, isError } = useReadContracts({
    contracts: unitRegistryAddress
      ? unitIds.map((id) => ({
          chainId: chainId ?? undefined,
          address: unitRegistryAddress,
          abi: UNIT_REGISTRY_ABI,
          functionName: 'getUnit',
          args: [BigInt(id)],
        }))
      : [],
    query: { enabled: Boolean(chainId && unitRegistryAddress), staleTime: 60_000 },
  });

  const units = useMemo<UnitOption[]>(() => {
    if (!data) return [];
    return unitIds
      .map((id, i) => {
        const result = data[i];
        if (result?.status !== 'success' || !result.result) return null;
        const normalized = normalizeUnitResult(result.result);
        if (!normalized) return null;
        return {
          id,
          name: normalized.name,
          label: getUnitDisplayLabel(id, normalized.name),
          step: normalized.step,
          minAmount: normalized.minAmount,
          active: normalized.active,
          locked: normalized.locked,
        } satisfies UnitOption;
      })
      .filter((u): u is UnitOption => u !== null && u.active);
  }, [data, unitIds]);

  // Fallback static list when contract is not reachable (e.g. no wallet)
  const fallbackUnits = useMemo<UnitOption[]>(
    () =>
      unitIds.map((id) => ({
        id,
        name: Object.keys(UNIT_IDS)[id] ?? `Unit${id}`,
        label: getUnitDisplayLabel(id, Object.keys(UNIT_IDS)[id] ?? `Unit${id}`),
        step: 1n,
        minAmount: 1n,
        active: true,
        locked: false,
      })),
    [unitIds]
  );

  return {
    units: isLoading || isError || units.length === 0 ? fallbackUnits : units,
    isLoading,
    isError,
    /** true when data came from on-chain (not fallback) */
    isOnChain: !isLoading && !isError && units.length > 0,
  };
}

// Hook to get total number of units
export function useNextUnitId() {
  const { chainId, unitRegistryAddress } = useProtocolDataNetwork();
  return useReadContract({
    chainId: chainId ?? undefined,
    address: unitRegistryAddress,
    abi: UNIT_REGISTRY_ABI,
    functionName: 'nextUnitId',
    query: { enabled: Boolean(chainId && unitRegistryAddress) },
  });
}

// Hook to get a single unit by ID
export function useUnit(unitId: number | bigint) {
  const { chainId, unitRegistryAddress } = useProtocolDataNetwork();
  const result = useReadContract({
    chainId: chainId ?? undefined,
    address: unitRegistryAddress,
    abi: UNIT_REGISTRY_ABI,
    functionName: 'getUnit',
    args: [BigInt(unitId)],
    query: { enabled: Boolean(chainId && unitRegistryAddress) },
  });

  // Transform the result into typed Unit object
  const normalized = normalizeUnitResult(result.data);
  if (normalized) {
    const unit: Unit = {
      name: normalized.name,
      step: normalized.step,
      minAmount: normalized.minAmount,
      active: normalized.active,
      locked: normalized.locked,
    };

    return {
      ...result,
      unit,
    };
  }

  return {
    ...result,
    unit: undefined,
  };
}
