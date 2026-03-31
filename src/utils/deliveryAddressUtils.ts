/**
 * @deprecated Phase 3 - Hybrid wallet data: Delivery addresses.
 * localStorage persistence should migrate to remote-first via the
 * delivery_addresses (000015) server table.
 * See spec: 15-local-api-audit-and-server-migration-plan.md
 */
import type {
  DeliveryAddressDraft,
  DeliveryAddressFieldErrors,
  DeliveryAddressRecord,
  DeliveryGeoSelection,
  GeoCountry,
  GeoPlace,
  LegacyDeliveryAddressDraft,
} from '@/types/address';
import type { AssetLocationSnapshot } from '@/types/asset';
import { GEO_SEED_COUNTRIES, GEO_SEED_PLACES } from '@/utils/geoSeedData';
import { isGuestModeForced } from '@/utils/guestMode';
import {
  dispatchSyncEvent,
  encodeEq,
  isSupabaseRestEnabled,
  restDelete,
  restInsert,
  restSelect,
  toQuery,
} from '@/utils/supabaseRest';
import { ensureRemoteProfileIdForWallet, getCachedRemoteProfileId } from '@/utils/profileUtils';
import { getWalletSettingsKey } from '@/utils/themePreferences';

const DELIVERY_ADDRESSES_SYNC_EVENT = 'orina:delivery-addresses-changed';
const deliveryHydrateInFlight = new Set<string>();


let geoCountriesCache: GeoCountry[] | null = null;
const geoPlacesCache = new Map<string, GeoPlace[]>();

type DbGeoCountryRow = {
  code: string;
  iso3: string;
  name: string;
  native_name: string | null;
  phone_code: string | null;
  postal_code_label: string;
  postal_code_required: boolean;
  postal_code_pattern: string | null;
  address_schema: Record<string, unknown> | null;
  is_active: boolean;
  metadata: Record<string, unknown> | null;
};

type DbGeoPlaceRow = {
  id: string;
  country_code: string;
  parent_id: string | null;
  depth: number;
  place_kind: GeoPlace['placeKind'];
  code: string | null;
  name: string;
  name_ascii: string | null;
  label: string | null;
  is_selectable: boolean;
  sort_order: number;
  lat: number | null;
  lng: number | null;
  postal_code_pattern: string | null;
  metadata: Record<string, unknown> | null;
};

type DbDeliveryAddressRow = {
  id: string;
  label: string | null;
  user_id: string;
  recipient_name: string;
  phone_e164: string | null;
  country_code: string;
  country_name_snapshot: string;
  geo_path: DeliveryGeoSelection[];
  leaf_place_id: string | null;
  postal_code: string | null;
  address_line1: string;
  address_line2: string | null;
  delivery_instructions: string | null;
  is_default: boolean;
  validation_status: DeliveryAddressRecord['validationStatus'];
  source: DeliveryAddressRecord['source'];
  created_at: string;
  updated_at: string;
};

function walletKey(walletAddress: string): string {
  return String(walletAddress || '').trim().toLowerCase();
}

function getDeliveryAddressesKey(walletAddress: string): string {
  return `orina_delivery_addresses_${walletKey(walletAddress)}`;
}

function shouldBlockGuestWrite(op: string): boolean {
  if (!isGuestModeForced()) return false;
  console.warn(`[DeliveryAddress] Blocked guest-mode write: ${op}`);
  return true;
}

function readLocalArraySafe<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function safeObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeCountryCode(value: string | null | undefined): string {
  return String(value || '').trim().toUpperCase();
}

function normalizeGeoSelection(
  selection: Partial<DeliveryGeoSelection> | null | undefined,
  fallbackLabel = ''
): DeliveryGeoSelection | null {
  if (!selection?.placeId || !selection?.kind || !selection?.name) return null;
  return {
    placeId: String(selection.placeId),
    kind: selection.kind,
    code: selection.code ? String(selection.code) : undefined,
    name: String(selection.name),
    label: String(selection.label || fallbackLabel || selection.kind),
  };
}

function normalizeGeoPath(path: unknown): DeliveryGeoSelection[] {
  if (!Array.isArray(path)) return [];
  return path
    .map((item) => normalizeGeoSelection(item))
    .filter(Boolean) as DeliveryGeoSelection[];
}

