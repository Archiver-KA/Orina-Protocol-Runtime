import { useMemo } from 'react';
import { useReadContract, useReadContracts } from 'wagmi';
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
  [UNIT_IDS.PIECE]: 'PIECE',
  [UNIT_IDS.KG]:    'KG',
  [UNIT_IDS.TON]:   'TON',
  [UNIT_IDS.LIT]:   'LIT',
  [UNIT_IDS.M]:     'M',
  [UNIT_IDS.M2]:    'M2',
  [UNIT_IDS.M3]:    'M3',
  [UNIT_IDS.HOUR]:  'HOUR',
  [UNIT_IDS.SET]:   'SET',
};

type UnitResultShape = {
  name: string;
  step: bigint;
  minAmount: bigint;
  active: boolean;
  locked: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function normalizeUnitResult(result: unknown): UnitResultShape | null {
  if (Array.isArray(result)) {
    const [name, step, minAmount, active, locked] = result;
    if (
      typeof name === 'string' &&
      typeof step === 'bigint' &&
      typeof minAmount === 'bigint' &&
      typeof active === 'boolean' &&
      typeof locked === 'boolean'
    ) {
      return { name, step, minAmount, active, locked };
    }
    return null;
  }

  if (!isRecord(result)) return null;

  const name = result.name;
  const step = result.step;
  const minAmount = result.minAmount;
  const active = result.active;
  const locked = result.locked;

  if (
    typeof name === 'string' &&
    typeof step === 'bigint' &&
    typeof minAmount === 'bigint' &&
    typeof active === 'boolean' &&
    typeof locked === 'boolean'
  ) {
    return { name, step, minAmount, active, locked };
  }

  return null;
}

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
        const normalized = normalizeUnitResult(result.result);
        if (!normalized) return null;
        return {
          id,
          name: normalized.name,
          label: UNIT_LABELS[id] ?? `Unit ${id} — ${normalized.name}`,
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
