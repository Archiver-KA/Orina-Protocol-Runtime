import { ACTIVE_CHAIN_ID } from '@/config/contracts';

export function normalizeAddress(address: string): string {
  return address.toLowerCase();
}

export function scopedAddress(address: string): string {
  return `${normalizeAddress(address)}_chain_${ACTIVE_CHAIN_ID}`;
}