function normalizeCountry(row: Partial<DbGeoCountryRow> | GeoCountry): GeoCountry {
  const schemaSource = safeObject((row as DbGeoCountryRow).address_schema ?? (row as GeoCountry).addressSchema);
  const levelsSource = Array.isArray(schemaSource.levels) ? schemaSource.levels : [];

  return {
    code: normalizeCountryCode((row as DbGeoCountryRow).code ?? (row as GeoCountry).code),
    iso3: String(((row as DbGeoCountryRow).iso3 ?? (row as GeoCountry).iso3) || '').toUpperCase(),
    name: String(((row as DbGeoCountryRow).name ?? (row as GeoCountry).name) || ''),
    nativeName: ((row as DbGeoCountryRow).native_name ?? (row as GeoCountry).nativeName ?? undefined) || undefined,
    phoneCode: ((row as DbGeoCountryRow).phone_code ?? (row as GeoCountry).phoneCode ?? undefined) || undefined,
    postalCodeLabel: String(((row as DbGeoCountryRow).postal_code_label ?? (row as GeoCountry).postalCodeLabel) || 'Postal code'),
    postalCodeRequired: Boolean((row as DbGeoCountryRow).postal_code_required ?? (row as GeoCountry).postalCodeRequired),
    postalCodePattern: ((row as DbGeoCountryRow).postal_code_pattern ?? (row as GeoCountry).postalCodePattern ?? undefined) || undefined,
    addressSchema: {
      levels: levelsSource
        .map((level) => safeObject(level))
        .filter((level) => level.kind && level.label)
        .map((level) => ({
          kind: String(level.kind) as GeoPlace['placeKind'],
          label: String(level.label),
          required: Boolean(level.required),
        })),
    },
    isActive: Boolean((row as DbGeoCountryRow).is_active ?? (row as GeoCountry).isActive ?? true),
    metadata: safeObject((row as DbGeoCountryRow).metadata ?? (row as GeoCountry).metadata),
  };
}

function normalizePlace(row: Partial<DbGeoPlaceRow> | GeoPlace): GeoPlace {
  return {
    id: String(((row as DbGeoPlaceRow).id ?? (row as GeoPlace).id) || ''),
    countryCode: normalizeCountryCode((row as DbGeoPlaceRow).country_code ?? (row as GeoPlace).countryCode),
    parentId: ((row as DbGeoPlaceRow).parent_id ?? (row as GeoPlace).parentId ?? undefined) || null,
    depth: Number((row as DbGeoPlaceRow).depth ?? (row as GeoPlace).depth ?? 1),
    placeKind: ((row as DbGeoPlaceRow).place_kind ?? (row as GeoPlace).placeKind ?? 'locality') as GeoPlace['placeKind'],
    code: ((row as DbGeoPlaceRow).code ?? (row as GeoPlace).code ?? undefined) || undefined,
    name: String(((row as DbGeoPlaceRow).name ?? (row as GeoPlace).name) || ''),
    nameAscii: ((row as DbGeoPlaceRow).name_ascii ?? (row as GeoPlace).nameAscii ?? undefined) || undefined,
    label: ((row as DbGeoPlaceRow).label ?? (row as GeoPlace).label ?? undefined) || undefined,
    isSelectable: Boolean((row as DbGeoPlaceRow).is_selectable ?? (row as GeoPlace).isSelectable ?? true),
    sortOrder: Number((row as DbGeoPlaceRow).sort_order ?? (row as GeoPlace).sortOrder ?? 0),
    lat: (row as DbGeoPlaceRow).lat ?? (row as GeoPlace).lat ?? null,
    lng: (row as DbGeoPlaceRow).lng ?? (row as GeoPlace).lng ?? null,
    postalCodePattern: ((row as DbGeoPlaceRow).postal_code_pattern ?? (row as GeoPlace).postalCodePattern ?? undefined) || undefined,
    metadata: safeObject((row as DbGeoPlaceRow).metadata ?? (row as GeoPlace).metadata),
  };
}

