/**
 * useFeeManager - Fee Reading & Calculation
 * ==========================================
 * Read current fee rates and calculate fee breakdowns.
 */

import { useReadContract } from 'wagmi';
import { CONTRACTS } from '@/config/contracts';
import { FEE_MANAGER_ABI } from '@/config/abis';
import { useMemo } from 'react';

// ── Read Current Fee Rates ────────────────────────────────────

export function useFeeRates() {
  const platform = useReadContract({
    address: CONTRACTS.FEE_MANAGER,
    abi: FEE_MANAGER_ABI,
    functionName: 'platformFeeBps',
  });
  const dao = useReadContract({
    address: CONTRACTS.FEE_MANAGER,
    abi: FEE_MANAGER_ABI,
    functionName: 'daoFeeBps',
  });
  const burn = useReadContract({
    address: CONTRACTS.FEE_MANAGER,
    abi: FEE_MANAGER_ABI,
    functionName: 'burnFeeBps',
  });
  const total = useReadContract({
    address: CONTRACTS.FEE_MANAGER,
    abi: FEE_MANAGER_ABI,
    functionName: 'getTotalFeeBps',
  });
  const maxTotal = useReadContract({
    address: CONTRACTS.FEE_MANAGER,
    abi: FEE_MANAGER_ABI,
    functionName: 'MAX_TOTAL_BPS',
  });

  const isLoading = platform.isLoading || dao.isLoading || burn.isLoading;

  return {
    platformFeeBps: platform.data as bigint | undefined,
    daoFeeBps: dao.data as bigint | undefined,
    burnFeeBps: burn.data as bigint | undefined,
    totalFeeBps: total.data as bigint | undefined,
    maxTotalBps: maxTotal.data as bigint | undefined,
    isLoading,
    // Formatted percentages
    platformPercent: platform.data ? Number(platform.data) / 100 : undefined,
    daoPercent: dao.data ? Number(dao.data) / 100 : undefined,
    burnPercent: burn.data ? Number(burn.data) / 100 : undefined,
    totalPercent: total.data ? Number(total.data) / 100 : undefined,
  };
}

// ── Calculate Fees for an Amount ──────────────────────────────

export function useCalculateFees(amount: bigint | undefined) {
  return useReadContract({
    address: CONTRACTS.FEE_MANAGER,
    abi: FEE_MANAGER_ABI,
    functionName: 'calculateFees',
    args: amount !== undefined ? [amount] : undefined,
    query: { enabled: amount !== undefined && amount > 0n },
  });
}

// ── Client-side Fee Calculation (using snapshot BPS) ──────────

export function useCalculateOrderFees(
  grossPrice: bigint | undefined,
  platformBps: bigint | undefined,
  daoBps: bigint | undefined,
  burnBps: bigint | undefined,
) {
  return useMemo(() => {
    if (!grossPrice || platformBps === undefined || daoBps === undefined || burnBps === undefined) {
      return null;
    }

    const platform = (grossPrice * platformBps) / 10000n;
    const dao = (grossPrice * daoBps) / 10000n;
    const burn = (grossPrice * burnBps) / 10000n;
    const totalFees = platform + dao + burn;
    const net = grossPrice - totalFees;

    return {
      platform,
      dao,
      burn,
      totalFees,
      net,
      grossPrice,
    };
  }, [grossPrice, platformBps, daoBps, burnBps]);
}
