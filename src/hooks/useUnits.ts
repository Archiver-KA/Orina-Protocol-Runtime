import { useReadContract } from 'wagmi';
import { CONTRACTS } from '@/config/contracts';
import { UNIT_REGISTRY_ABI } from '@/config/abis';
import type { Unit } from '@/types/contracts';

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