function normalizeDeliveryAddressRecord(raw: Partial<DeliveryAddressRecord> | Partial<DbDeliveryAddressRow>): DeliveryAddressRecord {
  const createdAtSource = (raw as DbDeliveryAddressRow).created_at ?? (raw as DeliveryAddressRecord).createdAt;
  const updatedAtSource = (raw as DbDeliveryAddressRow).updated_at ?? (raw as DeliveryAddressRecord).updatedAt;

  return {
    id: String(raw.id || crypto.randomUUID()),
    label: raw.label ? String(raw.label) : undefined,
    recipientName: String((raw as DbDeliveryAddressRow).recipient_name ?? raw.recipientName ?? '').trim(),
    phoneE164: ((raw as DbDeliveryAddressRow).phone_e164 ?? raw.phoneE164 ?? undefined) || undefined,
    countryCode: normalizeCountryCode((raw as DbDeliveryAddressRow).country_code ?? raw.countryCode),
    countryNameSnapshot: String((raw as DbDeliveryAddressRow).country_name_snapshot ?? raw.countryNameSnapshot ?? '').trim(),
    geoPath: normalizeGeoPath((raw as DbDeliveryAddressRow).geo_path ?? raw.geoPath),
    leafPlaceId: ((raw as DbDeliveryAddressRow).leaf_place_id ?? raw.leafPlaceId ?? undefined) || undefined,
    postalCode: ((raw as DbDeliveryAddressRow).postal_code ?? raw.postalCode ?? undefined) || undefined,
    addressLine1: String((raw as DbDeliveryAddressRow).address_line1 ?? raw.addressLine1 ?? '').trim(),
    addressLine2: ((raw as DbDeliveryAddressRow).address_line2 ?? raw.addressLine2 ?? undefined) || undefined,
    deliveryInstructions: ((raw as DbDeliveryAddressRow).delivery_instructions ?? raw.deliveryInstructions ?? undefined) || undefined,
    isDefault: Boolean((raw as DbDeliveryAddressRow).is_default ?? raw.isDefault),
    validationStatus: ((raw as DbDeliveryAddressRow).validation_status ?? raw.validationStatus ?? 'unverified') as DeliveryAddressRecord['validationStatus'],
    source: ((raw as DbDeliveryAddressRow).source ?? raw.source ?? 'manual') as DeliveryAddressRecord['source'],
    createdAt: typeof createdAtSource === 'string' ? Date.parse(createdAtSource) : Number(createdAtSource || Date.now()),
    updatedAt: typeof updatedAtSource === 'string' ? Date.parse(updatedAtSource) : Number(updatedAtSource || Date.now()),
  };
}

function buildAddressDbRow(userId: string, record: DeliveryAddressRecord): Record<string, unknown> {
  return {
    id: record.id,
    user_id: userId,
    label: record.label || null,
    recipient_name: record.recipientName,
    phone_e164: record.phoneE164 || null,
    country_code: record.countryCode,
    country_name_snapshot: record.countryNameSnapshot,
    geo_path: record.geoPath,
    leaf_place_id: record.leafPlaceId || null,
    postal_code: record.postalCode || null,
    address_line1: record.addressLine1,
    address_line2: record.addressLine2 || null,
    delivery_instructions: record.deliveryInstructions || null,
    is_default: record.isDefault,
    validation_status: record.validationStatus,
    source: record.source,
    created_at: new Date(record.createdAt).toISOString(),
  };
}



function sortDeliveryAddresses(addresses: DeliveryAddressRecord[]): DeliveryAddressRecord[] {
  return [...addresses].sort((a, b) => {
    if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
    return (b.updatedAt || 0) - (a.updatedAt || 0);
  });
}

function ensureSingleDefaultAddress(addresses: DeliveryAddressRecord[]): DeliveryAddressRecord[] {
  const normalized = sortDeliveryAddresses(addresses);
  let defaultSeen = false;

  return normalized.map((item, index) => {
    const shouldBeDefault = item.isDefault && !defaultSeen;
    if (shouldBeDefault) defaultSeen = true;
    if (!defaultSeen && index === normalized.length - 1) {
      return { ...item, isDefault: true };
    }
    return shouldBeDefault ? item : { ...item, isDefault: false };
  });
}

function mergeDeliveryAddressesPreferLocal(
  localItems: DeliveryAddressRecord[],
  remoteItems: DeliveryAddressRecord[]
): DeliveryAddressRecord[] {
  const byId = new Map<string, DeliveryAddressRecord>();

  for (const item of remoteItems) {
    byId.set(item.id, item);
  }

  for (const item of localItems) {
    const existing = byId.get(item.id);
    if (!existing || (item.updatedAt || 0) >= (existing.updatedAt || 0)) {
      byId.set(item.id, item);
    }
  }

  return ensureSingleDefaultAddress(Array.from(byId.values()));
}

