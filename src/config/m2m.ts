import { CONTRACTS, PAYMENT_TOKENS } from '@/config/contracts';
import type { AIM2MAction } from '@/app/types/ai-m2m-wallet';
import { LIVE_PROTOCOL_CONTRACTS } from '@/utils/protocolNetwork';

const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};
const DEFAULT_M2M_DELEGATION_MANAGER = '0xb27C8eCc266423dDA3323983Ae3a2eF691ed8a13';
const DEFAULT_M2M_AI_WALLET_FACTORY_V2 = '0xD838268fa8dF6AFD1Fd79D9C0Fd243A3D23D0441';

function parseOptionalAddress(value: string | undefined): `0x${string}` | null {
  const normalized = String(value || '').trim();
  return /^0x[a-fA-F0-9]{40}$/.test(normalized) ? (normalized as `0x${string}`) : null;
}

export const M2M_CONTRACTS = {
  DELEGATION_MANAGER: parseOptionalAddress(env.VITE_M2M_DELEGATION_MANAGER || DEFAULT_M2M_DELEGATION_MANAGER),
  AI_WALLET_FACTORY_V2: parseOptionalAddress(env.VITE_M2M_AI_WALLET_FACTORY_V2 || DEFAULT_M2M_AI_WALLET_FACTORY_V2),
} as const;

export const M2M_FEATURES = {
  SESSION_MODEL: 'delegated_session_v1',
  EXECUTION_MODE: 'direct_delegate_transactions',
  PREFUND_REQUIRED: false,
  REDEPLOY_ON_EXPIRY: false,
  NO_EXPIRY_OPTION: true,
  SWEEP_IDLE_FUNDS_TO_PARENT: true,
  ROOT_FALLBACK_ENABLED: true,
  ONCHAIN_READY: Boolean(M2M_CONTRACTS.DELEGATION_MANAGER && M2M_CONTRACTS.AI_WALLET_FACTORY_V2),
} as const;

export const M2M_ACTION_DESCRIPTIONS: Record<AIM2MAction, string> = {
  buy: 'Buy items using the AI wallet balance.',
  mint: 'Create listings while keeping your main seller wallet in control.',
  sign_order: 'Confirm seller-side order steps before a dispute starts.',
};

export const M2M_PROTOCOL_GUARDRAILS = [
  'Your main wallet stays the official buyer or seller.',
  'Ending the AI setup never removes your main wallet as a direct backup.',
  'Creating the AI wallet locks in the rules for the current setup.',
  'Only one AI wallet setup can stay active at a time for each main wallet.',
  'Any unused balance returns to your main wallet before the setup closes.',
] as const;

export const M2M_REQUIRED_CORE_CONTRACTS = {
  MARKETPLACE_ATP: LIVE_PROTOCOL_CONTRACTS.MARKETPLACE_ATP,
  PAYMENT_GATEWAY: LIVE_PROTOCOL_CONTRACTS.PAYMENT_GATEWAY,
} as const;

export const M2M_DEFAULT_PAYMENT_TOKEN = PAYMENT_TOKENS.USDT;
