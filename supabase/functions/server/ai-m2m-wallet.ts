import { Hono } from 'npm:hono';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { createPublicClient, createWalletClient, http, zeroAddress } from 'npm:viem';
import { privateKeyToAccount } from 'npm:viem/accounts';
import { bscTestnet } from 'npm:viem/chains';
import * as kv from './kv_store.tsx';
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
const SELLER_CONFIRM_ACTION_BIT = 1n << 3n;
const DEFAULT_CHAIN_ID = 97;
const DEFAULT_RPC_URL =
  Deno.env.get('BSC_TESTNET_RPC')
  || Deno.env.get('BSC_TESTNET_RPC_URL')
  || Deno.env.get('RPC_URL')
  || 'https://data-seed-prebsc-1-s1.bnbchain.org:8545/';
const DEFAULT_MARKETPLACE =
  Deno.env.get('MARKETPLACE_ATP_ADDRESS')
  || Deno.env.get('MARKETPLACE_ATP')
  || Deno.env.get('VITE_MARKETPLACE_ATP')
  || '0x18E1C8ab257FAf16Ec8257A9715d07661194150B';
const DEFAULT_DELEGATION_MANAGER =
  Deno.env.get('M2M_DELEGATION_MANAGER')
  || Deno.env.get('VITE_M2M_DELEGATION_MANAGER')
  || '0xb27C8eCc266423dDA3323983Ae3a2eF691ed8a13';
const DEFAULT_MAX_SELLER_CONFIRM_BATCH = 20;

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

const configKey = (walletAddress: string) => `ai_m2m_wallet_config:${walletAddress}`;
const delegateListKey = (walletAddress: string) => `ai_m2m_wallet_delegates:${walletAddress}`;
const delegateInviteIdsKey = (walletAddress: string) => `ai_m2m_wallet_delegate_invites:${walletAddress}`;
const delegateInviteKey = (inviteId: string) => `ai_m2m_wallet_delegate_invite:${inviteId}`;
const managedDelegateSecretKey = (delegateId: string) => `ai_m2m_wallet_delegate_secret:${delegateId}`;

function defaultConfig(walletAddress: string): AIM2MWalletConfig {
  const now = new Date().toISOString();
  return {
    id: `ai_m2m_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
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
    .map((item) => String(item || '').trim())
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
  return /^\d+(\.\d+)?$/.test(value);
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

async function createUniqueDelegateInviteId(): Promise<string> {
  for (let attempt = 0; attempt < DELEGATE_INVITE_ID_MAX_ATTEMPTS; attempt += 1) {
    const inviteId = generateDelegateInviteId();
    if (!await kv.get(delegateInviteKey(inviteId))) {
      return inviteId;
    }
  }

  throw new Error('Unable to allocate a unique delegate invite id');
}

async function getDelegateEncryptionKey(): Promise<CryptoKey> {
  const secret = String(Deno.env.get(DELEGATE_ENCRYPTION_SECRET_ENV) || '').trim();
  if (!secret) {
    throw new Error(`${DELEGATE_ENCRYPTION_SECRET_ENV} is not configured`);
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

async function openManagedDelegateBackup(record: ManagedDelegateSecretRecord): Promise<`0x${string}`> {
  if (!record || record.version !== 1) {
    throw new Error('Unsupported managed delegate secret version');
  }
  const key = await getDelegateEncryptionKey();
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: hexToBytes(record.ivHex) },
    key,
    hexToBytes(record.ciphertextHex),
  );
  const privateKey = new TextDecoder().decode(plaintext).trim();
  if (!/^0x[a-f0-9]{64}$/i.test(privateKey)) {
    throw new Error('Managed delegate secret is invalid');
  }
  return privateKey as `0x${string}`;
}

function getSupabaseServiceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') || '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
  );
}

function isKeeperAuthorized(c: any): boolean {
  const expectedSecret = String(Deno.env.get('ATP2_M2M_AUTOCONFIRM_SECRET') || '').trim();
  const providedSecret = String(c.req.header('x-ai-m2m-autoconfirm-secret') || '').trim();
  if (expectedSecret && providedSecret && expectedSecret === providedSecret) return true;

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

async function candidateSellerConfirmOrderIds(limit: number): Promise<bigint[]> {
  const supabaseUrl = String(Deno.env.get('SUPABASE_URL') || '').trim();
  const serviceRoleKey = String(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '').trim();
  if (!supabaseUrl || !serviceRoleKey) return [];

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from('protocol_orders')
    .select('order_uid')
    .eq('chain_id', DEFAULT_CHAIN_ID)
    .eq('marketplace_contract', normalizeWalletAddress(DEFAULT_MARKETPLACE))
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

function sanitizeStoredDelegateRecord(candidate: unknown, rootWalletAddress: string): AIM2MDelegateRecord | null {
  if (!candidate || typeof candidate !== 'object') return null;
  const source = candidate as Record<string, unknown>;
  const delegateAddress = typeof source.delegateAddress === 'string'
    ? normalizeWalletAddress(source.delegateAddress)
    : '';
  if (!isValidWalletAddress(delegateAddress)) return null;

  const status = source.status === 'revoked' ? 'revoked' : 'verified';
  const mode = source.mode === 'enrolled' ? 'enrolled' : 'generated';
  const createdAt = typeof source.createdAt === 'string' && source.createdAt
    ? source.createdAt
    : new Date().toISOString();
  const verifiedAt = typeof source.verifiedAt === 'string' && source.verifiedAt
    ? source.verifiedAt
    : createdAt;

  return {
    id: typeof source.id === 'string' && source.id ? source.id : `delegate_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    rootWalletAddress,
    delegateAddress,
    mode,
    status,
    label: typeof source.label === 'string' && source.label.trim() ? source.label.trim() : null,
    managedByServer: source.managedByServer === true,
    createdAt,
    verifiedAt,
  };
}

