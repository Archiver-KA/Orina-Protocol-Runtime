import { Hono } from 'npm:hono@4.12.29';
import { createClient } from 'npm:@supabase/supabase-js@2.100.1';
import { verifyMessage } from 'npm:viem@2.53.1';
import { assertAuthenticatedWalletMatch, requireAuthenticatedWallet } from './request-auth.ts';
import { normalizeListingTaxonomy } from './taxonomy-normalizer.ts';
import { resolveAllowedCorsOrigin } from './edge-app.ts';
import { checkRateLimit, rateLimitExceededResponse } from './rate-limiter.ts';

const router = new Hono();

type ExchangeRequest = {
  walletAddress?: string;
  walletAuthSession?: {
    address?: string;
    signedAt?: number;
    signature?: string;
    message?: string;
  };
  client?: {
    app?: string;
    phase?: string;
    requestedAt?: string;
  };
};

type ChallengeRequest = {
  walletAddress?: string;
  chainId?: number;
};

type CommunityNotifyRequest = {
  targetWalletAddress?: string;
  title?: string;
  message?: string;
  sourceId?: string | null;
  metadata?: Record<string, unknown>;
  actorWalletAddress?: string | null;
  actorName?: string | null;
};

type AssetMetadataSeedMediaItem = {
  mediaType?: 'image' | 'video' | 'document';
  url?: string;
  sortOrder?: number;
  metadata?: Record<string, unknown>;
};

type AssetMetadataSeedItem = {
  assetUid?: string;
  title?: string;
  slug?: string | null;
  category?: string | null;
  subcategory?: string | null;
  description?: string | null;
  coverImageUrl?: string | null;
  galleryImages?: string[];
  attributes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  contractAddress?: string | null;
  tokenId?: string | null;
  chainId?: number | null;
  isActive?: boolean;
  media?: AssetMetadataSeedMediaItem[];
  tags?: string[];
};

type AssetMetadataSeedRequest = {
  assetItems?: AssetMetadataSeedItem[];
  client?: {
    app?: string;
    phase?: string;
    requestedAt?: string;
  };
};

type ProtocolOrderSeedItem = {
  orderUid?: string;
  chainId?: number | null;
  marketplaceContract?: string | null;
  assetContract?: string | null;
  assetTokenId?: string | null;
  buyerAddress?: string | null;
  sellerAddress?: string | null;
  status?: string | null;
  amount?: string | number | null;
  pricePerUnit?: string | number | null;
  totalValue?: string | number | null;
  currencySymbol?: string | null;
  metadata?: Record<string, unknown> | null;
};

type ProtocolOrderSeedRequest = {
  orderItems?: ProtocolOrderSeedItem[];
  client?: {
    app?: string;
    phase?: string;
    requestedAt?: string;
  };
};

type RuntimeMintedProjectionRepairRequest = {
  dryRun?: boolean;
  limit?: number;
  assetUids?: string[];
  chainId?: number | null;
  contractAddress?: string | null;
  tokenId?: string | null;
};

type DbProfileRow = {
  id: string;
  wallet_address: string;
  status: string | null;
};

type DbWalletSessionRow = {
  id: string;
  wallet_address: string;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
  last_seen_at: string | null;
};

type DbWalletAuthChallengeRow = {
  id: string;
  wallet_address: string;
  nonce: string;
  message: string;
  expires_at: string;
  used_at: string | null;
};

type DbWalletSessionListRow = {
  id: string;
  wallet_address: string;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
  last_seen_at: string | null;
  device_label: string | null;
};

type DbUserAppSettingsSecurityRow = {
  user_id: string;
  security_settings: Record<string, unknown> | null;
};

type DbAssetCatalogRow = {
  id: string;
  asset_uid: string;
};

type DbRuntimeMintedProjectionSeedRow = {
  id: string;
  asset_uid: string;
  title: string | null;
  contract_address: string | null;
  token_id: string | null;
  chain_id: number | null;
  is_active: boolean | null;
  metadata: Record<string, unknown> | null;
};

type DbAssetProtocolLinkProjectionRow = {
  asset_id: string;
  chain_id: number | null;
  contract_address: string | null;
  token_id: string | null;
};

type DbProtocolAssetProjectionRow = {
  chain_id: number | null;
  asset_contract: string | null;
  token_id: string | null;
};

type DbProtocolOrderProjectionAmountRow = {
  chain_id?: number | null;
  asset_contract?: string | null;
  asset_token_id?: string | null;
  status?: string | null;
  amount?: string | number | null;
};

type DbAssetTagRow = {
  id: string;
  tag: string;
};

type VerificationMode = 'wallet_session_row';

type VerificationFailure = {
  ok: false;
  status: 400 | 401;
  error: string;
};

function normalizeAddress(address: string): string {
  return address.toLowerCase();
}

function normalizeAssetUid(value: string): string {
  return String(value || '').trim().toLowerCase();
}

function normalizeTag(value: string): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '')
    .slice(0, 64);
}

function normalizeSlug(value: string): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function isValidWalletAddress(address: string): boolean {
  return /^0x[a-f0-9]{40}$/.test(address);
}

function isEnabled(name: string): boolean {
  return (Deno.env.get(name) || '').toLowerCase() === 'true';
}

function safeObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeOptionalText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeOptionalAddress(value: unknown): string | null {
  const normalized = normalizeOptionalText(value);
  if (!normalized) return null;
  const address = normalizeAddress(normalized);
  return isValidWalletAddress(address) ? address : null;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function normalizeRepairAssetUids(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((entry) => normalizeAssetUid(String(entry || '')))
        .filter(Boolean),
    ),
  );
}

function normalizeRepairLimit(value: unknown): number | null {
  const parsed = toFiniteNumber(value);
  if (parsed === null) return null;
  return Math.min(Math.max(Math.floor(parsed), 1), 500);
}

function getRepairAllowlist(): string[] {
  const rawValues = [
    Deno.env.get('ATP2_AUTH_BRIDGE_REPAIR_ALLOWLIST') || '',
    Deno.env.get('ATP2_RUNTIME_MINTED_REPAIR_ALLOWLIST') || '',
    Deno.env.get('ATP2_OPERATOR_WALLET_ALLOWLIST') || '',
    Deno.env.get('GNOSIS_SAFE') || '',
    Deno.env.get('ARBITER_MULTISIG') || '',
    Deno.env.get('EMERGENCY_MULTISIG') || '',
  ];

  const normalized = rawValues
    .flatMap((value) => String(value || '').split(/[\s,;]+/))
    .map((value) => normalizeOptionalAddress(value))
    .filter((value): value is string => !!value);

  return Array.from(new Set(normalized));
}

function isRepairOperatorWallet(walletAddress: string): boolean {
  return getRepairAllowlist().includes(normalizeAddress(walletAddress));
}

function buildProjectionKey(
  chainId: number | null | undefined,
  contractAddress: string | null | undefined,
  tokenId: string | null | undefined,
): string | null {
  if (!Number.isFinite(Number(chainId))) return null;
  const normalizedContract = normalizeOptionalAddress(contractAddress);
  const normalizedTokenId = normalizeOptionalText(tokenId);
  if (!normalizedContract || !normalizedTokenId) return null;
  return `${Math.floor(Number(chainId))}:${normalizedContract}:${normalizedTokenId}`;
}

function shouldReserveProtocolOrderAmount(status: unknown): boolean {
  const normalized = String(status || '').trim().toLowerCase();
  if (!normalized) return true;
  return !/(cancel|fail|reject|expire|revert)/.test(normalized);
}

function readMetadataNumber(metadata: Record<string, unknown>, key: string): number | null {
  return toFiniteNumber(metadata[key]);
}

function resolveRuntimeMintedOwnerAddress(metadata: Record<string, unknown>): string | null {
  const seller = safeObject(metadata.seller);
  return (
    normalizeOptionalAddress(metadata.seller_wallet)
    || normalizeOptionalAddress(seller.address)
    || normalizeOptionalAddress(metadata.seeded_by_wallet)
  );
}

function resolveRuntimeMintedProtocolStatus(
  row: Pick<DbRuntimeMintedProjectionSeedRow, 'is_active'>,
  metadata: Record<string, unknown>,
): string {
  const listingState = normalizeOptionalText(metadata.listing_state);
  if (listingState) return listingState.toLowerCase();

  const metadataStatus = normalizeOptionalText(metadata.status);
  if (metadataStatus) return metadataStatus.toLowerCase();

  return row.is_active === false ? 'inactive' : 'listed';
}

function resolveRuntimeMintedAvailableAmount(
  totalAmount: number | null,
  seedAvailableAmount: number | null,
  reservedAmount: number,
): number | null {
  if (seedAvailableAmount !== null && totalAmount !== null && seedAvailableAmount === totalAmount) {
    return Math.max(0, totalAmount - reservedAmount);
  }
  if (seedAvailableAmount !== null) {
    return Math.max(0, seedAvailableAmount);
  }
  if (totalAmount !== null) {
    return Math.max(0, totalAmount - reservedAmount);
  }
  return null;
}

