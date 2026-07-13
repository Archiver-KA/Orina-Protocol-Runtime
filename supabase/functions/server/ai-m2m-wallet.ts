import { Hono } from 'npm:hono@4.12.29';
import { createClient } from 'npm:@supabase/supabase-js@2.100.1';
import { createPublicClient, createWalletClient, http, type Chain, zeroAddress } from 'npm:viem@2.53.1';
import { privateKeyToAccount } from 'npm:viem@2.53.1/accounts';
import { arbitrumSepolia, baseSepolia, bscTestnet } from 'npm:viem@2.53.1/chains';
import {
  assertAuthenticatedWalletMatch,
  isValidWalletAddress,
  normalizeWalletAddress,
  requireAuthenticatedWallet,
} from './request-auth.ts';
import { checkRateLimit, rateLimitExceededResponse } from './rate-limiter.ts';
import type {
  AIM2MAction,
  AIM2MActionMapping,
  AIM2MDelegateInvite,
  AIM2MDelegateRecord,
  AIM2MPolicyPreview,
  AIM2MWalletConfig,
  AIM2MWalletOverview,
} from './ai-m2m-types.ts';

const aiM2MWallet = new Hono();

const ALLOWED_ACTIONS: AIM2MAction[] = ['buy', 'mint', 'sign_order'];
const DEFAULT_ACTIONS: AIM2MAction[] = ['buy'];
const DELEGATE_INVITE_TTL_MS = 24 * 60 * 60 * 1000;
const DELEGATE_INVITE_RANDOM_BYTES = 32;
const DELEGATE_INVITE_ID_PREFIX = 'm2m_';
const DELEGATE_INVITE_ID_MAX_ATTEMPTS = 8;
const DELEGATE_ENCRYPTION_SECRET_ENV = 'ATP2_M2M_DELEGATE_ENCRYPTION_KEY';
const MAX_DELEGATES_PER_ROOT = 20;
const MAX_PENDING_INVITES_PER_ROOT = 20;
const SELLER_CONFIRM_ACTION_BIT = 1n << 3n;
const DEFAULT_CHAIN_ID = 97;
const DEFAULT_MAX_SELLER_CONFIRM_BATCH = 20;

type SellerConfirmNetwork = {
  chainId: number;
  chain: Chain;
  rpcUrl: string;
  marketplace: string;
  delegationManager: string;
};

function firstEnv(...names: string[]): string {
  for (const name of names) {
    const value = String(Deno.env.get(name) || '').trim();
    if (value) return value;
  }
  return '';
}

const SELLER_CONFIRM_NETWORKS: Record<number, SellerConfirmNetwork> = {
  97: {
    chainId: 97,
    chain: bscTestnet,
    rpcUrl: firstEnv('BSC_TESTNET_RPC', 'BSC_TESTNET_RPC_URL', 'RPC_URL') || 'https://data-seed-prebsc-1-s1.bnbchain.org:8545/',
    marketplace: firstEnv('BSC_TESTNET_MARKETPLACE_ATP_ADDRESS', 'MARKETPLACE_ATP_ADDRESS', 'MARKETPLACE_ATP', 'VITE_MARKETPLACE_ATP') || '0x18E1C8ab257FAf16Ec8257A9715d07661194150B',
    delegationManager: firstEnv('BSC_TESTNET_M2M_DELEGATION_MANAGER', 'M2M_DELEGATION_MANAGER', 'VITE_M2M_DELEGATION_MANAGER') || '0xb27C8eCc266423dDA3323983Ae3a2eF691ed8a13',
  },
  84532: {
    chainId: 84532,
    chain: baseSepolia,
    rpcUrl: firstEnv('BASE_SEPOLIA_RPC', 'BASE_SEPOLIA_RPC_URL') || 'https://sepolia.base.org',
    marketplace: firstEnv('BASE_SEPOLIA_MARKETPLACE_ATP_ADDRESS') || '0x6d132Ba2327573c4e6f97a2167dCddb8059C4d14',
    delegationManager: firstEnv('BASE_SEPOLIA_M2M_DELEGATION_MANAGER') || '0xFC0038B7CC628966f8a7f14414c9386c2d6cB288',
  },
  421614: {
    chainId: 421614,
    chain: arbitrumSepolia,
    rpcUrl: firstEnv('ARBITRUM_SEPOLIA_RPC', 'ARBITRUM_SEPOLIA_RPC_URL') || 'https://sepolia-rollup.arbitrum.io/rpc',
    marketplace: firstEnv('ARBITRUM_SEPOLIA_MARKETPLACE_ATP_ADDRESS') || '0x5863f25A8250EBe20Bd1E3d04FD796081Fc3D72E',
    delegationManager: firstEnv('ARBITRUM_SEPOLIA_M2M_DELEGATION_MANAGER') || '0x56D454f55D5d05b060777F70e653BbBEb1167D2e',
  },
};

const MARKETPLACE_SELLER_CONFIRM_ABI = [{
  type: 'function',
  name: 'sellerConfirmFor',
  stateMutability: 'nonpayable',
  inputs: [
    { name: 'orderId', type: 'uint256' },
    { name: 'rootSeller', type: 'address' },
    { name: 'estDeliverySeconds', type: 'uint256' },
    { name: 'sessionNonce', type: 'uint256' },
  ],
  outputs: [],
}, {
  type: 'function',
  name: 'orders',
  stateMutability: 'view',
  inputs: [{ name: 'orderId', type: 'uint256' }],
  outputs: [
    { name: 'buyer', type: 'address' },
    { name: 'seller', type: 'address' },
    { name: 'payer', type: 'address' },
    { name: 'refundRecipient', type: 'address' },
    { name: 'paymentToken', type: 'address' },
    { name: 'assetId', type: 'uint256' },
    { name: 'amount', type: 'uint256' },
    { name: 'grossPrice', type: 'uint256' },
    { name: 'proposedAt', type: 'uint256' },
    { name: 'paidAt', type: 'uint256' },
    { name: 'autoReleaseAt', type: 'uint256' },
    { name: 'estDeliverySeconds', type: 'uint256' },
    { name: 'payDeadline', type: 'uint256' },
    { name: 'state', type: 'uint8' },
    { name: 'settlementType', type: 'uint8' },
    {
      name: 'split',
      type: 'tuple',
      components: [
        { name: 'buyerShareBps', type: 'uint256' },
        { name: 'sellerShareBps', type: 'uint256' },
      ],
    },
    { name: 'platformFeeBpsSnapshot', type: 'uint256' },
    { name: 'daoFeeBpsSnapshot', type: 'uint256' },
    { name: 'referralFeeBpsSnapshot', type: 'uint256' },
    { name: 'finalized', type: 'bool' },
    { name: 'sellerConfirmed', type: 'bool' },
    { name: 'buyerSig1', type: 'bytes' },
    { name: 'sellerSig', type: 'bytes' },
    { name: 'buyerSig2', type: 'bytes' },
  ],
}] as const;