function sanitizeStoredInvite(candidate: unknown): AIM2MDelegateInvite | null {
  if (!candidate || typeof candidate !== 'object') return null;
  const source = candidate as Record<string, unknown>;
  const rootWalletAddress = typeof source.rootWalletAddress === 'string'
    ? normalizeWalletAddress(source.rootWalletAddress)
    : '';
  if (!isValidWalletAddress(rootWalletAddress)) return null;

  const claimedByWalletAddress = typeof source.claimedByWalletAddress === 'string' && source.claimedByWalletAddress
    ? normalizeWalletAddress(source.claimedByWalletAddress)
    : null;

  return {
    id: typeof source.id === 'string' && source.id ? source.id : '',
    rootWalletAddress,
    status: source.status === 'claimed' ? 'claimed' : source.status === 'expired' ? 'expired' : 'pending',
    createdAt: typeof source.createdAt === 'string' && source.createdAt ? source.createdAt : new Date().toISOString(),
    expiresAt: typeof source.expiresAt === 'string' && source.expiresAt ? source.expiresAt : new Date().toISOString(),
    claimedAt: typeof source.claimedAt === 'string' && source.claimedAt ? source.claimedAt : null,
    claimedByWalletAddress: claimedByWalletAddress && isValidWalletAddress(claimedByWalletAddress) ? claimedByWalletAddress : null,
  };
}

function expireInviteIfNeeded(invite: AIM2MDelegateInvite): AIM2MDelegateInvite {
  if (invite.status !== 'pending') return invite;
  if (Date.parse(invite.expiresAt) > Date.now()) return invite;
  return { ...invite, status: 'expired' };
}

async function getDelegates(rootWalletAddress: string): Promise<AIM2MDelegateRecord[]> {
  const stored = await kv.get<unknown[]>(delegateListKey(rootWalletAddress));
  if (!Array.isArray(stored)) return [];

  return stored
    .map((entry) => sanitizeStoredDelegateRecord(entry, rootWalletAddress))
    .filter((entry): entry is AIM2MDelegateRecord => !!entry)
    .sort((left, right) => Date.parse(right.verifiedAt) - Date.parse(left.verifiedAt));
}

async function saveDelegates(rootWalletAddress: string, delegates: AIM2MDelegateRecord[]): Promise<void> {
  await kv.set(delegateListKey(rootWalletAddress), delegates);
}

async function appendDelegate(rootWalletAddress: string, delegate: AIM2MDelegateRecord): Promise<AIM2MDelegateRecord[]> {
  const delegates = await getDelegates(rootWalletAddress);
  const withoutSameId = delegates.filter((entry) => entry.id !== delegate.id);
  withoutSameId.unshift(delegate);
  await saveDelegates(rootWalletAddress, withoutSameId);
  return withoutSameId;
}

