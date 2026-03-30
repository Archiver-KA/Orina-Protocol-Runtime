/**
 * useShippingRegistry - Shipping Options
 * =======================================
 * Read shipping options configured by governance.
 */

import { useReadContract } from 'wagmi';
import { SHIPPING_REGISTRY_ABI } from '@/config/abis';
import { useState, useEffect } from 'react';
import type { ShippingOption } from '@/types/contracts';
import { ShippingType } from '@/config/contracts';
import { useProtocolDataNetwork } from './useProtocolDataNetwork';

// ── Read Hooks ────────────────────────────────────────────────

/** Get total number of shipping options */
export function useNextOptionId() {
  const { chainId, shippingRegistryAddress } = useProtocolDataNetwork();
  return useReadContract({
    chainId: chainId ?? undefined,
    address: shippingRegistryAddress,
    abi: SHIPPING_REGISTRY_ABI,
    functionName: 'nextOptionId',
    query: { enabled: Boolean(chainId && shippingRegistryAddress) },
  });
}

/** Get a specific shipping option by ID */
export function useShippingOption(optionId: bigint | undefined) {
  const { chainId, shippingRegistryAddress } = useProtocolDataNetwork();
  return useReadContract({
    chainId: chainId ?? undefined,
    address: shippingRegistryAddress,
    abi: SHIPPING_REGISTRY_ABI,
    functionName: 'getOption',
    args: optionId !== undefined ? [optionId] : undefined,
    query: { enabled: Boolean(chainId && shippingRegistryAddress && optionId !== undefined) },
  });
}

/** Get all active shipping options */
export function useAllShippingOptions() {
  const { data: nextId } = useNextOptionId();
  const [options, setOptions] = useState<(ShippingOption & { id: bigint })[]>([]);

  // For now, return mock shipping options since we can't do dynamic multicalls easily
  // In production, use a multicall or event scanning approach
  useEffect(() => {
    if (nextId === undefined) {
      // Provide default options for UI when contract not available
      setOptions([
        {
          id: 0n,
          shipType: ShippingType.FREE,
          estTimeMin: 604800n,   // 7 days
          estTimeMax: 1209600n,  // 14 days
          feeBps: 0n,
          active: true,
        },
        {
          id: 1n,
          shipType: ShippingType.ORINA_API,
          estTimeMin: 259200n,   // 3 days
          estTimeMax: 604800n,   // 7 days
          feeBps: 200n,          // 2%
          active: true,
        },
        {
          id: 2n,
          shipType: ShippingType.SELF,
          estTimeMin: 86400n,    // 1 day
          estTimeMax: 2592000n,  // 30 days
          feeBps: 0n,
          active: true,
        },
      ]);
    }
  }, [nextId]);

  return { options, isLoading: false };
}

// ── Helper: Format shipping type ──────────────────────────────

export function getShippingTypeName(shipType: ShippingType): string {
  switch (shipType) {
    case ShippingType.FREE: return 'Free Shipping';
    case ShippingType.ORINA_API: return 'Orina Logistics';
    case ShippingType.SELF: return 'Self Arrange';
    default: return 'Unknown';
  }
}

export function getShippingTimeRange(minSeconds: bigint, maxSeconds: bigint): string {
  const minDays = Number(minSeconds) / 86400;
  const maxDays = Number(maxSeconds) / 86400;

  if (minDays === maxDays) return `${minDays} days`;
  return `${minDays}-${maxDays} days`;
}