const MANAGER_READ_ABI = [{
  type: 'function',
  name: 'hasActiveCycle',
  stateMutability: 'view',
  inputs: [{ name: 'root', type: 'address' }],
  outputs: [{ type: 'bool' }],
}, {
  type: 'function',
  name: 'activeSessionNonce',
  stateMutability: 'view',
  inputs: [{ name: 'root', type: 'address' }],
  outputs: [{ name: 'sessionNonce', type: 'uint256' }],
}, {
  type: 'function',
  name: 'getSession',
  stateMutability: 'view',
  inputs: [
    { name: 'root', type: 'address' },
    { name: 'sessionNonce', type: 'uint256' },
  ],
  outputs: [{
    name: 'session',
    type: 'tuple',
    components: [
      { name: 'root', type: 'address' },
      { name: 'delegate', type: 'address' },
      { name: 'payerVault', type: 'address' },
      { name: 'paymentToken', type: 'address' },
      { name: 'maxPerOrder', type: 'uint256' },
      { name: 'maxTotal', type: 'uint256' },
      { name: 'spentTotal', type: 'uint256' },
      { name: 'validFrom', type: 'uint64' },
      { name: 'validUntil', type: 'uint64' },
      { name: 'actionMask', type: 'uint256' },
      { name: 'sessionEpoch', type: 'uint256' },
      { name: 'counterpartyAllowlistHash', type: 'bytes32' },
      { name: 'restrictAssetId', type: 'bool' },
      { name: 'assetId', type: 'uint256' },
      { name: 'maxAmount', type: 'uint256' },
      { name: 'minGrossPrice', type: 'uint256' },
      { name: 'maxGrossPrice', type: 'uint256' },
      { name: 'maxDeliverySeconds', type: 'uint256' },
      { name: 'status', type: 'uint8' },
      { name: 'exists', type: 'bool' },
    ],
  }],
}] as const;

type ManagedDelegateSecretRecord = {
  version: 1;
  ivHex: string;
  ciphertextHex: string;
  createdAt: string;
};

type M2MStateErrorCode =
  | 'delegate_limit'
  | 'invite_limit'
  | 'invite_unavailable'
  | 'delegate_exists'
  | 'delegate_matches_root';

class M2MStateError extends Error {
  constructor(readonly code: M2MStateErrorCode) {
    super(code);
    this.name = 'M2MStateError';
  }
}

function defaultConfig(walletAddress: string): AIM2MWalletConfig {
  const now = new Date().toISOString();
  return {
    id: `ai_m2m_${crypto.randomUUID()}`,
    walletAddress,
    enabled: false,
    selectedDelegateId: null,
    delegateAddress: '',
    paymentToken: null,
    allowedActions: [...DEFAULT_ACTIONS],
    maxPerOrder: '',
    maxTotal: '',
    expiryDays: 7,
    counterpartyAllowlist: [],
    notes: '',
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .slice(0, 100)
    .map((item) => String(item || '').trim().slice(0, 200))
    .filter(Boolean);
}

function normalizeActions(input: unknown): AIM2MAction[] {
  const seen = new Set<AIM2MAction>();
  for (const value of normalizeStringArray(input)) {
    if (ALLOWED_ACTIONS.includes(value as AIM2MAction)) {
      seen.add(value as AIM2MAction);
    }
  }
  return [...seen];
}

function normalizeAmount(value: unknown): string {
  return String(value ?? '').trim();
}

function isValidAmountString(value: string): boolean {
  return /^\d{1,30}(?:\.\d{1,18})?$/.test(value);
}

function decimalToScaledInteger(value: string): bigint {
  const [whole, fraction = ''] = value.split('.');
  return BigInt(`${whole}${fraction.padEnd(18, '0')}`);
}

function isBlank(value: string | null | undefined): boolean {
  return !String(value || '').trim();
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function randomHex(bytesLength: number): string {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(bytesLength)));
}

function generateDelegateInviteId(): string {
  return `${DELEGATE_INVITE_ID_PREFIX}${randomHex(DELEGATE_INVITE_RANDOM_BYTES)}`;
}

async function getDelegateEncryptionKey(): Promise<CryptoKey> {
  const secret = String(Deno.env.get(DELEGATE_ENCRYPTION_SECRET_ENV) || '').trim();
  if (new TextEncoder().encode(secret).byteLength < 32) {
    throw new Error(`${DELEGATE_ENCRYPTION_SECRET_ENV} must contain at least 32 bytes of secret material`);
  }

  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

async function encryptManagedDelegateSecret(privateKey: `0x${string}`): Promise<ManagedDelegateSecretRecord> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await getDelegateEncryptionKey();
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(privateKey),
  );

  return {
    version: 1,
    ivHex: bytesToHex(iv),
    ciphertextHex: bytesToHex(new Uint8Array(ciphertext)),
    createdAt: new Date().toISOString(),
  };
}

function hexToBytes(hex: string): Uint8Array {
  const normalized = String(hex || '').trim().replace(/^0x/i, '');
  if (!normalized || normalized.length % 2 !== 0 || !/^[a-f0-9]+$/i.test(normalized)) {
    throw new Error('Invalid encrypted delegate secret encoding');
  }
  const bytes = new Uint8Array(normalized.length / 2);
  for (let index = 0; index < normalized.length; index += 2) {
    bytes[index / 2] = Number.parseInt(normalized.slice(index, index + 2), 16);
  }
  return bytes;
}

function bytesToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function openManagedDelegateBackup(record: ManagedDelegateSecretRecord): Promise<`0x${string}`> {
  if (!record || record.version !== 1) {
    throw new Error('Unsupported managed delegate secret version');
  }
  const key = await getDelegateEncryptionKey();
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: bytesToArrayBuffer(hexToBytes(record.ivHex)) },
    key,
    bytesToArrayBuffer(hexToBytes(record.ciphertextHex)),
  );
  const privateKey = new TextDecoder().decode(plaintext).trim();
  if (!/^0x[a-f0-9]{64}$/i.test(privateKey)) {
    throw new Error('Managed delegate secret is invalid');
  }
  return privateKey as `0x${string}`;
}

