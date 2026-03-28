import { CONTRACTS, PAYMENT_TOKENS } from '@/config/contracts';
import type { AIM2MAction } from '@/app/types/ai-m2m-wallet';

const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};

function parseOptionalAddress(value: string | undefined): `0x${string}` | null {
  const normalized = String(value || '').trim();
  return /^0x[a-fA-F0-9]{40}$/.test(normalized) ? (normalized as `0x${string}`) : null;
}

export const M2M_CONTRACTS = {
  DELEGATION_MANAGER: parseOptionalAddress(env.VITE_M2M_DELEGATION_MANAGER),
  AI_WALLET_FACTORY_V2: parseOptionalAddress(env.VITE_M2M_AI_WALLET_FACTORY_V2),
} as const;

export const M2M_FEATURES = {
  SESSION_MODEL: 'delegated_session_v1',
  EXECUTION_MODE: 'direct_delegate_transactions',
  PREFUND_REQUIRED: false,
  REDEPLOY_ON_EXPIRY: true,
  SWEEP_IDLE_FUNDS_TO_PARENT: true,
  ROOT_FALLBACK_ENABLED: true,
  ONCHAIN_READY: Boolean(M2M_CONTRACTS.DELEGATION_MANAGER && M2M_CONTRACTS.AI_WALLET_FACTORY_V2),
} as const;

export const M2M_ACTION_DESCRIPTIONS: Record<AIM2MAction, string> = {
  buy: 'Delegated createOrderFor + payOrderFor using a prefunded payer vault.',
  mint: 'Delegated mintAssetFor while keeping the root seller canonical.',
  sign_order: 'Delegated sellerConfirmFor for pre-dispute seller-side order progression.',
};

export const M2M_PROTOCOL_GUARDRAILS = [
  'Root wallet remains the canonical buyer or seller for all ATP state.',
  'Delegate expiry or revoke never removes the root wallet direct-action fallback.',
  'AI wallet deployment commits the session policy on-chain in one step and locks the cycle.',
  'One root wallet can only keep one active AI wallet cycle until revoke or expiry closeout finishes.',
  'Idle funds sweep back to the root wallet before revoke or expiry closes the cycle.',
] as const;

export const M2M_REQUIRED_CORE_CONTRACTS = {
  MARKETPLACE_ATP: CONTRACTS.MARKETPLACE_ATP,
  PAYMENT_GATEWAY: CONTRACTS.PAYMENT_GATEWAY,
} as const;

export const M2M_DEFAULT_PAYMENT_TOKEN = PAYMENT_TOKENS.USDT;