function saveLocalDeliveryAddresses(walletAddress: string, addresses: DeliveryAddressRecord[]): DeliveryAddressRecord[] {
  const key = getDeliveryAddressesKey(walletAddress);
  const normalized = ensureSingleDefaultAddress(addresses.map(normalizeDeliveryAddressRecord));
  localStorage.setItem(key, JSON.stringify(normalized));
  dispatchSyncEvent(DELIVERY_ADDRESSES_SYNC_EVENT);
  return normalized;
}

function loadLocalDeliveryAddresses(walletAddress: string): DeliveryAddressRecord[] {
  return sortDeliveryAddresses(
    readLocalArraySafe<Partial<DeliveryAddressRecord>>(getDeliveryAddressesKey(walletAddress))
      .map(normalizeDeliveryAddressRecord)
  );
}

async function hydrateDeliveryAddressesFromSupabase(walletAddress: string): Promise<DeliveryAddressRecord[]> {
  const key = walletKey(walletAddress);
  if (!key || deliveryHydrateInFlight.has(key) || !isSupabaseRestEnabled()) {
    return loadLocalDeliveryAddresses(walletAddress);
  }

  deliveryHydrateInFlight.add(key);
  try {
    const userId = getCachedRemoteProfileId(key) || await ensureRemoteProfileIdForWallet(key);
    if (!userId) return loadLocalDeliveryAddresses(walletAddress);

    const rows = await restSelect<DbDeliveryAddressRow>(
      'user_delivery_addresses',
      toQuery({
        select: '*',
        user_id: encodeEq(userId),
        order: 'is_default.desc,updated_at.desc',
      })
    );

    const remoteItems = rows.map(normalizeDeliveryAddressRecord);
    const next = mergeDeliveryAddressesPreferLocal(loadLocalDeliveryAddresses(walletAddress), remoteItems);
    saveLocalDeliveryAddresses(walletAddress, next);
    return next;
  } catch (error) {
    console.debug('[DeliveryAddress] Supabase hydrate skipped:', error);
    return loadLocalDeliveryAddresses(walletAddress);
  } finally {
    deliveryHydrateInFlight.delete(key);
  }
}

async function syncDeliveryAddressesToSupabase(walletAddress: string, items?: DeliveryAddressRecord[]): Promise<void> {
  if (!isSupabaseRestEnabled()) return;

  try {
    const userId = await ensureRemoteProfileIdForWallet(walletAddress);
    if (!userId) return;

    const current = items ?? loadLocalDeliveryAddresses(walletAddress);
    await restDelete('user_delivery_addresses', toQuery({ user_id: encodeEq(userId) }));

    if (current.length === 0) return;

    await restInsert(
      'user_delivery_addresses',
      current.map((item) => buildAddressDbRow(userId, item))
    );
  } catch (error) {
    console.debug('[DeliveryAddress] Supabase sync skipped:', error);
  }
}

function matchesQueryName(source: string | undefined, query: string | undefined): boolean {
  if (!source || !query) return false;
  return source.trim().toLowerCase() === query.trim().toLowerCase();
}

function findGeoPathByLeaf(countryCode: string, leafId: string): DeliveryGeoSelection[] {
  const path: DeliveryGeoSelection[] = [];
  const placeById = new Map(GEO_SEED_PLACES.map((place) => [place.id, place]));
  const country = GEO_SEED_COUNTRIES.find((item) => item.code === countryCode);
  let cursor = placeById.get(leafId);

  while (cursor) {
    const level = country?.addressSchema.levels[cursor.depth - 1];
    path.unshift({
      placeId: cursor.id,
      kind: cursor.placeKind,
      code: cursor.code || undefined,
      name: cursor.name,
      label: level?.label || cursor.label || cursor.placeKind,
    });
    cursor = cursor.parentId ? placeById.get(cursor.parentId) : undefined;
  }

  return path;
}

function deriveGeoPathFromLegacy(countryCode: string, legacy: LegacyDeliveryAddressDraft): DeliveryGeoSelection[] {
  const places = GEO_SEED_PLACES.filter((place) => place.countryCode === countryCode);
  const localityQuery = legacy.city?.trim();
  const admin1Query = legacy.state?.trim();

  if (localityQuery) {
    const localityMatch = places.find((place) => {
      if (!matchesQueryName(place.name, localityQuery)) return false;
      if (!admin1Query) return true;
      const path = findGeoPathByLeaf(countryCode, place.id);
      return path.some((segment) => matchesQueryName(segment.name, admin1Query));
    });

    if (localityMatch) {
      return findGeoPathByLeaf(countryCode, localityMatch.id);
    }
  }

  if (admin1Query) {
    const admin1Match = places.find((place) => place.depth === 1 && matchesQueryName(place.name, admin1Query));
    if (admin1Match) {
      return findGeoPathByLeaf(countryCode, admin1Match.id);
    }
  }

  return [];
}