function getSupabaseServiceClient() {
  const url = Deno.env.get('SUPABASE_URL') || '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!url || !serviceRoleKey) throw new Error('Missing Supabase service configuration');
  return createClient(url, serviceRoleKey);
}

function isKeeperAuthorized(c: any): boolean {
  const expectedSecret = String(Deno.env.get('ATP2_M2M_AUTOCONFIRM_SECRET') || '').trim();
  const providedSecret = String(c.req.header('x-ai-m2m-autoconfirm-secret') || '').trim();
  if (expectedSecret.length >= 32 && providedSecret && expectedSecret === providedSecret) return true;

  const serviceRoleKey = String(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '').trim();
  const authorization = String(c.req.header('authorization') || '').trim();
  return Boolean(serviceRoleKey && authorization === `Bearer ${serviceRoleKey}`);
}

function parseOrderIds(input: unknown, maxItems: number): bigint[] {
  if (!Array.isArray(input)) return [];
  const orderIds: bigint[] = [];
  const seen = new Set<string>();
  for (const entry of input) {
    const value = String(entry ?? '').trim();
    if (!/^\d+$/.test(value)) continue;
    const normalized = BigInt(value).toString();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    orderIds.push(BigInt(normalized));
    if (orderIds.length >= maxItems) break;
  }
  return orderIds;
}

function stringifyBigInt(value: unknown): unknown {
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) return value.map(stringifyBigInt);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nested]) => [key, stringifyBigInt(nested)]),
    );
  }
  return value;
}

async function candidateSellerConfirmOrderIds(limit: number, network = SELLER_CONFIRM_NETWORKS[DEFAULT_CHAIN_ID]): Promise<bigint[]> {
  const supabaseUrl = String(Deno.env.get('SUPABASE_URL') || '').trim();
  const serviceRoleKey = String(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '').trim();
  if (!supabaseUrl || !serviceRoleKey) return [];

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from('protocol_orders')
    .select('order_uid')
    .eq('chain_id', network.chainId)
    .eq('marketplace_contract', normalizeWalletAddress(network.marketplace))
    .in('status', ['pending_seller_confirm', 'pending_confirm'])
    .order('updated_at', { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`protocol_orders candidate lookup failed: ${error.message}`);
  }
  return parseOrderIds((data || []).map((row: { order_uid?: string }) => row.order_uid), limit);
}

function buildMappings(config: AIM2MWalletConfig): AIM2MActionMapping[] {
  const mappings: AIM2MActionMapping[] = [];

  if (config.allowedActions.includes('buy')) {
    mappings.push({
      action: 'buy',
      actionBits: ['BUY_CREATE_ORDER', 'BUY_PAY_ORDER'],
      description: 'Delegated buyer flow uses a prefunded payer vault for createOrderFor and payOrderFor.',
    });
  }

  if (config.allowedActions.includes('mint')) {
    mappings.push({
      action: 'mint',
      actionBits: ['SELL_MINT_ASSET'],
      description: 'Delegated mint keeps the root seller canonical through mintAssetFor.',
    });
  }

  if (config.allowedActions.includes('sign_order')) {
    mappings.push({
      action: 'sign_order',
      actionBits: ['SELLER_CONFIRM'],
      description: 'Delegated sign_order maps to sellerConfirmFor in testnet v1 and does not unlock dispute powers.',
    });
  }

  return mappings;
}

function buildPreview(config: AIM2MWalletConfig): AIM2MPolicyPreview {
  const mappings = buildMappings(config);
  const actionBits = mappings.flatMap((item) => item.actionBits);
  const warnings: string[] = [];
  const requiresFunding = config.allowedActions.includes('buy');

  if (config.enabled && !config.selectedDelegateId) {
    warnings.push('Select a verified delegate before the session can be activated.');
  }
  if (config.enabled && isBlank(config.delegateAddress)) {
    warnings.push('A verified delegate must be enrolled or generated before activation.');
  }
  if (config.enabled && config.allowedActions.includes('buy') && isBlank(config.paymentToken || '')) {
    warnings.push('A payment token binding is required for delegated buy sessions.');
  }
  if (config.enabled && config.allowedActions.includes('sign_order') && !config.allowedActions.includes('mint')) {
    warnings.push('sign_order currently maps to sellerConfirmFor and is usually paired with mint for seller-side automation.');
  }
  if (config.enabled && !config.counterpartyAllowlist.length) {
    warnings.push('Counterparty allowlist is empty; the trust surface is broader than the recommended testnet policy.');
  }
  if (config.enabled && requiresFunding && (!isValidAmountString(config.maxPerOrder) || !isValidAmountString(config.maxTotal))) {
    warnings.push('Budget caps should be filled before the delegated session is used in production-like testnet flows.');
  }

  return {
    actionBits,
    mappings,
    warnings,
    guardrails: [
      'Root wallet stays canonical for buyer and seller identity in ATP state.',
      'Expiry or revoke disables only delegated actions; direct root fallback remains available.',
      'Deployment commits the immutable policy and provisions one managed AI signer for the new AI wallet cycle.',
      'Prefunding stays optional and is only needed when the cycle spends buy-side tokens.',
      'Dispute, cancel, and delivery confirm remain root-side actions in the current delegated model.',
    ],
  };
}

function buildOverview(config: AIM2MWalletConfig): AIM2MWalletOverview {
  const preview = buildPreview(config);
  return {
    rootWalletAddress: config.walletAddress,
    sessionModel: 'delegated_session_v1',
    executionMode: 'direct_delegate_transactions',
    configStatus: preview.warnings.length > 0 ? 'needs_review' : 'ready',
    rootFallbackEnabled: true,
    prefundRequired: false,
    rotateOnExpiry: true,
    sweepIdleFundsToParent: true,
    preview,
  };
}

function toDelegateRecord(candidate: unknown, rootWalletAddress: string): AIM2MDelegateRecord | null {
  if (!candidate || typeof candidate !== 'object') return null;
  const source = candidate as Record<string, unknown>;
  const rawDelegateAddress = source.delegate_address ?? source.delegateAddress;
  const delegateAddress = typeof rawDelegateAddress === 'string'
    ? normalizeWalletAddress(rawDelegateAddress)
    : '';
  if (!isValidWalletAddress(delegateAddress)) return null;

  const status = source.status === 'revoked' ? 'revoked' : 'verified';
  const mode = source.mode === 'enrolled' ? 'enrolled' : 'generated';
  const rawCreatedAt = source.created_at ?? source.createdAt;
  const rawVerifiedAt = source.verified_at ?? source.verifiedAt;
  const createdAt = typeof rawCreatedAt === 'string' && rawCreatedAt
    ? rawCreatedAt
    : new Date().toISOString();
  const verifiedAt = typeof rawVerifiedAt === 'string' && rawVerifiedAt
    ? rawVerifiedAt
    : createdAt;
  const rawManagedByServer = source.managed_by_server ?? source.managedByServer;

  return {
    id: typeof source.id === 'string' && source.id ? source.id : `delegate_${crypto.randomUUID()}`,
    rootWalletAddress,
    delegateAddress,
    mode,
    status,
    label: typeof source.label === 'string' && source.label.trim() ? source.label.trim() : null,
    managedByServer: rawManagedByServer === true,
    createdAt,
    verifiedAt,
  };
}