async function getInviteIds(rootWalletAddress: string): Promise<string[]> {
  const stored = await kv.get<string[]>(delegateInviteIdsKey(rootWalletAddress));
  return Array.isArray(stored) ? stored.map((entry) => String(entry || '').trim()).filter(Boolean) : [];
}

async function pushInviteId(rootWalletAddress: string, inviteId: string): Promise<void> {
  const existing = await getInviteIds(rootWalletAddress);
  if (!existing.includes(inviteId)) {
    await kv.set(delegateInviteIdsKey(rootWalletAddress), [inviteId, ...existing]);
  }
}

async function getPendingInvites(rootWalletAddress: string): Promise<AIM2MDelegateInvite[]> {
  const inviteIds = await getInviteIds(rootWalletAddress);
  const invites: AIM2MDelegateInvite[] = [];

  for (const inviteId of inviteIds) {
    const invite = sanitizeStoredInvite(await kv.get(delegateInviteKey(inviteId)));
    if (!invite || invite.rootWalletAddress !== rootWalletAddress) continue;

    const hydrated = expireInviteIfNeeded(invite);
    if (hydrated.status !== invite.status) {
      await kv.set(delegateInviteKey(inviteId), hydrated);
    }
    if (hydrated.status === 'pending') {
      invites.push(hydrated);
    }
  }

  return invites.sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
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
  return {
    id: typeof source.id === 'string' && source.id ? source.id : fallback.id,
    walletAddress,
    enabled: source.enabled === true,
    selectedDelegateId: typeof source.selectedDelegateId === 'string' && source.selectedDelegateId.trim()
      ? source.selectedDelegateId.trim()
      : null,
    delegateAddress: '',
    paymentToken: typeof source.paymentToken === 'string' && source.paymentToken
      ? normalizeWalletAddress(source.paymentToken)
      : null,
    allowedActions: normalizeActions(source.allowedActions).length
      ? normalizeActions(source.allowedActions)
      : [...fallback.allowedActions],
    maxPerOrder: normalizeAmount(source.maxPerOrder),
    maxTotal: normalizeAmount(source.maxTotal),
    expiryDays: Number.isFinite(Number(source.expiryDays)) ? Math.trunc(Number(source.expiryDays)) : fallback.expiryDays,
    counterpartyAllowlist: normalizeStringArray(source.counterpartyAllowlist).map(normalizeWalletAddress),
    notes: typeof source.notes === 'string' ? source.notes : '',
    createdAt: typeof source.createdAt === 'string' && source.createdAt ? source.createdAt : fallback.createdAt,
    updatedAt: typeof source.updatedAt === 'string' && source.updatedAt ? source.updatedAt : fallback.updatedAt,
  };
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

    if (Number(config.maxPerOrder) <= 0 || Number(config.maxTotal) <= 0) {
      return 'Budget caps must be greater than zero for delegated buy sessions.';
    }

    if (Number(config.maxTotal) < Number(config.maxPerOrder)) {
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

    const walletAddress = c.req.param('walletAddress');
    const walletMismatch = assertAuthenticatedWalletMatch(c, auth.identity, walletAddress, 'walletAddress');
    if (walletMismatch) return walletMismatch;

    const resolvedWalletAddress = auth.identity.walletAddress;
    const delegates = await getDelegates(resolvedWalletAddress);
    const pendingInvites = await getPendingInvites(resolvedWalletAddress);
    const stored = await kv.get(configKey(resolvedWalletAddress));
    const config = materializeConfigWithDelegates(
      sanitizeStoredConfig(stored, resolvedWalletAddress),
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

    const resolvedWalletAddress = auth.identity.walletAddress;
    const delegates = await getDelegates(resolvedWalletAddress);
    const existing = sanitizeStoredConfig(await kv.get(configKey(resolvedWalletAddress)), resolvedWalletAddress);

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
      notes: typeof body.notes === 'string' ? body.notes.trim() : '',
      updatedAt: new Date().toISOString(),
    };

    const config = materializeConfigWithDelegates(candidateConfig, delegates);
    const validationError = validateConfig(config, delegates);
    if (validationError) {
      return c.json({ error: validationError }, 400);
    }

    await kv.set(configKey(resolvedWalletAddress), config);

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
    const existingDelegates = await getDelegates(resolvedWalletAddress);
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
    await kv.set(managedDelegateSecretKey(delegateRecord.id), encryptedSecret);
    const delegates = await appendDelegate(resolvedWalletAddress, delegateRecord);

    return c.json({
      success: true,
      delegate: delegateRecord,
      delegates,
      pendingInvites: await getPendingInvites(resolvedWalletAddress),
    });
  } catch (error) {
    console.error('Generate AI M2M delegate error:', error);
    const message = error instanceof Error ? error.message : 'Error generating delegate';
    return c.json({ error: message }, 500);
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

    const nowMs = Date.now();
    const invite: AIM2MDelegateInvite = {
      id: await createUniqueDelegateInviteId(),
      rootWalletAddress: resolvedWalletAddress,
      status: 'pending',
      createdAt: new Date(nowMs).toISOString(),
      expiresAt: new Date(nowMs + DELEGATE_INVITE_TTL_MS).toISOString(),
      claimedAt: null,
      claimedByWalletAddress: null,
    };

    await kv.set(delegateInviteKey(invite.id), invite);
    await pushInviteId(resolvedWalletAddress, invite.id);

    return c.json({
      success: true,
      invite,
      pendingInvites: await getPendingInvites(resolvedWalletAddress),
    });
  } catch (error) {
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
    if (!inviteId) {
      return c.json({ error: 'Missing inviteId' }, 400);
    }

    const rate = await checkRateLimit('ai_m2m_delegate_accept', auth.identity.walletAddress);
    if (!rate.allowed) {
      return rateLimitExceededResponse(c, rate);
    }

    const storedInvite = sanitizeStoredInvite(await kv.get(delegateInviteKey(inviteId)));
    if (!storedInvite) {
      return c.json({ error: 'Invite not found' }, 404);
    }

    const invite = expireInviteIfNeeded(storedInvite);
    if (invite.status === 'expired') {
      await kv.set(delegateInviteKey(invite.id), invite);
      return c.json({ error: 'Invite has expired' }, 400);
    }
    if (invite.status !== 'pending') {
      return c.json({ error: 'Invite is no longer available' }, 400);
    }

    const delegateWalletAddress = auth.identity.walletAddress;
    if (delegateWalletAddress === invite.rootWalletAddress) {
      return c.json({ error: 'Delegate wallet must be different from the root wallet.' }, 400);
    }

    const delegates = await getDelegates(invite.rootWalletAddress);
    const existingByAddress = delegates.find(
      (entry) => entry.delegateAddress === delegateWalletAddress && entry.status === 'verified',
    );
    if (existingByAddress) {
      const claimedInvite: AIM2MDelegateInvite = {
        ...invite,
        status: 'claimed',
        claimedAt: new Date().toISOString(),
        claimedByWalletAddress: delegateWalletAddress,
      };
      await kv.set(delegateInviteKey(invite.id), claimedInvite);
      return c.json({
        success: true,
        delegate: existingByAddress,
        rootWalletAddress: invite.rootWalletAddress,
      });
    }

    const now = new Date().toISOString();
    const delegateRecord: AIM2MDelegateRecord = {
      id: `delegate_${crypto.randomUUID()}`,
      rootWalletAddress: invite.rootWalletAddress,
      delegateAddress: delegateWalletAddress,
      mode: 'enrolled',
      status: 'verified',
      label: null,
      managedByServer: false,
      createdAt: now,
      verifiedAt: now,
    };

    await appendDelegate(invite.rootWalletAddress, delegateRecord);

    const claimedInvite: AIM2MDelegateInvite = {
      ...invite,
      status: 'claimed',
      claimedAt: now,
      claimedByWalletAddress: delegateWalletAddress,
    };
    await kv.set(delegateInviteKey(invite.id), claimedInvite);

    return c.json({
      success: true,
      delegate: delegateRecord,
      rootWalletAddress: invite.rootWalletAddress,
    });
  } catch (error) {
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
    let orderIds = parseOrderIds(body.orderIds, limit);
    if (orderIds.length === 0) {
      orderIds = await candidateSellerConfirmOrderIds(limit);
    }

    const publicClient = createPublicClient({
      chain: bscTestnet,
      transport: http(DEFAULT_RPC_URL),
    });
    const nowSeconds = BigInt(Math.floor(Date.now() / 1000));
    const results: Array<Record<string, unknown>> = [];

    for (const orderId of orderIds) {
      try {
        const order = await publicClient.readContract({
          address: DEFAULT_MARKETPLACE as `0x${string}`,
          abi: MARKETPLACE_SELLER_CONFIRM_ABI,
          functionName: 'orders',
          args: [orderId],
        }) as unknown as any[];

        const buyer = normalizeWalletAddress(order[0]);
        const seller = normalizeWalletAddress(order[1]);
        const assetId = BigInt(order[5] || 0n);
        const grossPrice = BigInt(order[7] || 0n);
        const proposedDeliverySeconds = BigInt(order[11] || 0n);
        const state = Number(order[13]);
        const finalized = Boolean(order[19]);
        const sellerConfirmed = Boolean(order[20]);

        if (!isValidWalletAddress(buyer) || !isValidWalletAddress(seller) || buyer === normalizeWalletAddress(zeroAddress) || seller === normalizeWalletAddress(zeroAddress)) {
          results.push({ orderId: orderId.toString(), status: 'skipped', reason: 'empty_order' });
          continue;
        }
        if (finalized || sellerConfirmed || state !== 0) {
          results.push({ orderId: orderId.toString(), status: 'skipped', reason: 'not_pending_seller_confirm', state, finalized, sellerConfirmed });
          continue;
        }

        const delegates = await getDelegates(seller);
        const config = materializeConfigWithDelegates(
          sanitizeStoredConfig(await kv.get(configKey(seller)), seller),
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
          address: DEFAULT_DELEGATION_MANAGER as `0x${string}`,
          abi: MANAGER_READ_ABI,
          functionName: 'hasActiveCycle',
          args: [seller],
        });
        if (!hasActive) {
          results.push({ orderId: orderId.toString(), status: 'skipped', reason: 'seller_has_no_active_m2m_cycle', seller });
          continue;
        }

        const sessionNonce = await publicClient.readContract({
          address: DEFAULT_DELEGATION_MANAGER as `0x${string}`,
          abi: MANAGER_READ_ABI,
          functionName: 'activeSessionNonce',
          args: [seller],
        }) as bigint;
        const session = await publicClient.readContract({
          address: DEFAULT_DELEGATION_MANAGER as `0x${string}`,
          abi: MANAGER_READ_ABI,
          functionName: 'getSession',
          args: [seller, sessionNonce],
        }) as Record<string, unknown>;

        const actionMask = BigInt(session.actionMask as bigint | string | number || 0n);
        const validUntil = BigInt(session.validUntil as bigint | string | number || 0n);
        const maxDeliverySeconds = BigInt(session.maxDeliverySeconds as bigint | string | number || 0n);
        const minGrossPrice = BigInt(session.minGrossPrice as bigint | string | number || 0n);
        const counterpartyAllowlistHash = String(session.counterpartyAllowlistHash || '').toLowerCase();
        const deliverySeconds = BigInt(body.estDeliverySeconds || proposedDeliverySeconds || 86_400);

        if (
          session.exists !== true
          || Number(session.status) !== 1
          || normalizeWalletAddress(String(session.delegate || '')) !== normalizeWalletAddress(delegate.delegateAddress)
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
            grossPrice: grossPrice.toString(),
            sessionNonce: sessionNonce.toString(),
            delegateAddress: delegate.delegateAddress,
          });
          continue;
        }

        const secret = await kv.get<ManagedDelegateSecretRecord>(managedDelegateSecretKey(delegate.id));
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
          chain: bscTestnet,
          transport: http(DEFAULT_RPC_URL),
        });
        await publicClient.simulateContract({
          account,
          address: DEFAULT_MARKETPLACE as `0x${string}`,
          abi: MARKETPLACE_SELLER_CONFIRM_ABI,
          functionName: 'sellerConfirmFor',
          args: [orderId, seller, deliverySeconds, sessionNonce],
        });
        const txHash = await walletClient.writeContract({
          address: DEFAULT_MARKETPLACE as `0x${string}`,
          abi: MARKETPLACE_SELLER_CONFIRM_ABI,
          functionName: 'sellerConfirmFor',
          gas: 350000n,
          args: [orderId, seller, deliverySeconds, sessionNonce],
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, confirmations });

        results.push({
          orderId: orderId.toString(),
          status: 'confirmed',
          seller,
          buyer,
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