export function getDeliveryAddressSyncEventName(): string {
  return DELIVERY_ADDRESSES_SYNC_EVENT;
}

export async function loadGeoCountries(): Promise<GeoCountry[]> {
  if (geoCountriesCache) return geoCountriesCache;

  if (isSupabaseRestEnabled()) {
    try {
      const rows = await restSelect<DbGeoCountryRow>(
        'geo_countries',
        toQuery({
          select: 'code,iso3,name,native_name,phone_code,postal_code_label,postal_code_required,postal_code_pattern,address_schema,is_active,metadata',
          is_active: encodeEq(true),
          order: 'name.asc',
        })
      );
      if (rows.length > 0) {
        geoCountriesCache = rows.map(normalizeCountry);
        return geoCountriesCache;
      }
    } catch (error) {
      console.debug('[DeliveryAddress] Geo countries fallback engaged:', error);
    }
  }

  geoCountriesCache = GEO_SEED_COUNTRIES.map(normalizeCountry);
  return geoCountriesCache;
}

export async function loadGeoPlaces(countryCode: string, parentId: string | null): Promise<GeoPlace[]> {
  const normalizedCountry = normalizeCountryCode(countryCode);
  const cacheKey = `${normalizedCountry}:${parentId || 'root'}`;
  const cached = geoPlacesCache.get(cacheKey);
  if (cached) return cached;

  if (isSupabaseRestEnabled()) {
    try {
      const rows = await restSelect<DbGeoPlaceRow>(
        'geo_places',
        toQuery({
          select: 'id,country_code,parent_id,depth,place_kind,code,name,name_ascii,label,is_selectable,sort_order,lat,lng,postal_code_pattern,metadata',
          country_code: encodeEq(normalizedCountry),
          parent_id: parentId ? encodeEq(parentId) : 'is.null',
          order: 'sort_order.asc,name.asc',
        })
      );
      if (rows.length > 0) {
        const places = rows.map(normalizePlace);
        geoPlacesCache.set(cacheKey, places);
        return places;
      }
    } catch (error) {
      console.debug('[DeliveryAddress] Geo places fallback engaged:', error);
    }
  }

  const fallback = GEO_SEED_PLACES
    .filter((item) => item.countryCode === normalizedCountry && (item.parentId || null) === (parentId || null))
    .map(normalizePlace)
    .sort((a, b) => (a.sortOrder - b.sortOrder) || a.name.localeCompare(b.name));
  geoPlacesCache.set(cacheKey, fallback);
  return fallback;
}

export function clearGeoAddressCaches(): void {
  geoCountriesCache = null;
  geoPlacesCache.clear();
}

export function createEmptyDeliveryAddressDraft(): DeliveryAddressDraft {
  return {
    recipientName: '',
    phoneE164: '',
    countryCode: '',
    countryNameSnapshot: '',
    geoPath: [],
    leafPlaceId: '',
    postalCode: '',
    addressLine1: '',
    addressLine2: '',
    deliveryInstructions: '',
    isDefault: true,
    validationStatus: 'unverified',
    source: 'manual',
  };
}

export function draftFromDeliveryAddress(record: DeliveryAddressRecord | null | undefined): DeliveryAddressDraft {
  if (!record) return createEmptyDeliveryAddressDraft();
  return {
    id: record.id,
    label: record.label || '',
    recipientName: record.recipientName,
    phoneE164: record.phoneE164 || '',
    countryCode: record.countryCode,
    countryNameSnapshot: record.countryNameSnapshot,
    geoPath: normalizeGeoPath(record.geoPath),
    leafPlaceId: record.leafPlaceId || record.geoPath[record.geoPath.length - 1]?.placeId || '',
    postalCode: record.postalCode || '',
    addressLine1: record.addressLine1,
    addressLine2: record.addressLine2 || '',
    deliveryInstructions: record.deliveryInstructions || '',
    isDefault: record.isDefault,
    validationStatus: record.validationStatus,
    source: record.source,
  };
}

