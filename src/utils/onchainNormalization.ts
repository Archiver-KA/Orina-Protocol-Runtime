import { UNIT_IDS } from '@/config/contracts';
import type { Asset, Unit } from '@/types/contracts';

export const UNIT_LABELS: Record<number, string> = {
  [UNIT_IDS.PIECE]: 'PIECE',
  [UNIT_IDS.KG]: 'KG',
  [UNIT_IDS.TON]: 'TON',
  [UNIT_IDS.LIT]: 'LIT',
  [UNIT_IDS.M]: 'M',
  [UNIT_IDS.M2]: 'M2',
  [UNIT_IDS.M3]: 'M3',
  [UNIT_IDS.HOUR]: 'HOUR',
  [UNIT_IDS.SET]: 'SET',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function normalizeAssetResult(result: unknown): Asset | null {
  if (Array.isArray(result)) {
    const [seller, unitId, totalAmount, availableAmount, consumedAmount, active, expiryAt, finalized, assetType] = result;
    if (
      typeof seller === 'string' &&
      typeof unitId === 'bigint' &&
      typeof totalAmount === 'bigint' &&
      typeof availableAmount === 'bigint' &&
      typeof consumedAmount === 'bigint' &&
      typeof active === 'boolean' &&
      typeof expiryAt === 'bigint' &&
      typeof finalized === 'boolean' &&
      typeof assetType === 'number'
    ) {
      return {
        seller: seller as `0x${string}`,
        unitId,
        totalAmount,
        availableAmount,
        consumedAmount,
        active,
        expiryAt,
        finalized,
        assetType,
      };
    }
    return null;
  }

  if (!isRecord(result)) return null;

  const seller = result.seller;
  const unitId = result.unitId;
  const totalAmount = result.totalAmount;
  const availableAmount = result.availableAmount;
  const consumedAmount = result.consumedAmount;
  const active = result.active;
  const expiryAt = result.expiryAt;
  const finalized = result.finalized;
  const assetType = result.assetType;

  if (
    typeof seller === 'string' &&
    typeof unitId === 'bigint' &&
    typeof totalAmount === 'bigint' &&
    typeof availableAmount === 'bigint' &&
    typeof consumedAmount === 'bigint' &&
    typeof active === 'boolean' &&
    typeof expiryAt === 'bigint' &&
    typeof finalized === 'boolean' &&
    typeof assetType === 'number'
  ) {
    return {
      seller: seller as `0x${string}`,
      unitId,
      totalAmount,
      availableAmount,
      consumedAmount,
      active,
      expiryAt,
      finalized,
      assetType,
    };
  }

  return null;
}

export function normalizeUnitResult(result: unknown): Unit | null {
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

export function getUnitDisplayLabel(unitId: number | bigint, unitName?: string | null): string {
  const numericId = Number(unitId);
  const fallbackLabel = Number.isFinite(numericId)
    ? UNIT_LABELS[numericId] ?? `Unit ${String(unitId)}`
    : `Unit ${String(unitId)}`;
  const normalizedName = String(unitName || '').trim();
  return normalizedName || fallbackLabel;
}

export function parseOnchainBigIntLike(value: unknown): bigint | null {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return BigInt(Math.trunc(value));
  }
  if (typeof value === 'string') {
    const normalized = value.trim();
    if (!normalized) return null;
    try {
      return BigInt(normalized);
    } catch {
      return null;
    }
  }
  return null;
}
