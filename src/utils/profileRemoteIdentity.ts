import { normalizeAddress, scopedAddress } from '@/utils/storageScope';
import {
  getLocalSupabaseId,
  isSupabaseRestEnabled,
  restSelect,
  restUpsert,
  setLocalSupabaseId,
  toQuery,
  encodeEq,
} from '@/utils/supabaseRest';
import { ensureSupabaseBridgeAccessToken, isSupabaseAuthClaimBridgeEnabled } from '@/utils/supabaseAuthClaimBridge';

type DbProfileRow = {
  id: string;
  wallet_address: string;
  display_name: string | null;
  username: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  banner_url?: string | null;
  avatar_type?: string | null;
  website?: string | null;
  twitter?: string | null;
  discord?: string | null;
  telegram?: string | null;
  is_verified?: boolean;
  status?: string;
};

function profileMapKey(address: string): string {
  return normalizeAddress(address);
}

const remoteProfileIdInFlight = new Map<string, Promise<string | null>>();

function getProfileKey(address: string): string {
  return `user_profile_${scopedAddress(address)}`;
}

function getLegacyProfileKey(address: string): string {
  return `user_profile_${normalizeAddress(address)}`;
}

function shortenAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function defaultUsername(address: string): string {
  return `@${normalizeAddress(address).slice(2, 10)}`;
}

function defaultDisplayName(address: string): string {
  return shortenAddress(normalizeAddress(address));
}

function readLocalProfileSeed(address: string): Record<string, unknown> | null {
  if (typeof window === 'undefined') return null;
  try {
    const normalized = normalizeAddress(address);
    const key = getProfileKey(normalized);
    const legacyKey = getLegacyProfileKey(normalized);
    const raw = localStorage.getItem(key) || localStorage.getItem(legacyKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function profileRowFromSeed(address: string, seed?: Record<string, unknown> | null): Partial<DbProfileRow> {
  const normalized = normalizeAddress(address);
  return {
    wallet_address: normalized,
    display_name:
      typeof seed?.displayName === 'string' && seed.displayName.trim()
        ? seed.displayName
        : defaultDisplayName(normalized),
    username:
      typeof seed?.username === 'string' && seed.username.trim()
        ? seed.username
        : defaultUsername(normalized),
    bio: typeof seed?.bio === 'string' ? seed.bio : null,
    avatar_url:
      typeof seed?.avatarUrl === 'string'
        ? seed.avatarUrl
        : typeof seed?.avatar === 'string'
          ? seed.avatar
          : null,
    banner_url:
      typeof seed?.bannerUrl === 'string'
        ? seed.bannerUrl
        : typeof seed?.banner === 'string'
          ? seed.banner
          : null,
    avatar_type: typeof seed?.avatarType === 'string' ? seed.avatarType : null,
    website:
      seed?.socialLinks && typeof seed.socialLinks === 'object' && typeof (seed.socialLinks as Record<string, unknown>).website === 'string'
        ? ((seed.socialLinks as Record<string, unknown>).website as string)
        : null,
    twitter:
      seed?.socialLinks && typeof seed.socialLinks === 'object' && typeof (seed.socialLinks as Record<string, unknown>).twitter === 'string'
        ? ((seed.socialLinks as Record<string, unknown>).twitter as string)
        : null,
    discord:
      seed?.socialLinks && typeof seed.socialLinks === 'object' && typeof (seed.socialLinks as Record<string, unknown>).discord === 'string'
        ? ((seed.socialLinks as Record<string, unknown>).discord as string)
        : null,
    telegram:
      seed?.socialLinks && typeof seed.socialLinks === 'object' && typeof (seed.socialLinks as Record<string, unknown>).telegram === 'string'
        ? ((seed.socialLinks as Record<string, unknown>).telegram as string)
        : null,
  };
}

export function getCachedRemoteProfileId(address: string): string | null {
  return getLocalSupabaseId('profile', profileMapKey(address));
}

export async function ensureRemoteProfileIdForWallet(address: string): Promise<string | null> {
  const normalized = normalizeAddress(address);
  if (!normalized || !isSupabaseRestEnabled()) return null;

  const cached = getCachedRemoteProfileId(normalized);
  if (cached) return cached;

   const inFlight = remoteProfileIdInFlight.get(normalized);
   if (inFlight) return inFlight;

  const request = (async (): Promise<string | null> => {
    if (isSupabaseAuthClaimBridgeEnabled()) {
      try {
        await ensureSupabaseBridgeAccessToken({
          walletAddress: normalized,
          promptOnAuthMissing: false,
        });
      } catch (error) {
        console.debug('[ProfileIdentity] Claim bridge exchange skipped:', error);
      }
    }

    try {
      const rows = await restSelect<DbProfileRow>(
        'profiles',
        toQuery({ select: '*', wallet_address: encodeEq(normalized), limit: '1' })
      );
      const found = rows[0];
      if (found?.id) {
        setLocalSupabaseId('profile', profileMapKey(normalized), found.id);
        return found.id;
      }
    } catch (error) {
      console.debug('[ProfileIdentity] Remote lookup skipped:', error);
      return null;
    }

    try {
      const seed = readLocalProfileSeed(normalized);
      const rows = await restUpsert<DbProfileRow>(
        'profiles',
        [profileRowFromSeed(normalized, seed)],
        { onConflict: 'wallet_address' }
      );
      const saved = rows[0];
      if (saved?.id) {
        setLocalSupabaseId('profile', profileMapKey(normalized), saved.id);
        return saved.id;
      }
    } catch (error) {
      console.debug('[ProfileIdentity] Remote create skipped:', error);
    }

    return null;
  })();

  remoteProfileIdInFlight.set(normalized, request);
  try {
    return await request;
  } finally {
    remoteProfileIdInFlight.delete(normalized);
  }
}