async function getDelegates(rootWalletAddress: string): Promise<AIM2MDelegateRecord[]> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from('m2m_delegates')
    .select('id,root_wallet_address,delegate_address,mode,status,label,managed_by_server,created_at,verified_at')
    .eq('root_wallet_address', rootWalletAddress)
    .order('verified_at', { ascending: false })
    .limit(100);
  if (error) throw new Error('Unable to load M2M delegates');

  return (data || [])
    .map((entry) => toDelegateRecord(entry, rootWalletAddress))
    .filter((entry): entry is AIM2MDelegateRecord => !!entry)
    .sort((left, right) => Date.parse(right.verifiedAt) - Date.parse(left.verifiedAt));
}

function toDelegateInvite(candidate: unknown): AIM2MDelegateInvite | null {
  if (!candidate || typeof candidate !== 'object') return null;
  const source = candidate as Record<string, unknown>;
  const rootWalletAddress = normalizeWalletAddress(String(source.root_wallet_address || ''));
  const id = String(source.id || '');
  const createdAt = String(source.created_at || '');
  const expiresAt = String(source.expires_at || '');
  if (!/^m2m_[a-f0-9]{64}$/.test(id) || !isValidWalletAddress(rootWalletAddress)) return null;
  if (!Number.isFinite(Date.parse(createdAt)) || !Number.isFinite(Date.parse(expiresAt))) return null;

  return {
    id,
    rootWalletAddress,
    status: source.status === 'claimed' ? 'claimed' : source.status === 'expired' ? 'expired' : 'pending',
    createdAt,
    expiresAt,
    claimedAt: source.claimed_at ? String(source.claimed_at) : null,
    claimedByWalletAddress: source.claimed_by_wallet_address
      ? normalizeWalletAddress(String(source.claimed_by_wallet_address))
      : null,
  };
}

function firstRpcRow(data: unknown): Record<string, unknown> | null {
  if (Array.isArray(data)) {
    const first = data[0];
    return first && typeof first === 'object' ? first as Record<string, unknown> : null;
  }
  return data && typeof data === 'object' ? data as Record<string, unknown> : null;
}

function throwM2MStateRpcError(error: unknown, fallbackMessage: string): never {
  const source = error && typeof error === 'object' ? error as Record<string, unknown> : {};
  const message = String(source.message || '');
  if (message.includes('m2m_pending_invite_limit_reached')) throw new M2MStateError('invite_limit');
  if (message.includes('m2m_delegate_limit_reached')) throw new M2MStateError('delegate_limit');
  if (message.includes('m2m_invite_unavailable')) throw new M2MStateError('invite_unavailable');
  if (message.includes('m2m_delegate_already_registered')) throw new M2MStateError('delegate_exists');
  if (message.includes('m2m_delegate_matches_root')) throw new M2MStateError('delegate_matches_root');
  throw new Error(fallbackMessage);
}

async function createDelegateInvite(rootWalletAddress: string): Promise<AIM2MDelegateInvite> {
  const supabase = getSupabaseServiceClient();
  for (let attempt = 0; attempt < DELEGATE_INVITE_ID_MAX_ATTEMPTS; attempt += 1) {
    const { data, error } = await supabase.rpc('atp2_create_m2m_delegate_invite_v1', {
      p_id: generateDelegateInviteId(),
      p_root_wallet_address: rootWalletAddress,
      p_expires_at: new Date(Date.now() + DELEGATE_INVITE_TTL_MS).toISOString(),
    });
    if (error) {
      if (String(error.code || '') === '23505') continue;
      throwM2MStateRpcError(error, 'Unable to create delegate invite');
    }
    const invite = toDelegateInvite(firstRpcRow(data));
    if (!invite) throw new Error('Delegate invite RPC returned an invalid record');
    return invite;
  }
  throw new Error('Unable to allocate a unique delegate invite id');
}

async function registerManagedDelegate(
  delegate: AIM2MDelegateRecord,
  encryptedSecret: ManagedDelegateSecretRecord,
): Promise<AIM2MDelegateRecord> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase.rpc('atp2_register_m2m_managed_delegate_v1', {
    p_id: delegate.id,
    p_root_wallet_address: delegate.rootWalletAddress,
    p_delegate_address: delegate.delegateAddress,
    p_label: delegate.label,
    p_iv_hex: encryptedSecret.ivHex,
    p_ciphertext_hex: encryptedSecret.ciphertextHex,
  });
  if (error) throwM2MStateRpcError(error, 'Unable to register managed delegate');
  const stored = toDelegateRecord(firstRpcRow(data), delegate.rootWalletAddress);
  if (!stored) throw new Error('Managed delegate RPC returned an invalid record');
  return stored;
}

async function claimDelegateInvite(inviteId: string, claimedWalletAddress: string): Promise<AIM2MDelegateRecord> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase.rpc('atp2_claim_m2m_delegate_invite_v1', {
    p_invite_id: inviteId,
    p_claimed_wallet_address: claimedWalletAddress,
    p_delegate_id: `delegate_${crypto.randomUUID()}`,
  });
  if (error) throwM2MStateRpcError(error, 'Unable to claim delegate invite');
  const row = firstRpcRow(data);
  const rootWalletAddress = normalizeWalletAddress(String(row?.root_wallet_address || ''));
  const delegate = toDelegateRecord(row, rootWalletAddress);
  if (!delegate || !isValidWalletAddress(rootWalletAddress)) {
    throw new Error('Delegate invite RPC returned an invalid record');
  }
  return delegate;
}