function normalizePhoneE164(phone: string | undefined, countryPhoneCode?: string | null): string | undefined {
  const raw = String(phone || '').trim();
  if (!raw) return undefined;

  let cleaned = raw.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('00')) cleaned = `+${cleaned.slice(2)}`;
  if (cleaned.startsWith('+')) return cleaned;

  const prefix = String(countryPhoneCode || '').trim();
  if (prefix.startsWith('+')) {
    return `${prefix}${cleaned.replace(/^0+/, '')}`;
  }

  return cleaned;
}

export function buildDeliveryAddressRecord(
  draft: DeliveryAddressDraft,
  country?: GeoCountry | null
): DeliveryAddressRecord {
  const now = Date.now();
  const trimmedGeoPath = draft.geoPath
    .map((item, index) => normalizeGeoSelection(item, country?.addressSchema.levels[index]?.label))
    .filter(Boolean) as DeliveryGeoSelection[];
  const countryNameSnapshot = draft.countryNameSnapshot || country?.name || draft.countryCode;

  return normalizeDeliveryAddressRecord({
    id: draft.id || crypto.randomUUID(),
    label: draft.label?.trim() || undefined,
    recipientName: draft.recipientName,
    phoneE164: normalizePhoneE164(draft.phoneE164, country?.phoneCode),
    countryCode: draft.countryCode,
    countryNameSnapshot,
    geoPath: trimmedGeoPath,
    leafPlaceId: trimmedGeoPath[trimmedGeoPath.length - 1]?.placeId || draft.leafPlaceId || undefined,
    postalCode: draft.postalCode?.trim() || undefined,
    addressLine1: draft.addressLine1,
    addressLine2: draft.addressLine2?.trim() || undefined,
    deliveryInstructions: draft.deliveryInstructions?.trim() || undefined,
    isDefault: draft.isDefault,
    validationStatus: draft.validationStatus,
    source: draft.source,
    createdAt: now,
    updatedAt: now,
  });
}

export async function loadUserDeliveryAddresses(walletAddress?: string | null): Promise<DeliveryAddressRecord[]> {
  const normalized = walletKey(String(walletAddress || ''));
  if (!normalized) return [];

  const local = loadLocalDeliveryAddresses(normalized);
  if (!isSupabaseRestEnabled()) return local;
  return hydrateDeliveryAddressesFromSupabase(normalized);
}

export async function saveUserDeliveryAddress(
  walletAddress: string,
  draft: DeliveryAddressDraft,
  country?: GeoCountry | null
): Promise<DeliveryAddressRecord> {
  if (shouldBlockGuestWrite('saveUserDeliveryAddress')) {
    throw new Error('Guest mode is read only');
  }

  const normalizedWallet = walletKey(walletAddress);
  if (!normalizedWallet) {
    throw new Error('No wallet connected');
  }

  const existing = loadLocalDeliveryAddresses(normalizedWallet);
  const previous = draft.id ? existing.find((item) => item.id === draft.id) : undefined;
  const nextRecord = buildDeliveryAddressRecord(draft, country);
  const persistedRecord = {
    ...nextRecord,
    createdAt: previous?.createdAt || nextRecord.createdAt,
    updatedAt: Date.now(),
  };

  const withoutCurrent = existing.filter((item) => item.id !== persistedRecord.id);
  const nextItems = persistedRecord.isDefault
    ? withoutCurrent.map((item) => ({ ...item, isDefault: false })).concat(persistedRecord)
    : withoutCurrent.concat(persistedRecord);

  // Server-first: persist to Supabase immediately, cache locally
  saveLocalDeliveryAddresses(normalizedWallet, nextItems);
  await syncDeliveryAddressesToSupabase(normalizedWallet, nextItems);

  return persistedRecord;
}

export function getPreferredDeliveryAddress(addresses: DeliveryAddressRecord[]): DeliveryAddressRecord | null {
  return sortDeliveryAddresses(addresses)[0] || null;
}