function getVerificationMode(): VerificationMode {
  const raw = (Deno.env.get('ATP2_SUPABASE_AUTH_BRIDGE_VERIFY_MODE') || '')
    .toLowerCase()
    .trim();
  if (raw === 'wallet_session_row') return 'wallet_session_row';
  throw new Error('ATP2_SUPABASE_AUTH_BRIDGE_VERIFY_MODE must be wallet_session_row');
}

function getTtlSeconds(): number {
  const raw = Number(Deno.env.get('ATP2_SUPABASE_AUTH_BRIDGE_TTL_SECONDS') || 900);
  if (!Number.isFinite(raw) || raw <= 0) return 900;
  return Math.min(Math.max(Math.floor(raw), 60), 3600);
}

function getClientSessionMaxAgeMs(): number {
  const raw = Number(Deno.env.get('ATP2_SUPABASE_AUTH_BRIDGE_CLIENT_SESSION_MAX_AGE_MS') || 5 * 60 * 1000);
  if (!Number.isFinite(raw) || raw <= 0) return 5 * 60 * 1000;
  return Math.min(Math.floor(raw), 10 * 60 * 1000);
}

function getChallengeTtlMs(): number {
  const raw = Number(Deno.env.get('ATP2_WALLET_AUTH_CHALLENGE_TTL_MS') || 5 * 60 * 1000);
  if (!Number.isFinite(raw) || raw <= 0) return 5 * 60 * 1000;
  return Math.min(Math.max(Math.floor(raw), 60_000), 10 * 60 * 1000);
}

function getWalletSessionTtlMs(): number {
  const defaultTtlMs = 24 * 60 * 60 * 1000;
  const raw = Number(
    Deno.env.get('ATP2_WALLET_SESSION_TTL_MS') ||
    Deno.env.get('ATP2_SUPABASE_AUTH_BRIDGE_CLIENT_SESSION_MAX_AGE_MS') ||
    defaultTtlMs,
  );
  if (!Number.isFinite(raw) || raw <= 0) return defaultTtlMs;
  return Math.min(Math.max(Math.floor(raw), 5 * 60 * 1000), 7 * 24 * 60 * 60 * 1000);
}

function getSessionLockoutIdleMs(): number {
  const raw = Number(Deno.env.get('ATP2_WALLET_SESSION_LOCKOUT_IDLE_MS') || 30 * 60 * 1000);
  if (!Number.isFinite(raw) || raw <= 0) return 30 * 60 * 1000;
  return Math.min(Math.max(Math.floor(raw), 5 * 60 * 1000), 12 * 60 * 60 * 1000);
}

function getJwtSecret(): string | null {
  const secret = (
    Deno.env.get('ATP2_SUPABASE_JWT_SECRET') ||
    Deno.env.get('SUPABASE_JWT_SECRET') ||
    Deno.env.get('JWT_SECRET') ||
    null
  );
  return secret && new TextEncoder().encode(secret).byteLength >= 32 ? secret : null;
}

function getIssuer(): string {
  return Deno.env.get('ATP2_SUPABASE_AUTH_BRIDGE_ISSUER') || 'atp2-claim-bridge';
}

function scaffoldDisabledResponse(reason: string) {
  return {
    ok: false,
    status: 'disabled',
    reason,
    hint: 'Enable ATP2_ENABLE_SUPABASE_AUTH_CLAIM_BRIDGE only after env + verification mode are configured.',
    expectedClaims: {
      role: 'authenticated',
      sub: 'profile_id uuid',
      profile_id: 'uuid',
      wallet_address: '0x... (lowercase)',
      claim_version: 'h1',
      auth_method: 'wallet_signature',
      wallet_session_id: 'uuid|null',
    },
  };
}

function shortDisplayName(walletAddress: string): string {
  return `${walletAddress.slice(0, 5)}...${walletAddress.slice(-3)}`;
}