async function getManagedDelegateSecret(delegateId: string): Promise<ManagedDelegateSecretRecord | null> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from('m2m_delegate_secrets')
    .select('version,iv_hex,ciphertext_hex,created_at')
    .eq('delegate_id', delegateId)
    .maybeSingle();
  if (error) throw new Error('Unable to load managed delegate secret');
  if (!data || data.version !== 1) return null;
  if (!/^[a-f0-9]{24}$/i.test(String(data.iv_hex || '')) || !/^[a-f0-9]{164}$/i.test(String(data.ciphertext_hex || ''))) {
    throw new Error('Managed delegate secret has an invalid encoding');
  }
  return {
    version: 1,
    ivHex: String(data.iv_hex),
    ciphertextHex: String(data.ciphertext_hex),
    createdAt: String(data.created_at),
  };
}

async function getPendingInvites(rootWalletAddress: string): Promise<AIM2MDelegateInvite[]> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from('m2m_delegate_invites')
    .select('id,root_wallet_address,status,created_at,expires_at,claimed_at,claimed_by_wallet_address')
    .eq('root_wallet_address', rootWalletAddress)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(MAX_PENDING_INVITES_PER_ROOT);
  if (error) throw new Error('Unable to load delegate invites');
  return (data || [])
    .map(toDelegateInvite)
    .filter((invite): invite is AIM2MDelegateInvite => !!invite && invite.status === 'pending');
}

function materializeConfigWithDelegates(
  config: AIM2MWalletConfig,
  delegates: AIM2MDelegateRecord[],
): AIM2MWalletConfig {
  const selectedDelegate = config.selectedDelegateId
    ? delegates.find((delegate) => delegate.id === config.selectedDelegateId && delegate.status === 'verified') || null
    : null;

  return {
    ...config,
    selectedDelegateId: selectedDelegate?.id ?? null,
    delegateAddress: selectedDelegate?.delegateAddress ?? '',
  };
}

function sanitizeStoredConfig(candidate: unknown, walletAddress: string): AIM2MWalletConfig {
  const fallback = defaultConfig(walletAddress);
  if (!candidate || typeof candidate !== 'object') {
    return fallback;
  }

  const source = candidate as Record<string, unknown>;
  const selectedDelegateId = source.selected_delegate_id ?? source.selectedDelegateId;
  const paymentToken = source.payment_token ?? source.paymentToken;
  const allowedActions = source.allowed_actions ?? source.allowedActions;
  const maxPerOrder = source.max_per_order ?? source.maxPerOrder;
  const maxTotal = source.max_total ?? source.maxTotal;
  const expiryDays = source.expiry_days ?? source.expiryDays;
  const counterpartyAllowlist = source.counterparty_allowlist ?? source.counterpartyAllowlist;
  const createdAt = source.created_at ?? source.createdAt;
  const updatedAt = source.updated_at ?? source.updatedAt;
  return {
    id: typeof source.id === 'string' && source.id ? source.id : fallback.id,
    walletAddress,
    enabled: source.enabled === true,
    selectedDelegateId: typeof selectedDelegateId === 'string' && selectedDelegateId.trim()
      ? selectedDelegateId.trim()
      : null,
    delegateAddress: '',
    paymentToken: typeof paymentToken === 'string' && paymentToken
      ? normalizeWalletAddress(paymentToken)
      : null,
    allowedActions: normalizeActions(allowedActions).length
      ? normalizeActions(allowedActions)
      : [...fallback.allowedActions],
    maxPerOrder: normalizeAmount(maxPerOrder),
    maxTotal: normalizeAmount(maxTotal),
    expiryDays: Number.isFinite(Number(expiryDays)) ? Math.trunc(Number(expiryDays)) : fallback.expiryDays,
    counterpartyAllowlist: normalizeStringArray(counterpartyAllowlist).map(normalizeWalletAddress),
    notes: typeof source.notes === 'string' ? source.notes : '',
    createdAt: typeof createdAt === 'string' && createdAt ? createdAt : fallback.createdAt,
    updatedAt: typeof updatedAt === 'string' && updatedAt ? updatedAt : fallback.updatedAt,
  };
}

async function loadConfig(walletAddress: string): Promise<AIM2MWalletConfig> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from('m2m_wallet_config')
    .select('id,wallet_address,enabled,selected_delegate_id,payment_token,allowed_actions,max_per_order,max_total,expiry_days,counterparty_allowlist,notes,created_at,updated_at')
    .eq('wallet_address', walletAddress)
    .maybeSingle();
  if (error) throw new Error('Unable to load M2M wallet configuration');
  return sanitizeStoredConfig(data, walletAddress);
}

async function saveConfig(config: AIM2MWalletConfig): Promise<void> {
  const supabase = getSupabaseServiceClient();
  const { error } = await supabase.from('m2m_wallet_config').upsert({
    id: config.id,
    wallet_address: config.walletAddress,
    enabled: config.enabled,
    selected_delegate_id: config.selectedDelegateId,
    payment_token: config.paymentToken,
    allowed_actions: config.allowedActions,
    max_per_order: config.maxPerOrder,
    max_total: config.maxTotal,
    expiry_days: config.expiryDays,
    counterparty_allowlist: config.counterpartyAllowlist,
    notes: config.notes || '',
    created_at: config.createdAt,
    updated_at: config.updatedAt,
  }, { onConflict: 'wallet_address' });
  if (error) throw new Error('Unable to save M2M wallet configuration');
}

function validateConfig(config: AIM2MWalletConfig, delegates: AIM2MDelegateRecord[]): string | null {
  const requiresFunding = config.allowedActions.includes('buy');

  if (!config.enabled) {
    return null;
  }

  if (!config.allowedActions.length) {
    return 'At least one delegated action must be enabled.';
  }

  if (!config.selectedDelegateId) {
    return 'Select a verified delegate before enabling the delegated AI wallet.';
  }

  const selectedDelegate = delegates.find((delegate) => delegate.id === config.selectedDelegateId);
  if (!selectedDelegate || selectedDelegate.status !== 'verified') {
    return 'The selected delegate is not available.';
  }

  if (normalizeWalletAddress(selectedDelegate.delegateAddress) === normalizeWalletAddress(config.walletAddress)) {
    return 'Delegate wallet must be different from the root wallet.';
  }

  if (config.allowedActions.includes('buy') && !isValidWalletAddress(config.paymentToken || '')) {
    return 'A valid payment token address is required for delegated buy sessions.';
  }

  if (requiresFunding) {
    if (!isValidAmountString(config.maxPerOrder) || !isValidAmountString(config.maxTotal)) {
      return 'Max per order and max total must be numeric strings for delegated buy sessions.';
    }

    const maxPerOrder = decimalToScaledInteger(config.maxPerOrder);
    const maxTotal = decimalToScaledInteger(config.maxTotal);
    if (maxPerOrder <= 0n || maxTotal <= 0n) {
      return 'Budget caps must be greater than zero for delegated buy sessions.';
    }

    if (maxTotal < maxPerOrder) {
      return 'Max total must be greater than or equal to max per order.';
    }
  }

  if (!Number.isInteger(config.expiryDays) || config.expiryDays < 0 || config.expiryDays > 30) {
    return 'Expiry days must be 0 for no expiry or an integer between 1 and 30.';
  }

  for (const entry of config.counterpartyAllowlist) {
    if (!isValidWalletAddress(entry)) {
      return 'Counterparty allowlist contains an invalid wallet address.';
    }
  }

  return null;
}

