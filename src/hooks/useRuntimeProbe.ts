/**
 * useRuntimeProbe — Phase 3A Runtime Status Check
 * =================================================
 * Probes all deployed contracts on BSC Testnet (chainId 97):
 *   1. Contract liveness (9 contracts via VERSION / nextXxxId reads)
 *   2. UnitRegistry seeds (9 units: PIECE → SET)
 *   3. FeeManager config (platform/DAO/burn/total bps)
 *   4. ShippingRegistry options (nextOptionId)
 *   5. Wallet chain (expects chainId 97)
 *   6. Supabase runtime tables (protocol_assets, protocol_orders)
 */

import { useReadContracts, useChainId } from 'wagmi';
import { useMemo } from 'react';
import {
  CONTRACTS,
  CHAIN_CONFIG,
  UNIT_IDS,
  PROTOCOL,
} from '@/config/contracts';
import {
  MARKETPLACE_ABI,
  ORINA_RWA_ABI,
  FEE_MANAGER_ABI,
  UNIT_REGISTRY_ABI,
  SHIPPING_REGISTRY_ABI,
  DISPUTE_MANAGER_ABI,
  AUTO_TIME_MANAGER_ABI,
  PAYMENT_GATEWAY_ABI,
  RECEIPT_NFT_ABI,
} from '@/config/abis';
import { restSelect, isSupabaseRestEnabled } from '@/utils/supabaseRest';

// ── Types ──────────────────────────────────────────────────────

export type ProbeStatus = 'ok' | 'warn' | 'error' | 'loading';

export interface ContractProbeResult {
  name: string;
  address: string;
  status: ProbeStatus;
  version?: string;
  detail?: string;
}

export interface UnitProbeResult {
  id: number;
  name: string;
  step: bigint;
  minAmount: bigint;
  active: boolean;
  status: ProbeStatus;
}

export interface FeeProbeResult {
  platformBps: bigint;
  daoBps: bigint;
  burnBps: bigint;
  totalBps: bigint;
  status: ProbeStatus;
  detail?: string;
}

export interface ChainProbeResult {
  chainId: number;
  expected: number;
  status: ProbeStatus;
  detail: string;
}

export interface SupabaseTableProbeResult {
  table: string;
  status: ProbeStatus;
  detail?: string;
}

export interface RuntimeProbeReport {
  isLoading: boolean;
  contracts: ContractProbeResult[];
  units: UnitProbeResult[];
  fees: FeeProbeResult | null;
  chain: ChainProbeResult;
  supabase: SupabaseTableProbeResult[];
  summary: {
    total: number;
    ok: number;
    warn: number;
    error: number;
  };
}

// ── Supabase probe (non-hook, called in effect) ────────────────

export async function probeSupabaseTables(): Promise<SupabaseTableProbeResult[]> {
  if (!isSupabaseRestEnabled()) {
    return [
      { table: 'protocol_assets', status: 'warn', detail: 'Supabase REST not configured' },
      { table: 'protocol_orders', status: 'warn', detail: 'Supabase REST not configured' },
    ];
  }

  const tables = ['protocol_assets', 'protocol_orders'] as const;
  const results: SupabaseTableProbeResult[] = [];

  for (const table of tables) {
    try {
      // Lightweight probe: select 0 rows, just check table is accessible
      await restSelect(table, '?limit=0&select=id');
      results.push({ table, status: 'ok' });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      // 406 / empty result is still "table exists" — only hard errors = error
      results.push({ table, status: 'error', detail: msg });
    }
  }

  return results;
}

// ── Main hook ──────────────────────────────────────────────────

