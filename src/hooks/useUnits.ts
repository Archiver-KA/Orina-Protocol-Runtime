import { useReadContract, useReadContracts } from 'wagmi';
import { useMemo } from 'react';
import { CONTRACTS, UNIT_IDS } from '@/config/contracts';
import { UNIT_REGISTRY_ABI } from '@/config/abis';
import type { Unit } from '@/types/contracts';

export interface UnitOption {
  id: number;
  name: string;       // on-chain name (e.g. "KG")
  label: string;      // display label (e.g. "KG — kilogram")
  step: bigint;
  minAmount: bigint;
  active: boolean;
  locked: boolean;
}

// Human-readable labels for seeded unit IDs — English first
const UNIT_LABELS: Record<number, string> = {
  [UNIT_IDS.PIECE]: 'PIECE — each / unit',
  [UNIT_IDS.KG]:    'KG — kilogram',
  [UNIT_IDS.TON]:   'TON — metric ton',
  [UNIT_IDS.LIT]:   'LIT — liter',
  [UNIT_IDS.M]:     'M — meter',
  [UNIT_IDS.M2]:    'M2 — square meter',
  [UNIT_IDS.M3]:    'M3 — cubic meter',
  [UNIT_IDS.HOUR]:  'HOUR — service hour',
  [UNIT_IDS.SET]:   'SET — set / bundle',
};

/** Batch-fetch all 9 seeded units from UnitRegistry in one multicall. */
export function useAllUnits() {
  const unitIds = Object.values(UNIT_IDS) as number[]; // [0..8]

  const { data, isLoading, isError } = useReadContracts({
    contracts: unitIds.map((id) => ({
      address: CONTRACTS.UNIT_REGISTRY,
      abi: UNIT_REGISTRY_ABI,
      functionName: 'getUnit',
      args: [BigInt(id)],
    })),
    query: { staleTime: 60_000 },
  });

  const units = useMemo<UnitOption[]>(() => {
    if (!data) return [];
    return unitIds
      .map((id, i) => {
        const result = data[i];
        if (result?.status !== 'success' || !result.result) return null;
        const [onChainName, step, minAmount, active, locked] = result.result as [
          string, bigint, bigint, boolean, boolean
        ];
        return {
          id,
          name: onChainName,
          label: UNIT_LABELS[id] ?? `Unit ${id} — ${onChainName}`,
          step,
          minAmount,
          active,
          locked,
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
        label: UNIT_LABELS[id] ?? `Unit ${id}`,
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
  return useReadContract({
    address: CONTRACTS.UNIT_REGISTRY,
    abi: UNIT_REGISTRY_ABI,
    functionName: 'nextUnitId',
  });
}

// Hook to get a single unit by ID
export function useUnit(unitId: number | bigint) {
  const result = useReadContract({
    address: CONTRACTS.UNIT_REGISTRY,
    abi: UNIT_REGISTRY_ABI,
    functionName: 'getUnit',
    args: [BigInt(unitId)],
  });

  // Transform the result into typed Unit object
  if (result.data && Array.isArray(result.data)) {
    const [name, step, minAmount, active, locked] = result.data;
    
    const unit: Unit = {
      name: name as string,
      step: step as bigint,
      minAmount: minAmount as bigint,
      active: active as boolean,
      locked: locked as boolean,
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