function buildGeneratedDelegateLabel(index: number): string {
  return `Generated Delegate ${index}`;
}

function generateManagedDelegateAccount(): { privateKey: `0x${string}`; address: string } {
  for (let attempt = 0; attempt < 16; attempt += 1) {
    try {
      const privateKey = `0x${randomHex(32)}` as `0x${string}`;
      const account = privateKeyToAccount(privateKey);
      return {
        privateKey,
        address: normalizeWalletAddress(account.address),
      };
    } catch {
      // retry with fresh randomness
    }
  }

  throw new Error('Unable to generate a valid delegate account');
}

aiM2MWallet.get('/config/:walletAddress', async (c) => {
  try {
    const auth = await requireAuthenticatedWallet(c);
    if (!auth.ok) return auth.response;
    const rate = await checkRateLimit('ai_m2m_read', auth.identity.walletAddress);
    if (!rate.allowed) return rateLimitExceededResponse(c, rate);

    const walletAddress = c.req.param('walletAddress');
    const walletMismatch = assertAuthenticatedWalletMatch(c, auth.identity, walletAddress, 'walletAddress');
    if (walletMismatch) return walletMismatch;
    const resolvedWalletAddress = auth.identity.walletAddress;
    const delegates = await getDelegates(resolvedWalletAddress);
    const pendingInvites = await getPendingInvites(resolvedWalletAddress);
    const config = materializeConfigWithDelegates(
      await loadConfig(resolvedWalletAddress),
      delegates,
    );

    return c.json({
      success: true,
      config,
      overview: buildOverview(config),
      delegates,
      pendingInvites,
    });
  } catch (error) {
    console.error('Get AI M2M wallet config error:', error);
    return c.json({ error: 'Error retrieving AI M2M wallet config' }, 500);
  }
});

aiM2MWallet.post('/config', async (c) => {
  try {
    const auth = await requireAuthenticatedWallet(c);
    if (!auth.ok) return auth.response;

    const body = await c.req.json();
    const walletAddress = String(body.walletAddress || '');
    const walletMismatch = assertAuthenticatedWalletMatch(c, auth.identity, walletAddress, 'walletAddress');
    if (walletMismatch) return walletMismatch;
    const rate = await checkRateLimit('ai_m2m_config_write', auth.identity.walletAddress);
    if (!rate.allowed) return rateLimitExceededResponse(c, rate);
    if (
      typeof body.notes === 'string' && body.notes.length > 2_000
      || typeof body.selectedDelegateId === 'string' && body.selectedDelegateId.length > 200
      || String(body.maxPerOrder ?? '').length > 50
      || String(body.maxTotal ?? '').length > 50
      || Array.isArray(body.counterpartyAllowlist) && body.counterpartyAllowlist.length > 100
    ) {
      return c.json({ error: 'AI M2M configuration exceeds the allowed size' }, 413);
    }

    const resolvedWalletAddress = auth.identity.walletAddress;
    const delegates = await getDelegates(resolvedWalletAddress);
    const existing = await loadConfig(resolvedWalletAddress);

    const candidateConfig: AIM2MWalletConfig = {
      ...existing,
      enabled: body.enabled === true,
      selectedDelegateId: typeof body.selectedDelegateId === 'string' && body.selectedDelegateId.trim()
        ? body.selectedDelegateId.trim()
        : null,
      delegateAddress: '',
      paymentToken: typeof body.paymentToken === 'string' && body.paymentToken
        ? normalizeWalletAddress(body.paymentToken)
        : null,
      allowedActions: normalizeActions(body.allowedActions).length
        ? normalizeActions(body.allowedActions)
        : body.enabled === true
          ? []
          : existing.allowedActions,
      maxPerOrder: normalizeAmount(body.maxPerOrder),
      maxTotal: normalizeAmount(body.maxTotal),
      expiryDays: Number.isFinite(Number(body.expiryDays)) ? Math.trunc(Number(body.expiryDays)) : existing.expiryDays,
      counterpartyAllowlist: normalizeStringArray(body.counterpartyAllowlist).map(normalizeWalletAddress),
      notes: typeof body.notes === 'string' ? body.notes.trim().slice(0, 2_000) : '',
      updatedAt: new Date().toISOString(),
    };

    const config = materializeConfigWithDelegates(candidateConfig, delegates);
    const validationError = validateConfig(config, delegates);
    if (validationError) {
      return c.json({ error: validationError }, 400);
    }

    await saveConfig(config);

    return c.json({
      success: true,
      config,
      overview: buildOverview(config),
      delegates,
      pendingInvites: await getPendingInvites(resolvedWalletAddress),
    });
  } catch (error) {
    console.error('Save AI M2M wallet config error:', error);
    return c.json({ error: 'Error saving AI M2M wallet config' }, 500);
  }
});

aiM2MWallet.post('/delegates/generate', async (c) => {
  try {
    const auth = await requireAuthenticatedWallet(c);
    if (!auth.ok) return auth.response;

    const body = await c.req.json();
    const walletAddress = String(body.walletAddress || '');
    const walletMismatch = assertAuthenticatedWalletMatch(c, auth.identity, walletAddress, 'walletAddress');
    if (walletMismatch) return walletMismatch;

    const resolvedWalletAddress = auth.identity.walletAddress;
    const rate = await checkRateLimit('ai_m2m_delegate_generate', resolvedWalletAddress);
    if (!rate.allowed) return rateLimitExceededResponse(c, rate);
    const existingDelegates = await getDelegates(resolvedWalletAddress);
    if (existingDelegates.length >= MAX_DELEGATES_PER_ROOT) {
      return c.json({ error: 'Delegate limit reached for this root wallet' }, 409);
    }
    const { privateKey, address } = generateManagedDelegateAccount();
    const now = new Date().toISOString();
    const delegateRecord: AIM2MDelegateRecord = {
      id: `delegate_${crypto.randomUUID()}`,
      rootWalletAddress: resolvedWalletAddress,
      delegateAddress: address,
      mode: 'generated',
      status: 'verified',
      label: buildGeneratedDelegateLabel(existingDelegates.length + 1),
      managedByServer: true,
      createdAt: now,
      verifiedAt: now,
    };

    const encryptedSecret = await encryptManagedDelegateSecret(privateKey);
    const storedDelegate = await registerManagedDelegate(delegateRecord, encryptedSecret);
    const delegates = await getDelegates(resolvedWalletAddress);

    return c.json({
      success: true,
      delegate: storedDelegate,
      delegates,
      pendingInvites: await getPendingInvites(resolvedWalletAddress),
    });
  } catch (error) {
    if (error instanceof M2MStateError && (error.code === 'delegate_limit' || error.code === 'delegate_exists')) {
      return c.json({ error: 'Delegate limit or duplicate constraint reached for this root wallet' }, 409);
    }
    console.error('Generate AI M2M delegate error:', error);
    return c.json({ error: 'Error generating delegate' }, 500);
  }
});