function randomHex(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function buildWalletAuthChallengeMessage(params: {
  walletAddress: string;
  chainId: number;
  origin: string;
  nonce: string;
  issuedAt: string;
  expiresAt: string;
}): string {
  const originUrl = new URL(params.origin);
  return [
    'Orina Wallet Session Authentication',
    '',
    'Sign this message to authenticate your session in Orina.',
    'No blockchain transaction or gas fee is required.',
    '',
    `Domain: ${originUrl.host}`,
    `URI: ${originUrl.origin}`,
    `Address: ${params.walletAddress}`,
    `Chain ID: ${params.chainId}`,
    `Nonce: ${params.nonce}`,
    `Issued At: ${params.issuedAt}`,
    `Expiration Time: ${params.expiresAt}`,
  ].join('\n');
}

function extractWalletAuthMessageTimestamp(message: string): number | null {
  const match = message.match(/^Issued At:\s+(.+)$/m);
  if (!match?.[1]) return null;
  const parsed = Date.parse(match[1].trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function extractWalletAuthMessageExpiration(message: string): number | null {
  const match = message.match(/^Expiration Time:\s+(.+)$/m);
  if (!match?.[1]) return null;
  const parsed = Date.parse(match[1].trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function extractWalletAuthMessageNonce(message: string): string | null {
  return message.match(/^Nonce:\s+([a-f0-9]{64})$/m)?.[1] || null;
}

function assertWalletAuthSessionMessage(
  message: string | undefined,
  walletAddress: string,
  expectedOrigin: string,
): string | null {
  if (typeof message !== 'string' || !message.trim()) {
    return 'Missing walletAuthSession.message';
  }

  const normalized = message.replace(/\r\n/g, '\n');
  if (!normalized.startsWith('Orina Wallet Session Authentication\n')) {
    return 'Unexpected walletAuthSession.message prefix';
  }
  if (!normalized.includes(`Address: ${walletAddress}`)) {
    return 'walletAuthSession.message address mismatch';
  }
  const expectedOriginUrl = new URL(expectedOrigin);
  if (
    !normalized.includes(`Domain: ${expectedOriginUrl.host}\n`)
    || !normalized.includes(`URI: ${expectedOriginUrl.origin}\n`)
  ) {
    return 'walletAuthSession.message origin mismatch';
  }
  if (!/^Chain ID:\s+\d+$/m.test(normalized)) {
    return 'walletAuthSession.message is missing chain binding';
  }
  if (!extractWalletAuthMessageNonce(normalized)) {
    return 'walletAuthSession.message is missing a valid server nonce';
  }

  const signedMessageAt = extractWalletAuthMessageTimestamp(normalized);
  if (!signedMessageAt) {
    return 'walletAuthSession.message is missing a valid Issued At field';
  }
  if (signedMessageAt > Date.now() + 60_000) {
    return 'walletAuthSession.message Time is in the future';
  }
  if (Date.now() - signedMessageAt > getClientSessionMaxAgeMs()) {
    return 'walletAuthSession.message is too old';
  }
  const expiresAt = extractWalletAuthMessageExpiration(normalized);
  if (!expiresAt || expiresAt <= Date.now() || expiresAt <= signedMessageAt) {
    return 'walletAuthSession.message is expired';
  }
  if (expiresAt - signedMessageAt > getChallengeTtlMs() + 1_000) {
    return 'walletAuthSession.message expiration exceeds the allowed challenge lifetime';
  }

  return null;
}

function assertClientWalletSessionPayload(
  body: ExchangeRequest,
  walletAddress: string,
  expectedOrigin: string,
): string | null {
  const session = body.walletAuthSession;
  if (!session?.signature) return 'Missing walletAuthSession.signature';
  if (!/^0x[a-fA-F0-9]{130}$/.test(String(session.signature))) {
    return 'Invalid walletAuthSession.signature format';
  }
  if (!session.address || normalizeAddress(session.address) !== walletAddress) {
    return 'walletAuthSession.address mismatch';
  }
  const signedAt = Number(session.signedAt || 0);
  if (!Number.isFinite(signedAt) || signedAt <= 0) {
    return 'Invalid walletAuthSession.signedAt';
  }
  if (signedAt > Date.now() + 60_000) {
    return 'walletAuthSession.signedAt is in the future';
  }
  if (Date.now() - signedAt > getClientSessionMaxAgeMs()) {
    return 'walletAuthSession is too old';
  }
  const messageError = assertWalletAuthSessionMessage(session.message, walletAddress, expectedOrigin);
  if (messageError) {
    return messageError;
  }
  const signedMessageAt = extractWalletAuthMessageTimestamp(String(session.message || ''));
  if (signedMessageAt && Math.abs(signedMessageAt - signedAt) > 5 * 60 * 1000) {
    return 'walletAuthSession.signedAt does not align with signed message time';
  }
  return null;
}

function getServiceSupabaseClient() {
  const url = Deno.env.get('SUPABASE_URL') || '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!url || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(url, serviceRoleKey);
}

type ServiceSupabaseClient = ReturnType<typeof getServiceSupabaseClient>;

async function findActiveWalletSession(
  supabase: ServiceSupabaseClient,
  walletAddress: string
): Promise<DbWalletSessionRow | null> {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from('wallet_sessions')
    .select('id,wallet_address,created_at,expires_at,revoked_at,last_seen_at')
    .eq('wallet_address', walletAddress)
    .is('revoked_at', null)
    .gt('expires_at', nowIso)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) throw new Error(`wallet_sessions lookup failed: ${error.message}`);
  return (data?.[0] as DbWalletSessionRow | undefined) || null;
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function findPendingWalletAuthChallenge(
  supabase: ServiceSupabaseClient,
  walletAddress: string,
  message: string,
): Promise<DbWalletAuthChallengeRow | null> {
  const nonce = extractWalletAuthMessageNonce(message);
  if (!nonce) return null;
  const { data, error } = await supabase
    .from('wallet_auth_challenges')
    .select('id,wallet_address,nonce,message,expires_at,used_at')
    .eq('wallet_address', walletAddress)
    .eq('nonce', nonce)
    .eq('message', message)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .limit(1);
  if (error) throw new Error('wallet auth challenge lookup failed');
  return (data?.[0] as DbWalletAuthChallengeRow | undefined) || null;
}

async function consumeWalletAuthChallenge(
  supabase: ServiceSupabaseClient,
  challengeId: string,
): Promise<boolean> {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from('wallet_auth_challenges')
    .update({ used_at: nowIso })
    .eq('id', challengeId)
    .is('used_at', null)
    .gt('expires_at', nowIso)
    .select('id')
    .limit(1);
  if (error) throw new Error('wallet auth challenge consume failed');
  return Boolean(data?.[0]);
}

async function createWalletSession(
  supabase: ServiceSupabaseClient,
  walletAddress: string,
  opts?: { signedAt?: number; clientApp?: string | null; signature?: string | null }
): Promise<DbWalletSessionRow> {
  const now = Date.now();
  const signedAt = Number(opts?.signedAt || now);
  const createdAt = Math.min(now, Math.max(0, signedAt));
  const expiresAt = new Date(createdAt + getWalletSessionTtlMs()).toISOString();
  const sessionEntropy = [
    walletAddress,
    opts?.signature || '',
    String(signedAt),
    crypto.randomUUID(),
  ].join(':');
  const sessionTokenHash = await sha256Hex(sessionEntropy);

  const { data, error } = await supabase
    .from('wallet_sessions')
    .insert({
      wallet_address: walletAddress,
      session_token_hash: sessionTokenHash,
      expires_at: expiresAt,
      last_seen_at: new Date(now).toISOString(),
      device_label: opts?.clientApp ? `claim_bridge:${String(opts.clientApp).slice(0, 120)}` : 'claim_bridge',
    })
    .select('id,wallet_address,created_at,expires_at,revoked_at,last_seen_at')
    .limit(1);

  if (error) {
    throw new Error(`wallet_sessions insert failed: ${error.message}`);
  }

  const inserted = (data?.[0] as DbWalletSessionRow | undefined) || null;
  if (!inserted) {
    throw new Error('wallet_sessions insert failed: empty insert result');
  }

  return inserted;
}

async function ensureActiveWalletSession(
  supabase: ServiceSupabaseClient,
  walletAddress: string,
  body: ExchangeRequest,
  existingSession?: DbWalletSessionRow | null,
): Promise<DbWalletSessionRow> {
  const existing = existingSession ?? await findActiveWalletSession(supabase, walletAddress);
  if (existing) {
    void touchWalletSessionLastSeen(supabase, existing.id);
    return existing;
  }

  return createWalletSession(supabase, walletAddress, {
    signedAt: body.walletAuthSession?.signedAt,
    clientApp: body.client?.app || null,
    signature: body.walletAuthSession?.signature || null,
  });
}

async function touchWalletSessionLastSeen(
  supabase: ServiceSupabaseClient,
  sessionId: string
): Promise<void> {
  const { error } = await supabase
    .from('wallet_sessions')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', sessionId);
  if (error) {
    console.warn('[H1 Bridge] Failed to touch wallet_sessions.last_seen_at:', error.message);
  }
}

async function revokeWalletSession(
  supabase: ServiceSupabaseClient,
  sessionId: string,
): Promise<void> {
  const { error } = await supabase
    .from('wallet_sessions')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', sessionId)
    .is('revoked_at', null);
  if (error) {
    throw new Error(`wallet_sessions revoke stale session failed: ${error.message}`);
  }
}

async function resolveOrCreateProfile(
  supabase: ServiceSupabaseClient,
  walletAddress: string
): Promise<DbProfileRow> {
  const { data: existingRows, error: selectError } = await supabase
    .from('profiles')
    .select('id,wallet_address,status')
    .eq('wallet_address', walletAddress)
    .limit(1);

  if (selectError) {
    throw new Error(`profiles lookup failed: ${selectError.message}`);
  }

  const existing = (existingRows?.[0] as DbProfileRow | undefined) || null;
  if (existing) {
    if (existing.status === 'deleted') {
      throw new Error('Profile is deleted; bridge token issuance denied');
    }
    return existing;
  }

  const { data: insertedRows, error: insertError } = await supabase
    .from('profiles')
    .insert({
      wallet_address: walletAddress,
      display_name: shortDisplayName(walletAddress),
      status: 'active',
    })
    .select('id,wallet_address,status')
    .limit(1);

  if (insertError) {
    // Handle race on unique(wallet_address): re-read
    const duplicate = `${(insertError as any).code || ''}` === '23505';
    if (!duplicate) {
      throw new Error(`profiles create failed: ${insertError.message}`);
    }
    const { data: racedRows, error: racedErr } = await supabase
      .from('profiles')
      .select('id,wallet_address,status')
      .eq('wallet_address', walletAddress)
      .limit(1);
    if (racedErr || !racedRows?.[0]) {
      throw new Error(`profiles create race re-read failed: ${racedErr?.message || 'not found'}`);
    }
    return racedRows[0] as DbProfileRow;
  }

  const inserted = (insertedRows?.[0] as DbProfileRow | undefined) || null;
  if (!inserted) throw new Error('profiles create failed: empty insert result');
  return inserted;
}

async function isSessionLockoutEnabled(
  supabase: ServiceSupabaseClient,
  profileId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_app_settings')
    .select('user_id,security_settings')
    .eq('user_id', profileId)
    .limit(1);

  if (error) {
    throw new Error(`user_app_settings lookup failed: ${error.message}`);
  }

  const row = (data?.[0] as DbUserAppSettingsSecurityRow | undefined) || null;
  const security = safeObject(row?.security_settings);
  return security.sessionLockout === true;
}

function getWalletSessionLastActivityMs(session: DbWalletSessionRow | null): number {
  const raw = session?.last_seen_at || session?.created_at || '';
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function hasFreshWalletAuthSignature(
  body: ExchangeRequest,
): boolean {
  const signedAt = Number(body.walletAuthSession?.signedAt || 0);
  if (!Number.isFinite(signedAt) || signedAt <= 0) return false;
  return Date.now() - signedAt <= getSessionLockoutIdleMs();
}

async function applySessionLockoutPolicy(
  supabase: ServiceSupabaseClient,
  body: ExchangeRequest,
  activeSession: DbWalletSessionRow | null,
  sessionLockoutEnabled: boolean,
): Promise<{
  error?: string;
  nextSession: DbWalletSessionRow | null;
}> {
  if (!sessionLockoutEnabled) {
    return { nextSession: activeSession };
  }

  const idleWindowMs = getSessionLockoutIdleMs();
  const now = Date.now();
  const lastActivityMs = getWalletSessionLastActivityMs(activeSession);
  const sessionIsIdleLocked =
    !!activeSession &&
    lastActivityMs > 0 &&
    now - lastActivityMs > idleWindowMs;

  if (!activeSession) {
    return hasFreshWalletAuthSignature(body)
      ? { nextSession: null }
      : {
          error: 'Secure Orina session locked after inactivity. Sign the Orina wallet auth message again to continue.',
          nextSession: null,
        };
  }

  if (!sessionIsIdleLocked) {
    return { nextSession: activeSession };
  }

  if (!hasFreshWalletAuthSignature(body)) {
    return {
      error: 'Secure Orina session locked after inactivity. Sign the Orina wallet auth message again to continue.',
      nextSession: null,
    };
  }

  await revokeWalletSession(supabase, activeSession.id);
  return { nextSession: null };
}

function base64UrlEncodeString(value: string): string {
  return base64UrlEncodeBytes(new TextEncoder().encode(value));
}

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function signHs256Jwt(payload: Record<string, unknown>, secret: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncodeString(JSON.stringify(header));
  const encodedPayload = base64UrlEncodeString(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(signingInput)
  );

  return `${signingInput}.${base64UrlEncodeBytes(new Uint8Array(signature))}`;
}

async function issueSupabaseClaimToken(params: {
  walletAddress: string;
  profileId: string;
  walletSessionId?: string | null;
}) {
  const jwtSecret = getJwtSecret();
  if (!jwtSecret) {
    throw new Error('Missing SUPABASE_JWT_SECRET (or ATP2_SUPABASE_JWT_SECRET)');
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const ttlSec = getTtlSeconds();
  const expSec = nowSec + ttlSec;
  const issuer = getIssuer();

  const payload = {
    iss: issuer,
    aud: 'authenticated',
    iat: nowSec,
    exp: expSec,
    sub: params.profileId,
    role: 'authenticated',
    profile_id: params.profileId,
    wallet_address: params.walletAddress,
    claim_version: 'h1',
    auth_method: 'wallet_signature',
    wallet_session_id: params.walletSessionId ?? null,
  };

  const accessToken = await signHs256Jwt(payload, jwtSecret);

  return {
    accessToken,
    expiresAt: new Date(expSec * 1000).toISOString(),
    claimVersion: 'h1',
    tokenType: 'Bearer' as const,
  };
}

async function assertWalletAuthSignature(body: ExchangeRequest, walletAddress: string): Promise<string | null> {
  const session = body.walletAuthSession;
  if (!session?.signature || !session.message) {
    return 'Missing walletAuthSession proof payload';
  }

  try {
    const valid = await verifyMessage({
      address: walletAddress as `0x${string}`,
      message: session.message,
      signature: session.signature as `0x${string}`,
    });
    return valid ? null : 'walletAuthSession signature verification failed';
  } catch {
    return 'walletAuthSession signature verification failed';
  }
}

async function verifyRequestAndResolveIdentity(
  body: ExchangeRequest,
  walletAddress: string,
  requestOrigin: string,
): Promise<
  | VerificationFailure
  | {
      ok: true;
      supabase: ServiceSupabaseClient;
      mode: VerificationMode;
      profile: DbProfileRow;
      walletSessionRow: DbWalletSessionRow | null;
    }
> {
  const payloadError = assertClientWalletSessionPayload(body, walletAddress, requestOrigin);
  if (payloadError) {
    return { ok: false as const, status: 400, error: payloadError };
  }

  const supabase = getServiceSupabaseClient();
  const challenge = await findPendingWalletAuthChallenge(
    supabase,
    walletAddress,
    String(body.walletAuthSession?.message || ''),
  );
  if (!challenge) {
    return { ok: false as const, status: 401, error: 'Wallet authentication challenge is invalid, expired, or already used' };
  }

  const signatureError = await assertWalletAuthSignature(body, walletAddress);
  if (signatureError) {
    return { ok: false as const, status: 401, error: signatureError };
  }

  if (!(await consumeWalletAuthChallenge(supabase, challenge.id))) {
    return { ok: false as const, status: 401, error: 'Wallet authentication challenge was already used' };
  }

  const mode = getVerificationMode();
  const profile = await resolveOrCreateProfile(supabase, walletAddress);
  const sessionLockoutEnabled = await isSessionLockoutEnabled(supabase, profile.id);
  const activeWalletSession = mode === 'wallet_session_row'
    ? await findActiveWalletSession(supabase, walletAddress)
    : null;
  const lockoutResult = await applySessionLockoutPolicy(
    supabase,
    body,
    activeWalletSession,
    sessionLockoutEnabled,
  );
  if (lockoutResult.error) {
    return { ok: false as const, status: 401, error: lockoutResult.error };
  }

  let walletSessionRow: DbWalletSessionRow | null = null;
  if (mode === 'wallet_session_row') {
    walletSessionRow = await ensureActiveWalletSession(
      supabase,
      walletAddress,
      body,
      lockoutResult.nextSession,
    );
  }

  if (walletSessionRow?.id) {
    void touchWalletSessionLastSeen(supabase, walletSessionRow.id);
  }

  return {
    ok: true as const,
    supabase,
    mode,
    profile,
    walletSessionRow,
  };
}

router.post('/challenge', async (c) => {
  if (!isEnabled('ATP2_ENABLE_SUPABASE_AUTH_CLAIM_BRIDGE')) {
    return c.json({ error: 'Bridge is disabled' }, 501);
  }

  const allowedOrigin = resolveAllowedCorsOrigin(c.req.header('Origin'));
  if (!allowedOrigin) {
    return c.json({ error: 'Wallet authentication challenges require an approved Origin' }, 403);
  }

  let body: ChallengeRequest;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const walletAddress = normalizeAddress(String(body.walletAddress || '').trim());
  const chainId = Number(body.chainId);
  if (!isValidWalletAddress(walletAddress) || !Number.isSafeInteger(chainId) || chainId <= 0) {
    return c.json({ error: 'A valid walletAddress and positive integer chainId are required' }, 400);
  }

  const walletRate = await checkRateLimit('wallet_auth_challenge', walletAddress);
  if (!walletRate.allowed) return rateLimitExceededResponse(c, walletRate);

  const forwardedIp = String(
    c.req.header('CF-Connecting-IP')
    || c.req.header('X-Forwarded-For')?.split(',')[0]
    || 'unknown',
  ).trim();
  const ipHash = await sha256Hex(`wallet-auth-ip:${forwardedIp}`);
  const ipRate = await checkRateLimit('wallet_auth_challenge_ip', ipHash);
  if (!ipRate.allowed) return rateLimitExceededResponse(c, ipRate);

  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + getChallengeTtlMs());
  const nonce = randomHex(32);
  const message = buildWalletAuthChallengeMessage({
    walletAddress,
    chainId,
    origin: allowedOrigin,
    nonce,
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  });

  try {
    const supabase = getServiceSupabaseClient();
    const userAgentHash = await sha256Hex(`wallet-auth-ua:${String(c.req.header('User-Agent') || '')}`);
    const { error } = await supabase.from('wallet_auth_challenges').insert({
      wallet_address: walletAddress,
      nonce,
      message,
      expires_at: expiresAt.toISOString(),
      ip_hash: ipHash,
      user_agent_hash: userAgentHash,
    });
    if (error) throw new Error('challenge insert failed');
    return c.json({
      ok: true,
      walletAddress,
      chainId,
      nonce,
      message,
      issuedAt: issuedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('[H1 Bridge] Challenge creation failed:', error instanceof Error ? error.message : 'unknown error');
    return c.json({ error: 'Unable to create wallet authentication challenge' }, 500);
  }
});

router.post('/exchange', async (c) => {
  const allowedOrigin = resolveAllowedCorsOrigin(c.req.header('Origin'));
  if (!allowedOrigin) {
    return c.json({ error: 'Wallet authentication exchange requires an approved Origin' }, 403);
  }

  let body: ExchangeRequest;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const rawWallet = String(body.walletAddress || body.walletAuthSession?.address || '').trim();
  const walletAddress = normalizeAddress(rawWallet);

  if (!isValidWalletAddress(walletAddress)) {
    return c.json({ error: 'Invalid walletAddress (expected lowercase 0x + 40 hex chars)' }, 400);
  }

  const enabled = isEnabled('ATP2_ENABLE_SUPABASE_AUTH_CLAIM_BRIDGE');
  if (!enabled) {
    return c.json(
      {
        ...scaffoldDisabledResponse('ATP2_ENABLE_SUPABASE_AUTH_CLAIM_BRIDGE is not enabled'),
      },
      501
    );
  }

  const exchangeRate = await checkRateLimit('wallet_auth_exchange', walletAddress);
  if (!exchangeRate.allowed) return rateLimitExceededResponse(c, exchangeRate);

  try {
    const verified = await verifyRequestAndResolveIdentity(body, walletAddress, allowedOrigin);
    if (!verified.ok) {
      return c.json({ error: verified.error }, { status: verified.status });
    }

    const token = await issueSupabaseClaimToken({
      walletAddress,
      profileId: verified.profile.id,
      walletSessionId: verified.walletSessionRow?.id ?? null,
    });

    return c.json({
      ok: true,
      ...token,
      walletAddress,
      profileId: verified.profile.id,
      verificationMode: verified.mode,
      source: 'atp2-wallet-auth-claim-bridge',
    });
  } catch {
    console.error('[H1 Bridge] Exchange failed');
    return c.json(
      {
        error: 'Bridge exchange failed',
      },
      500
    );
  }
});

router.post('/refresh', async (c) => {
  // H1 implementation keeps refresh narrow: reuse exchange request contract for now.
  // A dedicated refresh-token flow can be added in a later hardening batch.
  return c.json(
    {
      ok: false,
      status: 'not_supported_yet',
      hint: 'Reuse /exchange for short-lived token renewal in H1. Dedicated refresh flow deferred.',
    },
    501
  );
});

router.post('/logout', async (c) => {
  const auth = await requireAuthenticatedWallet(c);
  if (!auth.ok) {
    return auth.response;
  }

  if (!isEnabled('ATP2_ENABLE_SUPABASE_AUTH_CLAIM_BRIDGE')) {
    return c.json({ error: 'Bridge is disabled' }, 501);
  }

  try {
    const supabase = getServiceSupabaseClient();
    const seededAt = new Date().toISOString();
    const revokedAt = new Date().toISOString();
    const { data, error } = await supabase
      .from('wallet_sessions')
      .update({ revoked_at: revokedAt })
      .eq('wallet_address', auth.identity.walletAddress)
      .is('revoked_at', null)
      .select('id');

    if (error) {
      throw new Error(`wallet_sessions revoke failed: ${error.message}`);
    }

    return c.json({
      ok: true,
      status: 'revoked',
      walletAddress: auth.identity.walletAddress,
      currentSessionId: auth.identity.walletSessionId,
      revokedCount: Array.isArray(data) ? data.length : 0,
      revokedAt,
    });
  } catch (error) {
    console.error('[H1 Bridge] logout failed:', error);
    return c.json(
      { error: 'Unable to revoke wallet sessions' },
      500,
    );
  }
});

router.get('/sessions', async (c) => {
  const auth = await requireAuthenticatedWallet(c);
  if (!auth.ok) {
    return auth.response;
  }

  if (!isEnabled('ATP2_ENABLE_SUPABASE_AUTH_CLAIM_BRIDGE')) {
    return c.json({ error: 'Bridge is disabled' }, 501);
  }

  try {
    const supabase = getServiceSupabaseClient();
    const currentSessionId = auth.identity.walletSessionId;

    if (currentSessionId) {
      void touchWalletSessionLastSeen(supabase, currentSessionId);
    }

    const { data, error } = await supabase
      .from('wallet_sessions')
      .select('id,wallet_address,created_at,expires_at,revoked_at,last_seen_at,device_label')
      .eq('wallet_address', auth.identity.walletAddress)
      .order('last_seen_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(8);

    if (error) {
      throw new Error(`wallet_sessions list failed: ${error.message}`);
    }

    const now = Date.now();
    const sessions = ((data || []) as DbWalletSessionListRow[]).map((row) => {
      const expiresAtMs = Date.parse(row.expires_at);
      const status =
        row.revoked_at
          ? 'revoked'
          : Number.isFinite(expiresAtMs) && expiresAtMs > now
            ? 'active'
            : 'expired';

      return {
        id: row.id,
        walletAddress: row.wallet_address,
        createdAt: row.created_at,
        lastSeenAt: row.last_seen_at,
        expiresAt: row.expires_at,
        revokedAt: row.revoked_at,
        deviceLabel: row.device_label,
        status,
        isCurrent: !!currentSessionId && row.id === currentSessionId,
      };
    });

    return c.json({
      ok: true,
      source: 'wallet_sessions',
      currentSessionId,
      sessions,
    });
  } catch (error) {
    console.error('[H1 Bridge] sessions failed:', error);
    return c.json(
      { error: 'Unable to load wallet sessions' },
      500,
    );
  }
});

router.post('/community-notify', async (c) => {
  const auth = await requireAuthenticatedWallet(c);
  if (!auth.ok) {
    return auth.response;
  }
  if (!isRepairOperatorWallet(auth.identity.walletAddress)) {
    return c.json({ error: 'Cross-wallet notification fanout is restricted to configured operator wallets' }, 403);
  }

  let body: CommunityNotifyRequest;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const targetWalletAddress = normalizeAddress(String(body.targetWalletAddress || '').trim());
  if (!isValidWalletAddress(targetWalletAddress)) {
    return c.json({ error: 'Invalid targetWalletAddress (expected lowercase 0x + 40 hex chars)' }, 400);
  }

  const title = String(body.title || '').trim();
  const message = String(body.message || '').trim();
  if (!title || !message) {
    return c.json({ error: 'title and message are required' }, 400);
  }

  const requestedSourceId = String(body.sourceId || '').trim();
  const sourceId =
    requestedSourceId && requestedSourceId.length <= 200
      ? requestedSourceId
      : `notif_${crypto.randomUUID()}`;

  if (!isEnabled('ATP2_ENABLE_SUPABASE_AUTH_CLAIM_BRIDGE')) {
    return c.json({ error: 'Bridge is disabled' }, 501);
  }

  if (body.actorWalletAddress) {
    const walletMismatch = assertAuthenticatedWalletMatch(
      c,
      auth.identity,
      body.actorWalletAddress,
      'actorWalletAddress'
    );
    if (walletMismatch) return walletMismatch;
  }

  try {
    const supabase = getServiceSupabaseClient();
    const targetProfile = await resolveOrCreateProfile(supabase, targetWalletAddress);
    const rawMetadata =
      body.metadata && typeof body.metadata === 'object'
        ? { ...(body.metadata as Record<string, unknown>) }
        : {};
    const normalizedEventCode = String(
      (rawMetadata as any).eventCode ||
      (rawMetadata as any).event_code ||
      'community_event'
    )
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9:_-]+/g, '_')
      .slice(0, 120) || 'community_event';

    const payload = {
      ...rawMetadata,
      eventCode: normalizedEventCode,
      event_code: normalizedEventCode,
      sourceId,
      source_id: sourceId,
      actorWalletAddress: body.actorWalletAddress
        ? normalizeAddress(String(body.actorWalletAddress))
        : auth.identity.walletAddress,
      actorName: body.actorName || null,
      delivered_by: 'h1_bridge_service_role',
    };

    const { data: existingRows, error: existingLookupError } = await supabase
      .from('notifications')
      .select('id,user_id,source_id,created_at,is_read')
      .eq('user_id', targetProfile.id)
      .eq('source_type', 'atp2_app_v1')
      .eq('source_id', sourceId)
      .limit(1);

    if (existingLookupError) {
      throw new Error(`notifications lookup failed: ${existingLookupError.message}`);
    }

    const existing = (existingRows?.[0] as any) || null;
    if (existing?.id) {
      const { data: updatedRows, error: updateError } = await supabase
        .from('notifications')
        .update({
          title,
          body: message,
          payload,
          // Preserve read-state on dedupe updates to avoid unread resurrection after user action.
          is_read: !!existing.is_read,
          read_at: existing.is_read ? new Date().toISOString() : null,
        })
        .eq('id', existing.id)
        .select('id,user_id,source_id,created_at')
        .limit(1);

      if (updateError) {
        throw new Error(`notifications dedupe update failed: ${updateError.message}`);
      }

      return c.json({
        ok: true,
        deduped: true,
        targetWalletAddress,
        profileId: targetProfile.id,
        sourceId,
        row: updatedRows?.[0] || existing,
      });
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: targetProfile.id,
        type: 'community',
        title,
        body: message,
        payload,
        source_type: 'atp2_app_v1',
        source_id: sourceId,
        is_read: false,
        read_at: null,
      })
      .select('id,user_id,source_id,created_at')
      .limit(1);

    if (error) {
      throw new Error(`notifications insert failed: ${error.message}`);
    }

    return c.json({
      ok: true,
      targetWalletAddress,
      profileId: targetProfile.id,
      sourceId,
      row: data?.[0] || null,
    });
  } catch (error) {
    console.error('[H1 Bridge] community-notify failed:', error);
    return c.json(
      { error: 'community-notify failed' },
      500
    );
  }
});

router.post('/asset-metadata-seed', async (c) => {
  const auth = await requireAuthenticatedWallet(c);
  if (!auth.ok) {
    return auth.response;
  }
  if (!isRepairOperatorWallet(auth.identity.walletAddress)) {
    return c.json({ error: 'Asset projection seeding is restricted to configured operator wallets' }, 403);
  }

  let body: AssetMetadataSeedRequest;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  if (!isEnabled('ATP2_ENABLE_SUPABASE_AUTH_CLAIM_BRIDGE')) {
    return c.json({ error: 'Bridge is disabled' }, 501);
  }

  const rawItems = Array.isArray(body.assetItems) ? body.assetItems : [];
  if (rawItems.length === 0) {
    return c.json({ ok: true, rows: [], count: 0 });
  }
  if (rawItems.length > 100) {
    return c.json({ error: 'Too many assetItems (max 100)' }, 400);
  }

  const normalizedItems = rawItems
    .map((item) => {
      const assetUid = normalizeAssetUid(String(item.assetUid || ''));
      const title = String(item.title || '').trim();
      if (!assetUid || !title) return null;

      const media = (Array.isArray(item.media) ? item.media : [])
        .map((m, index) => ({
          media_type: (m.mediaType === 'video' || m.mediaType === 'document' ? m.mediaType : 'image') as 'image' | 'video' | 'document',
          url: String(m.url || '').trim(),
          sort_order: Number.isFinite(Number(m.sortOrder)) ? Math.max(0, Math.floor(Number(m.sortOrder))) : index,
          metadata: (m.metadata && typeof m.metadata === 'object') ? m.metadata : {},
        }))
        .filter((m) => !!m.url);

      const tags = Array.from(
        new Set((Array.isArray(item.tags) ? item.tags : []).map((t) => normalizeTag(String(t || ''))).filter(Boolean))
      );
      const rawCategory = item.category ? String(item.category).trim() : '';
      const rawSubcategory = item.subcategory ? String(item.subcategory).trim() : '';
      const taxonomy = rawCategory || rawSubcategory
        ? normalizeListingTaxonomy(rawCategory, rawSubcategory)
        : null;

      return {
        asset_uid: assetUid,
        title,
        slug: normalizeSlug(String(item.slug || `${assetUid}-${title}`)) || assetUid,
        category: taxonomy?.categorySlug || null,
        subcategory: taxonomy?.subcategorySlug || null,
        category_label: taxonomy?.categoryLabel || null,
        subcategory_label: taxonomy?.subcategoryLabel || null,
        description: item.description ? String(item.description) : null,
        cover_image_url: item.coverImageUrl ? String(item.coverImageUrl) : null,
        gallery_images: Array.isArray(item.galleryImages) ? item.galleryImages.filter((x) => typeof x === 'string') : [],
        attributes: (item.attributes && typeof item.attributes === 'object') ? item.attributes : {},
        metadata: (item.metadata && typeof item.metadata === 'object') ? item.metadata : {},
        contract_address: item.contractAddress ? String(item.contractAddress) : null,
        token_id: item.tokenId ? String(item.tokenId) : null,
        chain_id: Number.isFinite(Number(item.chainId)) ? Number(item.chainId) : null,
        is_active: !!item.isActive,
        media,
        tags,
      };
    })
    .filter(Boolean) as Array<{
      asset_uid: string;
      title: string;
      slug: string;
      category: string | null;
      subcategory: string | null;
      category_label: string | null;
      subcategory_label: string | null;
      description: string | null;
      cover_image_url: string | null;
      gallery_images: string[];
      attributes: Record<string, unknown>;
      metadata: Record<string, unknown>;
      contract_address: string | null;
      token_id: string | null;
      chain_id: number | null;
      is_active: boolean;
      media: Array<{ media_type: 'image' | 'video' | 'document'; url: string; sort_order: number; metadata: Record<string, unknown> }>;
      tags: string[];
    }>;

  if (normalizedItems.length === 0) {
    return c.json({ error: 'No valid assetItems after normalization' }, 400);
  }

  try {
    const supabase = getServiceSupabaseClient();
    const seededAt = new Date().toISOString();

    const { data: upsertedAssets, error: assetUpsertError } = await supabase
      .from('assets_catalog')
      .upsert(
        normalizedItems.map((item) => ({
          asset_uid: item.asset_uid,
          title: item.title,
          slug: item.slug,
          category: item.category,
          subcategory: item.subcategory,
          description: item.description,
          cover_image_url: item.cover_image_url,
          gallery_images: item.gallery_images,
          attributes: item.attributes,
          metadata: {
            name: item.title,
            description: item.description,
            image: item.cover_image_url,
            images: item.gallery_images,
            category: item.category,
            subcategory: item.subcategory,
            category_label: item.category_label,
            subcategory_label: item.subcategory_label,
            seller_wallet: auth.identity.walletAddress,
            seller: {
              address: auth.identity.walletAddress,
              verified: false,
            },
            views: 0,
            likes: 0,
            createdAt: seededAt,
            updatedAt: seededAt,
            ...(item.metadata || {}),
            seeded_by: 'h1_bridge_asset_metadata_seed',
            seeded_at: seededAt,
            seeded_by_wallet: auth.identity.walletAddress,
          },
          contract_address: item.contract_address,
          token_id: item.token_id,
          chain_id: item.chain_id,
          is_active: item.is_active,
        })),
        { onConflict: 'asset_uid' }
      )
      .select('id,asset_uid');

    if (assetUpsertError) {
      throw new Error(`assets_catalog upsert failed: ${assetUpsertError.message}`);
    }

    const assetRows = (upsertedAssets || []) as DbAssetCatalogRow[];
    const assetIdByUid = new Map(assetRows.map((row) => [normalizeAssetUid(row.asset_uid), row.id]));

    const linkedItems = normalizedItems
      .map((item) => ({
        item,
        assetId: assetIdByUid.get(normalizeAssetUid(item.asset_uid)) || null,
      }))
      .filter((entry) => (
        !!entry.assetId
        && entry.item.chain_id !== null
        && !!entry.item.contract_address
        && !!entry.item.token_id
      ));

    if (linkedItems.length > 0) {
      const linkedAssetIds = Array.from(new Set(linkedItems.map((entry) => entry.assetId!)));
      const { error: linkDeleteError } = await supabase
        .from('asset_protocol_links')
        .delete()
        .in('asset_id', linkedAssetIds);

      if (linkDeleteError) {
        throw new Error(`asset_protocol_links delete failed: ${linkDeleteError.message}`);
      }

      const { error: linkInsertError } = await supabase
        .from('asset_protocol_links')
        .insert(
          linkedItems.map((entry) => ({
            asset_id: entry.assetId,
            chain_id: entry.item.chain_id,
            contract_address: entry.item.contract_address,
            token_id: entry.item.token_id,
            link_type: 'primary',
          })),
        );

      if (linkInsertError) {
        throw new Error(`asset_protocol_links insert failed: ${linkInsertError.message}`);
      }
    }

    // Tags upsert + lookup
    const allTags = Array.from(
      new Set(normalizedItems.flatMap((item) => item.tags))
    );
    let tagIdByTag = new Map<string, string>();
    if (allTags.length > 0) {
      const { error: tagsUpsertError } = await supabase
        .from('asset_tags')
        .upsert(allTags.map((tag) => ({ tag })), { onConflict: 'tag', ignoreDuplicates: true });
      if (tagsUpsertError) {
        throw new Error(`asset_tags upsert failed: ${tagsUpsertError.message}`);
      }
      const { data: tagRows, error: tagSelectError } = await supabase
        .from('asset_tags')
        .select('id,tag')
        .in('tag', allTags);
      if (tagSelectError) {
        throw new Error(`asset_tags select failed: ${tagSelectError.message}`);
      }
      tagIdByTag = new Map(((tagRows || []) as DbAssetTagRow[]).map((row) => [row.tag, row.id]));
    }

    for (const item of normalizedItems) {
      const assetId = assetIdByUid.get(item.asset_uid);
      if (!assetId) continue;

      const { error: mediaDeleteError } = await supabase
        .from('asset_media')
        .delete()
        .eq('asset_id', assetId);
      if (mediaDeleteError) {
        throw new Error(`asset_media delete failed for ${item.asset_uid}: ${mediaDeleteError.message}`);
      }

      if (item.media.length > 0) {
        const { error: mediaInsertError } = await supabase
          .from('asset_media')
          .insert(
            item.media.map((m) => ({
              asset_id: assetId,
              media_type: m.media_type,
              url: m.url,
              sort_order: m.sort_order,
              metadata: m.metadata,
            }))
          );
        if (mediaInsertError) {
          throw new Error(`asset_media insert failed for ${item.asset_uid}: ${mediaInsertError.message}`);
        }
      }

      const { error: mapDeleteError } = await supabase
        .from('asset_tag_map')
        .delete()
        .eq('asset_id', assetId);
      if (mapDeleteError) {
        throw new Error(`asset_tag_map delete failed for ${item.asset_uid}: ${mapDeleteError.message}`);
      }

      const tagRows = item.tags
        .map((tag) => {
          const tagId = tagIdByTag.get(tag);
          return tagId ? { asset_id: assetId, tag_id: tagId } : null;
        })
        .filter(Boolean);
      if (tagRows.length > 0) {
        const { error: mapInsertError } = await supabase
          .from('asset_tag_map')
          .insert(tagRows as Array<{ asset_id: string; tag_id: string }>);
        if (mapInsertError) {
          throw new Error(`asset_tag_map insert failed for ${item.asset_uid}: ${mapInsertError.message}`);
        }
      }
    }

    return c.json({
      ok: true,
      count: normalizedItems.length,
      rows: normalizedItems.map((item) => ({
        assetUid: item.asset_uid,
        assetId: assetIdByUid.get(item.asset_uid) || null,
      })),
    });
  } catch (error) {
    console.error('[H1 Bridge] asset-metadata-seed failed:', error);
    return c.json(
      { error: 'asset-metadata-seed failed' },
      500
    );
  }
});

router.post('/protocol-order-seed', async (c) => {
  const auth = await requireAuthenticatedWallet(c);
  if (!auth.ok) {
    return auth.response;
  }
  if (!isRepairOperatorWallet(auth.identity.walletAddress)) {
    return c.json({ error: 'Order projection seeding is restricted to configured operator wallets' }, 403);
  }

  let body: ProtocolOrderSeedRequest;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  if (!isEnabled('ATP2_ENABLE_SUPABASE_AUTH_CLAIM_BRIDGE')) {
    return c.json({ error: 'Bridge is disabled' }, 501);
  }

  const rawItems = Array.isArray(body.orderItems) ? body.orderItems : [];
  if (rawItems.length === 0) {
    return c.json({ ok: true, rows: [], count: 0 });
  }
  if (rawItems.length > 100) {
    return c.json({ error: 'Too many orderItems (max 100)' }, 400);
  }

  const normalizedItems = rawItems
    .map((item) => {
      const orderUid = String(item.orderUid || '').trim();
      const chainId = Number(item.chainId);
      const marketplaceContract = normalizeAddress(String(item.marketplaceContract || '').trim());
      const buyerAddress = normalizeAddress(String(item.buyerAddress || '').trim());
      const sellerAddress = normalizeAddress(String(item.sellerAddress || '').trim());
      if (!orderUid || !Number.isFinite(chainId) || !isValidWalletAddress(marketplaceContract) || !isValidWalletAddress(buyerAddress) || !isValidWalletAddress(sellerAddress)) {
        return null;
      }

      const assetContractRaw = String(item.assetContract || '').trim();
      const assetContract = assetContractRaw && isValidWalletAddress(normalizeAddress(assetContractRaw))
        ? normalizeAddress(assetContractRaw)
        : null;
      const status = String(item.status || '').trim().toLowerCase() || 'pending_seller_confirm';
      const metadata = safeObject(item.metadata);

      return {
        order_uid: orderUid,
        chain_id: Math.floor(chainId),
        marketplace_contract: marketplaceContract,
        asset_contract: assetContract,
        asset_token_id: item.assetTokenId ? String(item.assetTokenId) : null,
        buyer_address: buyerAddress,
        seller_address: sellerAddress,
        status,
        amount: item.amount === null || item.amount === undefined ? null : String(item.amount),
        price_per_unit: item.pricePerUnit === null || item.pricePerUnit === undefined ? null : String(item.pricePerUnit),
        total_value: item.totalValue === null || item.totalValue === undefined ? null : String(item.totalValue),
        currency_symbol: item.currencySymbol ? String(item.currencySymbol) : null,
        metadata: {
          ...metadata,
          seeded_by: 'h1_bridge_protocol_order_seed',
          seeded_at: new Date().toISOString(),
          seeded_by_wallet: auth.identity.walletAddress,
        },
      };
    })
    .filter(Boolean) as Array<{
      order_uid: string;
      chain_id: number;
      marketplace_contract: string;
      asset_contract: string | null;
      asset_token_id: string | null;
      buyer_address: string;
      seller_address: string;
      status: string;
      amount: string | null;
      price_per_unit: string | null;
      total_value: string | null;
      currency_symbol: string | null;
      metadata: Record<string, unknown>;
    }>;

  if (normalizedItems.length === 0) {
    return c.json({ error: 'No valid orderItems after normalization' }, 400);
  }

  const walletAddress = auth.identity.walletAddress;
  const unauthorized = normalizedItems.find((item) => item.buyer_address !== walletAddress && item.seller_address !== walletAddress);
  if (unauthorized) {
    return c.json({ error: 'Authenticated wallet must match order buyer or seller' }, 403);
  }

  try {
    const supabase = getServiceSupabaseClient();
    const { data, error } = await supabase
      .from('protocol_orders')
      .upsert(normalizedItems, { onConflict: 'chain_id,marketplace_contract,order_uid' })
      .select('id,order_uid');

    if (error) {
      throw new Error(`protocol_orders upsert failed: ${error.message}`);
    }

    return c.json({
      ok: true,
      count: normalizedItems.length,
      rows: (data || []).map((row) => ({
        id: String((row as { id?: string }).id || ''),
        orderUid: String((row as { order_uid?: string }).order_uid || ''),
      })),
    });
  } catch (error) {
    console.error('[H1 Bridge] protocol-order-seed failed:', error);
    return c.json(
      { error: 'protocol-order-seed failed' },
      500,
    );
  }
});

router.post('/repair/runtime-minted-projections', async (c) => {
  const auth = await requireAuthenticatedWallet(c);
  if (!auth.ok) {
    return auth.response;
  }

  if (!isEnabled('ATP2_ENABLE_SUPABASE_AUTH_CLAIM_BRIDGE')) {
    return c.json({ error: 'Bridge is disabled' }, 501);
  }

  const allowlist = getRepairAllowlist();
  if (allowlist.length === 0) {
    return c.json({ error: 'Repair allowlist is not configured' }, 503);
  }

  if (!isRepairOperatorWallet(auth.identity.walletAddress)) {
    return c.json({ error: 'Authenticated wallet is not allowed to run runtime projection repair' }, 403);
  }

  let body: RuntimeMintedProjectionRepairRequest = {};
  try {
    body = await c.req.json();
  } catch {
    body = {};
  }

  const dryRun = body.dryRun !== false;
  const limit = normalizeRepairLimit(body.limit) ?? 200;
  const assetUids = normalizeRepairAssetUids(body.assetUids);
  const chainIdFilter = toFiniteNumber(body.chainId);
  const contractAddressFilter = normalizeOptionalAddress(body.contractAddress);
  const tokenIdFilter = normalizeOptionalText(body.tokenId);

  try {
    const supabase = getServiceSupabaseClient();

    let seedQuery = supabase
      .from('assets_catalog')
      .select('id,asset_uid,title,contract_address,token_id,chain_id,is_active,metadata')
      .contains('metadata', { seed_source: 'runtime_minted_asset_bridge_v1' })
      .order('asset_uid', { ascending: true })
      .limit(limit);

    if (assetUids.length > 0) {
      seedQuery = seedQuery.in('asset_uid', assetUids);
    }
    if (chainIdFilter !== null) {
      seedQuery = seedQuery.eq('chain_id', Math.floor(chainIdFilter));
    }
    if (contractAddressFilter) {
      seedQuery = seedQuery.eq('contract_address', contractAddressFilter);
    }
    if (tokenIdFilter) {
      seedQuery = seedQuery.eq('token_id', tokenIdFilter);
    }

    const { data: seedData, error: seedError } = await seedQuery;
    if (seedError) {
      throw new Error(`assets_catalog runtime seed lookup failed: ${seedError.message}`);
    }

    const seedRows = (seedData || []) as DbRuntimeMintedProjectionSeedRow[];
    if (seedRows.length === 0) {
      return c.json({
        ok: true,
        dryRun,
        matched: 0,
        linkInserts: 0,
        protocolAssetUpserts: 0,
        rows: [],
      });
    }

    const projectionCandidates = seedRows
      .map((row) => {
        const chainId = Number.isFinite(Number(row.chain_id)) ? Math.floor(Number(row.chain_id)) : null;
        const contractAddress = normalizeOptionalAddress(row.contract_address);
        const tokenId = normalizeOptionalText(row.token_id);
        return {
          row,
          chainId,
          contractAddress,
          tokenId,
          projectionKey: buildProjectionKey(chainId, contractAddress, tokenId),
        };
      });

    const validProjectionCandidates = projectionCandidates.filter((candidate) => !!candidate.projectionKey);
    const chainIds = Array.from(new Set(validProjectionCandidates.map((candidate) => candidate.chainId as number)));
    const contractAddresses = Array.from(new Set(validProjectionCandidates.map((candidate) => candidate.contractAddress as string)));
    const tokenIds = Array.from(new Set(validProjectionCandidates.map((candidate) => candidate.tokenId as string)));

    let existingLinkRows: DbAssetProtocolLinkProjectionRow[] = [];
    let existingProtocolAssetRows: DbProtocolAssetProjectionRow[] = [];
    let existingOrderRows: DbProtocolOrderProjectionAmountRow[] = [];

    if (chainIds.length > 0 && contractAddresses.length > 0 && tokenIds.length > 0) {
      const [linkResult, protocolAssetResult, orderResult] = await Promise.all([
        supabase
          .from('asset_protocol_links')
          .select('asset_id,chain_id,contract_address,token_id')
          .in('chain_id', chainIds)
          .in('contract_address', contractAddresses)
          .in('token_id', tokenIds),
        supabase
          .from('protocol_assets')
          .select('chain_id,asset_contract,token_id')
          .in('chain_id', chainIds)
          .in('asset_contract', contractAddresses)
          .in('token_id', tokenIds),
        supabase
          .from('protocol_orders')
          .select('chain_id,asset_contract,asset_token_id,status,amount')
          .in('chain_id', chainIds)
          .in('asset_contract', contractAddresses)
          .in('asset_token_id', tokenIds),
      ]);

      if (linkResult.error) {
        throw new Error(`asset_protocol_links lookup failed: ${linkResult.error.message}`);
      }
      if (protocolAssetResult.error) {
        throw new Error(`protocol_assets lookup failed: ${protocolAssetResult.error.message}`);
      }
      if (orderResult.error) {
        throw new Error(`protocol_orders lookup failed: ${orderResult.error.message}`);
      }

      existingLinkRows = (linkResult.data || []) as DbAssetProtocolLinkProjectionRow[];
      existingProtocolAssetRows = (protocolAssetResult.data || []) as DbProtocolAssetProjectionRow[];
      existingOrderRows = (orderResult.data || []) as DbProtocolOrderProjectionAmountRow[];
    }

    const seedRowsByProjection = new Map<string, DbRuntimeMintedProjectionSeedRow[]>();
    for (const candidate of validProjectionCandidates) {
      const projectionKey = candidate.projectionKey as string;
      const group = seedRowsByProjection.get(projectionKey) || [];
      group.push(candidate.row);
      seedRowsByProjection.set(projectionKey, group);
    }

    const existingLinkAssetIdsByProjection = new Map<string, Set<string>>();
    for (const row of existingLinkRows) {
      const projectionKey = buildProjectionKey(row.chain_id, row.contract_address, row.token_id);
      if (!projectionKey) continue;
      const group = existingLinkAssetIdsByProjection.get(projectionKey) || new Set<string>();
      group.add(String(row.asset_id));
      existingLinkAssetIdsByProjection.set(projectionKey, group);
    }

    const existingProtocolAssetKeys = new Set(
      existingProtocolAssetRows
        .map((row) => buildProjectionKey(row.chain_id, row.asset_contract, row.token_id))
        .filter((value): value is string => !!value),
    );

    const reservedAmountByProjection = new Map<string, number>();
    for (const row of existingOrderRows) {
      const projectionKey = buildProjectionKey(row.chain_id ?? null, row.asset_contract ?? null, row.asset_token_id ?? null);
      if (!projectionKey || !shouldReserveProtocolOrderAmount(row.status)) continue;
      const amount = toFiniteNumber(row.amount) || 0;
      reservedAmountByProjection.set(projectionKey, (reservedAmountByProjection.get(projectionKey) || 0) + Math.max(0, amount));
    }

    const plannedLinkRows: Array<{
      asset_id: string;
      chain_id: number;
      contract_address: string;
      token_id: string;
      link_type: 'primary';
    }> = [];
    const plannedProtocolAssetRows: Array<{
      chain_id: number;
      asset_contract: string;
      token_id: string;
      owner_address: string | null;
      status: string;
      available_amount: number | null;
      total_amount: number | null;
      metadata: Record<string, unknown>;
    }> = [];

    const planRows = projectionCandidates.map((candidate) => {
      const metadata = safeObject(candidate.row.metadata);
      const reservedAmount = candidate.projectionKey ? (reservedAmountByProjection.get(candidate.projectionKey) || 0) : 0;
      const totalAmount = readMetadataNumber(metadata, 'totalSlots');
      const seedAvailableAmount = readMetadataNumber(metadata, 'availableSlots');
      const resolvedAvailableAmount = resolveRuntimeMintedAvailableAmount(totalAmount, seedAvailableAmount, reservedAmount);
      const ownerAddress = resolveRuntimeMintedOwnerAddress(metadata);
      const status = resolveRuntimeMintedProtocolStatus(candidate.row, metadata);

      if (!candidate.projectionKey || candidate.chainId === null || !candidate.contractAddress || !candidate.tokenId) {
        return {
          assetUid: candidate.row.asset_uid,
          assetId: candidate.row.id,
          title: candidate.row.title,
          chainId: candidate.chainId,
          contractAddress: candidate.contractAddress,
          tokenId: candidate.tokenId,
          projectionKey: candidate.projectionKey,
          action: 'skip_missing_projection_key',
          reason: 'Seed row is missing a valid chain/contract/token projection tuple',
          reservedAmount,
          totalAmount,
          seedAvailableAmount,
          resolvedAvailableAmount,
          ownerAddress,
        };
      }

      const duplicateSeedRows = seedRowsByProjection.get(candidate.projectionKey) || [];
      if (duplicateSeedRows.length > 1) {
        return {
          assetUid: candidate.row.asset_uid,
          assetId: candidate.row.id,
          title: candidate.row.title,
          chainId: candidate.chainId,
          contractAddress: candidate.contractAddress,
          tokenId: candidate.tokenId,
          projectionKey: candidate.projectionKey,
          action: 'skip_duplicate_seed_rows',
          reason: `Projection tuple is claimed by multiple assets_catalog rows (${duplicateSeedRows.map((row) => row.asset_uid).join(', ')})`,
          reservedAmount,
          totalAmount,
          seedAvailableAmount,
          resolvedAvailableAmount,
          ownerAddress,
        };
      }

      const linkedAssetIds = existingLinkAssetIdsByProjection.get(candidate.projectionKey) || new Set<string>();
      const linkExists = linkedAssetIds.has(candidate.row.id);
      const conflictingLinkedAssets = Array.from(linkedAssetIds).filter((assetId) => assetId !== candidate.row.id);
      if (conflictingLinkedAssets.length > 0) {
        return {
          assetUid: candidate.row.asset_uid,
          assetId: candidate.row.id,
          title: candidate.row.title,
          chainId: candidate.chainId,
          contractAddress: candidate.contractAddress,
          tokenId: candidate.tokenId,
          projectionKey: candidate.projectionKey,
          action: 'skip_conflicting_link',
          reason: `Projection tuple is already linked to a different asset_id (${conflictingLinkedAssets.join(', ')})`,
          reservedAmount,
          totalAmount,
          seedAvailableAmount,
          resolvedAvailableAmount,
          ownerAddress,
        };
      }

      const protocolAssetExists = existingProtocolAssetKeys.has(candidate.projectionKey);
      const needsLinkInsert = !linkExists;
      const needsProtocolAssetUpsert = !protocolAssetExists;

      if (needsLinkInsert) {
        plannedLinkRows.push({
          asset_id: candidate.row.id,
          chain_id: candidate.chainId,
          contract_address: candidate.contractAddress,
          token_id: candidate.tokenId,
          link_type: 'primary',
        });
      }

      if (needsProtocolAssetUpsert) {
        plannedProtocolAssetRows.push({
          chain_id: candidate.chainId,
          asset_contract: candidate.contractAddress,
          token_id: candidate.tokenId,
          owner_address: ownerAddress,
          status,
          available_amount: resolvedAvailableAmount,
          total_amount: totalAmount,
          metadata: {
            source: 'h1_bridge_runtime_projection_repair',
            source_asset_id: candidate.row.id,
            source_asset_uid: candidate.row.asset_uid,
            source_seed: 'runtime_minted_asset_bridge_v1',
            source_title: candidate.row.title || null,
            seller_wallet: ownerAddress,
            seed_available_amount: seedAvailableAmount,
            seed_total_amount: totalAmount,
            reserved_order_amount: reservedAmount,
            repaired_at: new Date().toISOString(),
            repaired_by_wallet: auth.identity.walletAddress,
          },
        });
      }

      return {
        assetUid: candidate.row.asset_uid,
        assetId: candidate.row.id,
        title: candidate.row.title,
        chainId: candidate.chainId,
        contractAddress: candidate.contractAddress,
        tokenId: candidate.tokenId,
        projectionKey: candidate.projectionKey,
        action:
          needsLinkInsert && needsProtocolAssetUpsert
            ? 'insert_link_and_protocol_asset'
            : needsLinkInsert
              ? 'insert_link'
              : needsProtocolAssetUpsert
                ? 'upsert_protocol_asset'
                : 'noop',
        reason: null,
        reservedAmount,
        totalAmount,
        seedAvailableAmount,
        resolvedAvailableAmount,
        ownerAddress,
      };
    });

    if (!dryRun) {
      if (plannedLinkRows.length > 0) {
        const { error: linkRepairError } = await supabase
          .from('asset_protocol_links')
          .upsert(plannedLinkRows, { onConflict: 'asset_id,chain_id,contract_address,token_id' });
        if (linkRepairError) {
          throw new Error(`asset_protocol_links repair upsert failed: ${linkRepairError.message}`);
        }
      }

      if (plannedProtocolAssetRows.length > 0) {
        const { error: protocolAssetRepairError } = await supabase
          .from('protocol_assets')
          .upsert(plannedProtocolAssetRows, { onConflict: 'chain_id,asset_contract,token_id' });
        if (protocolAssetRepairError) {
          throw new Error(`protocol_assets repair upsert failed: ${protocolAssetRepairError.message}`);
        }
      }
    }

    return c.json({
      ok: true,
      dryRun,
      matched: seedRows.length,
      linkInserts: plannedLinkRows.length,
      protocolAssetUpserts: plannedProtocolAssetRows.length,
      skipped: planRows.filter((row) => String(row.action).startsWith('skip_')).length,
      allowlistCount: allowlist.length,
      rows: planRows,
    });
  } catch (error) {
    console.error('[H1 Bridge] runtime-minted projection repair failed:', error);
    return c.json(
      { error: 'runtime-minted projection repair failed' },
      500,
    );
  }
});

router.get('/health', async (c) => {
  return c.json({
    ok: true,
    status: 'implemented_h1',
  });
});

export default router;