export function extractLegacyDeliveryAddressFromWalletSettings(walletAddress?: string | null): LegacyDeliveryAddressDraft | null {
  if (typeof window === 'undefined') return null;
  const settingsKey = getWalletSettingsKey(walletAddress);
  if (!settingsKey) return null;

  try {
    const raw = window.localStorage.getItem(settingsKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LegacyDeliveryAddressDraft;
    const values = [
      parsed.fullName,
      parsed.phoneNumber,
      parsed.streetAddress,
      parsed.city,
      parsed.state,
      parsed.zipCode,
      parsed.country,
    ].filter((item) => String(item || '').trim().length > 0);

    return values.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export function createDeliveryDraftFromLegacyAddress(
  legacy: LegacyDeliveryAddressDraft | null | undefined,
  countries: GeoCountry[]
): DeliveryAddressDraft {
  if (!legacy) return createEmptyDeliveryAddressDraft();

  const fallbackCountry = countries.find((country) => matchesQueryName(country.name, legacy.country));
  const geoPath = fallbackCountry ? deriveGeoPathFromLegacy(fallbackCountry.code, legacy) : [];

  return {
    id: crypto.randomUUID(),
    recipientName: legacy.fullName?.trim() || legacy.recipientName?.trim() || '',
    phoneE164: legacy.phoneNumber?.trim() || '',
    countryCode: fallbackCountry?.code || '',
    countryNameSnapshot: fallbackCountry?.name || legacy.country?.trim() || '',
    geoPath,
    leafPlaceId: geoPath[geoPath.length - 1]?.placeId || '',
    postalCode: legacy.zipCode?.trim() || '',
    addressLine1: legacy.streetAddress?.trim() || '',
    addressLine2: '',
    deliveryInstructions: '',
    isDefault: true,
    validationStatus: geoPath.length > 0 ? 'format_valid' : 'manual_unstructured',
    source: 'legacy_migrated',
  };
}

export function resolveCountryByCode(countries: GeoCountry[], code: string): GeoCountry | null {
  return countries.find((item) => item.code === normalizeCountryCode(code)) || null;
}

export function getGeoLabelAtIndex(country: GeoCountry | null | undefined, index: number): string {
  return country?.addressSchema.levels[index]?.label || `Region ${index + 1}`;
}

export function getActivePostalPattern(country: GeoCountry | null | undefined, leafPlace?: GeoPlace | null): string | null {
  return leafPlace?.postalCodePattern || country?.postalCodePattern || null;
}

export function validateDeliveryAddressDraft(
  draft: DeliveryAddressDraft,
  country: GeoCountry | null | undefined,
  leafPlace?: GeoPlace | null
): DeliveryAddressFieldErrors {
  const errors: DeliveryAddressFieldErrors = {};

  if (!draft.recipientName.trim()) {
    errors.recipientName = 'Recipient name is required';
  }

  if (!draft.countryCode.trim()) {
    errors.countryCode = 'Country is required';
  }

  if (!draft.addressLine1.trim()) {
    errors.addressLine1 = 'Address line 1 is required';
  }

  const levels = country?.addressSchema.levels || [];
  levels.forEach((level, index) => {
    if (level.required && !draft.geoPath[index]) {
      errors[`geo-${index}`] = `${level.label} is required`;
    }
  });

  if (country?.postalCodeRequired && !String(draft.postalCode || '').trim()) {
    errors.postalCode = `${country.postalCodeLabel} is required`;
  }

  const activePattern = getActivePostalPattern(country, leafPlace);
  const postalValue = String(draft.postalCode || '').trim();
  if (postalValue && activePattern) {
    try {
      const postalRegex = new RegExp(activePattern, 'i');
      if (!postalRegex.test(postalValue)) {
        errors.postalCode = `Invalid ${country?.postalCodeLabel?.toLowerCase() || 'postal code'} format`;
      }
    } catch {
      // Ignore malformed pattern definitions and allow save.
    }
  }

  return errors;
}

export function formatDeliveryAddressPreview(
  draft: DeliveryAddressDraft | DeliveryAddressRecord,
  country?: GeoCountry | null
): string {
  const segments: string[] = [];
  if (draft.addressLine1) segments.push(draft.addressLine1.trim());
  if ('addressLine2' in draft && draft.addressLine2) segments.push(String(draft.addressLine2).trim());

  const geoNames = [...(draft.geoPath || [])].map((item) => item.name).filter(Boolean);
  if (geoNames.length > 0) segments.push(...geoNames.slice().reverse());

  const postal = String(draft.postalCode || '').trim();
  if (postal) {
    if (geoNames.length > 0) {
      const last = segments.pop();
      if (last) segments.push(`${last} ${postal}`.trim());
    } else {
      segments.push(postal);
    }
  }

  if (draft.countryNameSnapshot) {
    segments.push(draft.countryNameSnapshot);
  } else if (country?.name) {
    segments.push(country.name);
  }

  return segments.filter(Boolean).join(', ');
}

export async function resolveGeoPlaceById(
  countryCode: string,
  placeId?: string | null
): Promise<GeoPlace | null> {
  const normalizedCountryCode = normalizeCountryCode(countryCode);
  const normalizedPlaceId = String(placeId || '').trim();
  if (!normalizedCountryCode || !normalizedPlaceId) return null;

  for (const places of geoPlacesCache.values()) {
    const cached = places.find(
      (place) => place.id === normalizedPlaceId && place.countryCode === normalizedCountryCode
    );
    if (cached) return cached;
  }

  const seedMatch = GEO_SEED_PLACES.find(
    (place) => place.id === normalizedPlaceId && place.countryCode === normalizedCountryCode
  );
  if (seedMatch) return normalizePlace(seedMatch);

  if (isSupabaseRestEnabled()) {
    try {
      const rows = await restSelect<DbGeoPlaceRow>(
        'geo_places',
        toQuery({
          select: 'id,country_code,parent_id,depth,place_kind,code,name,name_ascii,label,is_selectable,sort_order,lat,lng,postal_code_pattern,metadata',
          id: encodeEq(normalizedPlaceId),
          country_code: encodeEq(normalizedCountryCode),
          limit: '1',
        })
      );
      if (rows.length > 0) return normalizePlace(rows[0]);
    } catch (error) {
      console.debug('[DeliveryAddress] Geo place lookup fallback engaged:', error);
    }
  }

  return null;
}

export async function buildAssetLocationSnapshot({
  draft,
  country,
  sourceMode,
  capturedAt = Date.now(),
}: {
  draft: DeliveryAddressDraft | DeliveryAddressRecord | null | undefined;
  country?: GeoCountry | null;
  sourceMode: 'default' | 'other';
  capturedAt?: number;
}): Promise<AssetLocationSnapshot | null> {
  if (!draft) return null;

  const countryCode = normalizeCountryCode(draft.countryCode);
  const geoPath = normalizeGeoPath(draft.geoPath);
  const leafPlaceId = String(draft.leafPlaceId || geoPath[geoPath.length - 1]?.placeId || '').trim();
  const leafPlace = await resolveGeoPlaceById(countryCode, leafPlaceId);
  const displayAddress = formatDeliveryAddressPreview(draft, country);

  if (!displayAddress && !countryCode) return null;

  const coordinates =
    typeof leafPlace?.lat === 'number' && typeof leafPlace?.lng === 'number'
      ? {
          lat: leafPlace.lat,
          lng: leafPlace.lng,
        }
      : null;

  const rawPrecision = leafPlace?.placeKind || geoPath[geoPath.length - 1]?.kind || (countryCode ? 'country' : 'unstructured');
  const precision: AssetLocationSnapshot['precision'] =
    rawPrecision === 'admin1' ||
    rawPrecision === 'admin2' ||
    rawPrecision === 'admin3' ||
    rawPrecision === 'admin4' ||
    rawPrecision === 'admin5' ||
    rawPrecision === 'locality' ||
    rawPrecision === 'sublocality' ||
    rawPrecision === 'country'
      ? rawPrecision
      : 'unstructured';

  return {
    sourceMode,
    displayAddress,
    countryCode,
    countryNameSnapshot: draft.countryNameSnapshot || country?.name || countryCode,
    geoPath,
    leafPlaceId: leafPlaceId || undefined,
    postalCode: String(draft.postalCode || '').trim() || undefined,
    coordinates,
    precision,
    capturedAt,
  };
}

export function draftSignature(draft: DeliveryAddressDraft): string {
  return JSON.stringify({
    ...draft,
    recipientName: draft.recipientName.trim(),
    phoneE164: String(draft.phoneE164 || '').trim(),
    countryCode: normalizeCountryCode(draft.countryCode),
    countryNameSnapshot: draft.countryNameSnapshot.trim(),
    geoPath: normalizeGeoPath(draft.geoPath),
    leafPlaceId: String(draft.leafPlaceId || '').trim(),
    postalCode: String(draft.postalCode || '').trim(),
    addressLine1: draft.addressLine1.trim(),
    addressLine2: String(draft.addressLine2 || '').trim(),
    deliveryInstructions: String(draft.deliveryInstructions || '').trim(),
  });
}