aiM2MWallet.post('/delegates/invite', async (c) => {
  try {
    const auth = await requireAuthenticatedWallet(c);
    if (!auth.ok) return auth.response;

    const body = await c.req.json();
    const walletAddress = String(body.walletAddress || '');
    const walletMismatch = assertAuthenticatedWalletMatch(c, auth.identity, walletAddress, 'walletAddress');
    if (walletMismatch) return walletMismatch;

    const resolvedWalletAddress = auth.identity.walletAddress;
    const rate = await checkRateLimit('ai_m2m_delegate_invite', resolvedWalletAddress);
    if (!rate.allowed) {
      return rateLimitExceededResponse(c, rate);
    }
    const pendingInvites = await getPendingInvites(resolvedWalletAddress);
    if (pendingInvites.length >= MAX_PENDING_INVITES_PER_ROOT) {
      return c.json({ error: 'Pending delegate invite limit reached' }, 409);
    }

    const invite = await createDelegateInvite(resolvedWalletAddress);

    return c.json({
      success: true,
      invite,
      pendingInvites: [invite, ...pendingInvites],
    });
  } catch (error) {
    if (error instanceof M2MStateError && error.code === 'invite_limit') {
      return c.json({ error: 'Pending delegate invite limit reached' }, 409);
    }
    console.error('Create AI M2M delegate invite error:', error);
    return c.json({ error: 'Error creating delegate invite' }, 500);
  }
});

aiM2MWallet.post('/delegates/accept-invite', async (c) => {
  try {
    const auth = await requireAuthenticatedWallet(c);
    if (!auth.ok) return auth.response;

    const body = await c.req.json();
    const inviteId = String(body.inviteId || '').trim();
    if (!/^m2m_[a-f0-9]{64}$/.test(inviteId)) {
      return c.json({ error: 'Invalid inviteId' }, 400);
    }

    const rate = await checkRateLimit('ai_m2m_delegate_accept', auth.identity.walletAddress);
    if (!rate.allowed) {
      return rateLimitExceededResponse(c, rate);
    }

    const delegate = await claimDelegateInvite(inviteId, auth.identity.walletAddress);

    return c.json({
      success: true,
      delegate,
      rootWalletAddress: delegate.rootWalletAddress,
    });
  } catch (error) {
    if (error instanceof M2MStateError) {
      if (error.code === 'delegate_matches_root') {
        return c.json({ error: 'Delegate wallet must be different from the root wallet.' }, 400);
      }
      if (error.code === 'delegate_limit') {
        return c.json({ error: 'Delegate limit reached for this root wallet' }, 409);
      }
      if (error.code === 'invite_unavailable') {
        return c.json({ error: 'Invite is no longer available' }, 409);
      }
    }
    console.error('Accept AI M2M delegate invite error:', error);
    return c.json({ error: 'Error accepting delegate invite' }, 500);
  }
});

