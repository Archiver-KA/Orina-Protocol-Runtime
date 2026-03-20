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

export function useFeeRates(paymentToken?: `0x${string}`) {
  const useTokenPreset = !!paymentToken;

  const platform = useReadContract({
    address: CONTRACTS.FEE_MANAGER,
    abi: FEE_MANAGER_ABI,
    functionName: useTokenPreset ? 'getPlatformFeeBpsForToken' : 'platformFeeBps',
    args: paymentToken ? [paymentToken] : undefined,
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
  const referral = useReadContract({
    address: CONTRACTS.FEE_MANAGER,
    abi: FEE_MANAGER_ABI,
    functionName: 'referralFeeBps',
  });
  const total = useReadContract({
    address: CONTRACTS.FEE_MANAGER,
    abi: FEE_MANAGER_ABI,
    functionName: useTokenPreset ? 'getTotalFeeBpsForToken' : 'getTotalFeeBps',
    args: paymentToken ? [paymentToken] : undefined,
  });
  const maxTotal = useReadContract({
    address: CONTRACTS.FEE_MANAGER,
    abi: FEE_MANAGER_ABI,
    functionName: 'MAX_TOTAL_BPS',
  });
  const stablePreset = useReadContract({
    address: CONTRACTS.FEE_MANAGER,
    abi: FEE_MANAGER_ABI,
    functionName: 'STABLECOIN_PLATFORM_FEE_BPS',
  });
  const oriPreset = useReadContract({
    address: CONTRACTS.FEE_MANAGER,
    abi: FEE_MANAGER_ABI,
    functionName: 'ORI_PLATFORM_FEE_BPS',
  });

  const isLoading = platform.isLoading || dao.isLoading || burn.isLoading || referral.isLoading;

  return {
    platformFeeBps: platform.data as bigint | undefined,
    daoFeeBps: dao.data as bigint | undefined,
    burnFeeBps: burn.data as bigint | undefined,
    referralFeeBps: referral.data as bigint | undefined,
    totalFeeBps: total.data as bigint | undefined,
    maxTotalBps: maxTotal.data as bigint | undefined,
    stablecoinPlatformFeeBps: stablePreset.data as bigint | undefined,
    oriPlatformFeeBps: oriPreset.data as bigint | undefined,
    isLoading,
    // Formatted percentages
    platformPercent: platform.data ? Number(platform.data) / 100 : undefined,
    daoPercent: dao.data ? Number(dao.data) / 100 : undefined,
    burnPercent: burn.data ? Number(burn.data) / 100 : undefined,
    referralPercent: referral.data ? Number(referral.data) / 100 : undefined,
    totalPercent: total.data ? Number(total.data) / 100 : undefined,
  };
}

// ── Calculate Fees for an Amount ──────────────────────────────

export function useCalculateFees(amount: bigint | undefined, paymentToken?: `0x${string}`) {
  const useTokenPreset = !!paymentToken;
  return useReadContract({
    address: CONTRACTS.FEE_MANAGER,
    abi: FEE_MANAGER_ABI,
    functionName: useTokenPreset ? 'calculateFeesForToken' : 'calculateFees',
    args: amount !== undefined ? (paymentToken ? [paymentToken, amount] : [amount]) : undefined,
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