export function useRuntimeProbe() {
  const chainId = useChainId();

  // ── Build multicall contracts array ──────────────────────────
  const calls = useMemo(() => [
    // --- Contract liveness ---
    // 0: MarketplaceATP VERSION
    { address: CONTRACTS.MARKETPLACE_ATP, abi: MARKETPLACE_ABI, functionName: 'VERSION' },
    // 1: MarketplaceATP nextOrderId
    { address: CONTRACTS.MARKETPLACE_ATP, abi: MARKETPLACE_ABI, functionName: 'nextOrderId' },
    // 2: OrinaRWA VERSION
    { address: CONTRACTS.ORINA_RWA, abi: ORINA_RWA_ABI, functionName: 'VERSION' },
    // 3: OrinaRWA nextAssetId
    { address: CONTRACTS.ORINA_RWA, abi: ORINA_RWA_ABI, functionName: 'nextAssetId' },
    // 4: FeeManager VERSION
    { address: CONTRACTS.FEE_MANAGER, abi: FEE_MANAGER_ABI, functionName: 'VERSION' },
    // 5: UnitRegistry nextUnitId
    { address: CONTRACTS.UNIT_REGISTRY, abi: UNIT_REGISTRY_ABI, functionName: 'nextUnitId' },
    // 6: ShippingRegistry nextOptionId
    { address: CONTRACTS.SHIPPING_REGISTRY, abi: SHIPPING_REGISTRY_ABI, functionName: 'nextOptionId' },
    // 7: DisputeManager VERSION
    { address: CONTRACTS.DISPUTE_MANAGER, abi: DISPUTE_MANAGER_ABI, functionName: 'VERSION' },
    // 8: AutoTimeManager VERSION
    { address: CONTRACTS.AUTOTIME_MANAGER, abi: AUTO_TIME_MANAGER_ABI, functionName: 'VERSION' },
    // 9: PaymentGateway VERSION
    { address: CONTRACTS.PAYMENT_GATEWAY, abi: PAYMENT_GATEWAY_ABI, functionName: 'VERSION' },
    // 10: RWAReceiptNFT VERSION
    { address: CONTRACTS.RECEIPT_NFT, abi: RECEIPT_NFT_ABI, functionName: 'VERSION' },

    // --- FeeManager config ---
    // 11: platformFeeBps
    { address: CONTRACTS.FEE_MANAGER, abi: FEE_MANAGER_ABI, functionName: 'platformFeeBps' },
    // 12: daoFeeBps
    { address: CONTRACTS.FEE_MANAGER, abi: FEE_MANAGER_ABI, functionName: 'daoFeeBps' },
    // 13: burnFeeBps
    { address: CONTRACTS.FEE_MANAGER, abi: FEE_MANAGER_ABI, functionName: 'burnFeeBps' },
    // 14: getTotalFeeBps
    { address: CONTRACTS.FEE_MANAGER, abi: FEE_MANAGER_ABI, functionName: 'getTotalFeeBps' },

    // --- UnitRegistry seeds (IDs 0–8) ---
    // 15–23: getUnit(0..8)
    ...Object.values(UNIT_IDS).map((id) => ({
      address: CONTRACTS.UNIT_REGISTRY,
      abi: UNIT_REGISTRY_ABI,
      functionName: 'getUnit',
      args: [BigInt(id)],
    })),
  ] as const, []);

  const { data, isLoading, isError } = useReadContracts({
    contracts: calls as Parameters<typeof useReadContracts>[0]['contracts'],
    query: { staleTime: 30_000 },
  });

  // ── Parse results ─────────────────────────────────────────────

  const report = useMemo<RuntimeProbeReport>(() => {
    const loading = isLoading || !data;

    // ── Chain probe ──────────────────────────────────────────────
    const chain: ChainProbeResult = {
      chainId,
      expected: CHAIN_CONFIG.TESTNET_CHAIN_ID,
      status: chainId === CHAIN_CONFIG.TESTNET_CHAIN_ID ? 'ok'
        : chainId === 0 ? 'warn'
        : 'error',
      detail: chainId === CHAIN_CONFIG.TESTNET_CHAIN_ID
        ? 'BSC Testnet (97) ✓'
        : chainId === 0
        ? 'No wallet connected'
        : `Wrong chain: ${chainId}, expected 97 (BSC Testnet)`,
    };

    if (loading) {
      return {
        isLoading: true,
        contracts: [],
        units: [],
        fees: null,
        chain,
        supabase: [],
        summary: { total: 0, ok: 0, warn: 0, error: 0 },
      };
    }

    const get = (index: number) => data[index];
    const val = (index: number) => get(index)?.result;
    const ok = (index: number) => get(index)?.status === 'success';

    // ── Contracts liveness ────────────────────────────────────────

    type ContractSpec = {
      name: string;
      address: string;
      versionIdx: number;
      counterIdx: number;
      counterLabel: string;
    };

    const contractSpecs: ContractSpec[] = [
      { name: 'MarketplaceATP',    address: CONTRACTS.MARKETPLACE_ATP,   versionIdx: 0,  counterIdx: 1,  counterLabel: 'nextOrderId' },
      { name: 'OrinaRWA',          address: CONTRACTS.ORINA_RWA,         versionIdx: 2,  counterIdx: 3,  counterLabel: 'nextAssetId' },
      { name: 'FeeManager',        address: CONTRACTS.FEE_MANAGER,       versionIdx: 4,  counterIdx: -1, counterLabel: '' },
      { name: 'UnitRegistry',      address: CONTRACTS.UNIT_REGISTRY,     versionIdx: -1, counterIdx: 5,  counterLabel: 'nextUnitId' },
      { name: 'ShippingRegistry',  address: CONTRACTS.SHIPPING_REGISTRY, versionIdx: -1, counterIdx: 6,  counterLabel: 'nextOptionId' },
      { name: 'DisputeManager',    address: CONTRACTS.DISPUTE_MANAGER,   versionIdx: 7,  counterIdx: -1, counterLabel: '' },
      { name: 'AutoTimeManager',   address: CONTRACTS.AUTOTIME_MANAGER,  versionIdx: 8,  counterIdx: -1, counterLabel: '' },
      { name: 'PaymentGateway',    address: CONTRACTS.PAYMENT_GATEWAY,   versionIdx: 9,  counterIdx: -1, counterLabel: '' },
      { name: 'RWAReceiptNFT',     address: CONTRACTS.RECEIPT_NFT,       versionIdx: 10, counterIdx: -1, counterLabel: '' },
    ];

    const contracts: ContractProbeResult[] = contractSpecs.map((spec) => {
      const versionOk = spec.versionIdx >= 0 ? ok(spec.versionIdx) : true;
      const counterOk = spec.counterIdx >= 0 ? ok(spec.counterIdx) : true;
      const alive = versionOk && counterOk;

      const version = spec.versionIdx >= 0 ? (val(spec.versionIdx) as string | undefined) : undefined;
      const counter = spec.counterIdx >= 0 ? (val(spec.counterIdx) as bigint | undefined) : undefined;

      let detail = '';
      if (!alive) detail = 'Call failed — contract unreachable or ABI mismatch';
      else if (counter !== undefined) detail = `${spec.counterLabel}: ${counter.toString()}`;

      return {
        name: spec.name,
        address: spec.address,
        status: alive ? 'ok' : 'error',
        version,
        detail,
      };
    });

    // ── Fee probe ──────────────────────────────────────────────────

    let fees: FeeProbeResult | null = null;
    if (ok(11) && ok(12) && ok(13) && ok(14)) {
      const platformBps = val(11) as bigint;
      const daoBps      = val(12) as bigint;
      const burnBps     = val(13) as bigint;
      const totalBps    = val(14) as bigint;

      const expectedTotal = BigInt(
        PROTOCOL.DEFAULT_PLATFORM_FEE_BPS +
        PROTOCOL.DEFAULT_DAO_FEE_BPS +
        PROTOCOL.DEFAULT_BURN_FEE_BPS
      );
      const totalMatch = totalBps === expectedTotal;

      fees = {
        platformBps,
        daoBps,
        burnBps,
        totalBps,
        status: totalMatch ? 'ok' : 'warn',
        detail: totalMatch
          ? `Total ${totalBps}bps matches expected ${expectedTotal}bps`
          : `Total ${totalBps}bps ≠ expected ${expectedTotal}bps — fees may have been updated`,
      };
    } else {
      fees = {
        platformBps: 0n, daoBps: 0n, burnBps: 0n, totalBps: 0n,
        status: 'error',
        detail: 'FeeManager read failed',
      };
    }

    // ── Units probe ────────────────────────────────────────────────

    const unitNames = Object.keys(UNIT_IDS);
    const units: UnitProbeResult[] = unitNames.map((key, i) => {
      const idx = 15 + i;
      const result = get(idx);
      if (result?.status !== 'success' || !result.result) {
        return {
          id: i,
          name: key,
          step: 0n,
          minAmount: 0n,
          active: false,
          status: 'error' as ProbeStatus,
        };
      }
      // UnitRegistry.getUnit returns struct: (name, step, minAmount, active, locked)
      const raw = result.result as readonly [string, bigint, bigint, boolean, boolean];
      const [, step, minAmount, active] = raw;

      let status: ProbeStatus = 'ok';
      if (!active) status = 'warn';
      if (step === 0n) status = 'error';

      return {
        id: i,
        name: key,
        step,
        minAmount,
        active,
        status,
      };
    });

    // ── Summary ────────────────────────────────────────────────────

    const allStatuses: ProbeStatus[] = [
      ...contracts.map((c) => c.status),
      fees?.status ?? 'error',
      chain.status,
      ...units.map((u) => u.status),
    ];

    const summary = {
      total: allStatuses.length,
      ok:    allStatuses.filter((s) => s === 'ok').length,
      warn:  allStatuses.filter((s) => s === 'warn').length,
      error: allStatuses.filter((s) => s === 'error').length,
    };

    return {
      isLoading: false,
      contracts,
      units,
      fees,
      chain,
      supabase: [],    // filled async by panel via probeSupabaseTables()
      summary,
    };
  }, [data, isLoading, isError, chainId]);

  return report;
}