aiM2MWallet.post('/seller-confirm/run', async (c) => {
  try {
    if (!isKeeperAuthorized(c)) {
      return c.json({ error: 'Unauthorized seller-confirm executor request' }, 401);
    }

    const body = await c.req.json().catch(() => ({}));
    const limit = Math.min(
      DEFAULT_MAX_SELLER_CONFIRM_BATCH,
      Math.max(1, Math.trunc(Number(body.limit || DEFAULT_MAX_SELLER_CONFIRM_BATCH)) || DEFAULT_MAX_SELLER_CONFIRM_BATCH),
    );
    const dryRun = body.dryRun === true;
    const confirmations = Math.max(0, Math.min(3, Math.trunc(Number(body.confirmations ?? 1)) || 0));
    const requestedChainId = Math.trunc(Number(body.chainId || DEFAULT_CHAIN_ID));
    const network = SELLER_CONFIRM_NETWORKS[requestedChainId];
    if (!network) {
      return c.json({
        error: 'Unsupported seller-confirm executor chain',
        chainId: requestedChainId,
        supportedChainIds: Object.keys(SELLER_CONFIRM_NETWORKS).map(Number),
      }, 400);
    }
    let orderIds = parseOrderIds(body.orderIds, limit);
    if (orderIds.length === 0) {
      orderIds = await candidateSellerConfirmOrderIds(limit, network);
    }

    const publicClient = createPublicClient({
      chain: network.chain,
      transport: http(network.rpcUrl),
    });
    const nowSeconds = BigInt(Math.floor(Date.now() / 1000));
    const results: Array<Record<string, unknown>> = [];

    for (const orderId of orderIds) {
      try {
        const order = await publicClient.readContract({
          address: network.marketplace as `0x${string}`,
          abi: MARKETPLACE_SELLER_CONFIRM_ABI,
          functionName: 'orders',
          args: [orderId],
        }) as unknown as any[];

        const buyer = normalizeWalletAddress(order[0]);
        const seller = normalizeWalletAddress(order[1]);
        const assetId = BigInt(order[5] || 0n);
        const paymentToken = normalizeWalletAddress(order[4]);
        const grossPrice = BigInt(order[7] || 0n);
        const proposedDeliverySeconds = BigInt(order[11] || 0n);
        const state = Number(order[13]);
        const finalized = Boolean(order[19]);
        const sellerConfirmed = Boolean(order[20]);

        if (!isValidWalletAddress(buyer) || !isValidWalletAddress(seller) || buyer === normalizeWalletAddress(zeroAddress) || seller === normalizeWalletAddress(zeroAddress)) {
          results.push({ orderId: orderId.toString(), status: 'skipped', reason: 'empty_order' });
          continue;
        }
        const sellerAddress = seller as `0x${string}`;
        if (finalized || sellerConfirmed || state !== 0) {
          results.push({ orderId: orderId.toString(), status: 'skipped', reason: 'not_pending_seller_confirm', state, finalized, sellerConfirmed });
          continue;
        }

        const delegates = await getDelegates(seller);
        const config = materializeConfigWithDelegates(
          await loadConfig(seller),
          delegates,
        );
        if (!config.enabled || !config.allowedActions.includes('sign_order') || !config.selectedDelegateId) {
          results.push({ orderId: orderId.toString(), status: 'skipped', reason: 'seller_m2m_sign_order_disabled', seller });
          continue;
        }

        const delegate = delegates.find((entry) => entry.id === config.selectedDelegateId && entry.status === 'verified');
        if (!delegate || !delegate.managedByServer) {
          results.push({ orderId: orderId.toString(), status: 'skipped', reason: 'managed_delegate_not_available', seller });
          continue;
        }

        const hasActive = await publicClient.readContract({
          address: network.delegationManager as `0x${string}`,
          abi: MANAGER_READ_ABI,
          functionName: 'hasActiveCycle',
          args: [sellerAddress],
        });
        if (!hasActive) {
          results.push({ orderId: orderId.toString(), status: 'skipped', reason: 'seller_has_no_active_m2m_cycle', seller });
          continue;
        }

        const sessionNonce = await publicClient.readContract({
          address: network.delegationManager as `0x${string}`,
          abi: MANAGER_READ_ABI,
          functionName: 'activeSessionNonce',
          args: [sellerAddress],
        }) as bigint;
        const session = await publicClient.readContract({
          address: network.delegationManager as `0x${string}`,
          abi: MANAGER_READ_ABI,
          functionName: 'getSession',
          args: [sellerAddress, sessionNonce],
        }) as Record<string, unknown>;

        const actionMask = BigInt(session.actionMask as bigint | string | number || 0n);
        const validUntil = BigInt(session.validUntil as bigint | string | number || 0n);
        const maxDeliverySeconds = BigInt(session.maxDeliverySeconds as bigint | string | number || 0n);
        const minGrossPrice = BigInt(session.minGrossPrice as bigint | string | number || 0n);
        const allowedToken = normalizeWalletAddress(String(session.paymentToken || ''));
        const counterpartyAllowlistHash = String(session.counterpartyAllowlistHash || '').toLowerCase();
        const deliverySeconds = BigInt(body.estDeliverySeconds || proposedDeliverySeconds || 86_400);

        if (
          session.exists !== true
          || Number(session.status) !== 1
          || normalizeWalletAddress(String(session.delegate || '')) !== normalizeWalletAddress(delegate.delegateAddress)
          || allowedToken !== paymentToken
          || (actionMask & SELLER_CONFIRM_ACTION_BIT) !== SELLER_CONFIRM_ACTION_BIT
          || validUntil <= nowSeconds
          || counterpartyAllowlistHash !== '0x0000000000000000000000000000000000000000000000000000000000000000'
          || minGrossPrice > grossPrice
          || (maxDeliverySeconds > 0n && deliverySeconds > maxDeliverySeconds)
        ) {
          results.push({
            orderId: orderId.toString(),
            status: 'skipped',
            reason: 'active_m2m_session_policy_mismatch',
            seller,
            sessionNonce: sessionNonce.toString(),
            session: {
              delegate: session.delegate,
              paymentToken: session.paymentToken,
              orderPaymentToken: paymentToken,
              status: session.status,
              actionMask: actionMask.toString(),
              validUntil: validUntil.toString(),
              counterpartyAllowlistHash,
              minGrossPrice: minGrossPrice.toString(),
              maxDeliverySeconds: maxDeliverySeconds.toString(),
            },
          });
          continue;
        }

        if (dryRun) {
          results.push({
            orderId: orderId.toString(),
            status: 'eligible',
            seller,
            buyer,
            assetId: assetId.toString(),
            chainId: network.chainId,
            grossPrice: grossPrice.toString(),
            sessionNonce: sessionNonce.toString(),
            delegateAddress: delegate.delegateAddress,
          });
          continue;
        }

        const secret = await getManagedDelegateSecret(delegate.id);
        if (!secret) {
          results.push({ orderId: orderId.toString(), status: 'skipped', reason: 'managed_delegate_secret_missing', seller, delegateId: delegate.id });
          continue;
        }
        const account = privateKeyToAccount(await openManagedDelegateBackup(secret));
        if (normalizeWalletAddress(account.address) !== normalizeWalletAddress(delegate.delegateAddress)) {
          results.push({ orderId: orderId.toString(), status: 'skipped', reason: 'managed_delegate_secret_address_mismatch', seller, delegateId: delegate.id });
          continue;
        }

        const walletClient = createWalletClient({
          account,
          chain: network.chain,
          transport: http(network.rpcUrl),
        });
        await publicClient.simulateContract({
          account,
          address: network.marketplace as `0x${string}`,
          abi: MARKETPLACE_SELLER_CONFIRM_ABI,
          functionName: 'sellerConfirmFor',
          args: [orderId, sellerAddress, deliverySeconds, sessionNonce],
        });
        const txHash = await walletClient.writeContract({
          address: network.marketplace as `0x${string}`,
          abi: MARKETPLACE_SELLER_CONFIRM_ABI,
          functionName: 'sellerConfirmFor',
          gas: 350000n,
          args: [orderId, sellerAddress, deliverySeconds, sessionNonce],
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, confirmations });

        results.push({
          orderId: orderId.toString(),
          status: 'confirmed',
          seller,
          buyer,
          chainId: network.chainId,
          txHash,
          blockNumber: receipt.blockNumber.toString(),
          gasUsed: receipt.gasUsed.toString(),
          sessionNonce: sessionNonce.toString(),
          delegateAddress: delegate.delegateAddress,
        });
      } catch (error) {
        results.push({
          orderId: orderId.toString(),
          status: 'failed',
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return c.json(stringifyBigInt({
      success: true,
      dryRun,
      requested: orderIds.length,
      confirmed: results.filter((entry) => entry.status === 'confirmed').length,
      eligible: results.filter((entry) => entry.status === 'eligible').length,
      skipped: results.filter((entry) => entry.status === 'skipped').length,
      failed: results.filter((entry) => entry.status === 'failed').length,
      results,
    }));
  } catch (error) {
    console.error('AI M2M seller-confirm executor error:', error);
    return c.json({ error: error instanceof Error ? error.message : 'Error running seller-confirm executor' }, 500);
  }
});

export default aiM2MWallet;
