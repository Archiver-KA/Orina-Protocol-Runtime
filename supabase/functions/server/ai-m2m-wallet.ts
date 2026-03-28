import { Hono } from 'npm:hono';
import { privateKeyToAccount } from 'npm:viem/accounts';
import * as kv from './kv_store.tsx';
import {
  assertAuthenticatedWalletMatch,
  isValidWalletAddress,
  normalizeWalletAddress,
  requireAuthenticatedWallet,
} from './request-auth.ts';
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
const DELEGATE_ENCRYPTION_SECRET_ENV = 'ATP2_M2M_DELEGATE_ENCRYPTION_KEY';

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

async function getDelegateEncryptionKey(): Promise<CryptoKey> {
  const secret = String(Deno.env.get(DELEGATE_ENCRYPTION_SECRET_ENV) || '').trim();
  if (!secret) {
    throw new Error(`${DELEGATE_ENCRYPTION_SECRET_ENV} is not configured`);
  }

  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt']);
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

  if (!Number.isInteger(config.expiryDays) || config.expiryDays < 1 || config.expiryDays > 30) {
    return 'Expiry days must be an integer between 1 and 30.';
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
    const nowMs = Date.now();
    const invite: AIM2MDelegateInvite = {
      id: `m2m_${randomHex(8)}`,
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

export default aiM2MWallet;
