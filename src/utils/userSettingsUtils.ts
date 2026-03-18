import type { StoredUserAppSettingsRecord, UserAppSettings } from '@/types/user-settings';
import type { NotificationPreferences } from '@/types/notifications';
import type { UserProfile } from '@/types/profile';
import { isGuestModeForced } from '@/utils/guestMode';
import {
  dispatchSyncEvent,
  encodeEq,
  isSupabaseRestEnabled,
  restSelect,
  restUpsert,
  toQuery,
} from '@/utils/supabaseRest';
import { ensureRemoteProfileIdForWallet, getCachedRemoteProfileId } from '@/utils/profileRemoteIdentity';
import { getWalletSettingsKey } from '@/utils/themePreferences';

export const USER_SETTINGS_SYNC_EVENT = 'orina:user-settings-changed';

export const DEFAULT_USER_APP_SETTINGS: UserAppSettings = {
  newOrders: true,
  payments: true,
  transfers: false,
  messagingAlerts: true,
  twoFactor: false,
  emailNotifications: true,
  pushNotifications: true,
  saleNotifications: true,
  offerNotifications: true,
  followerNotifications: true,
  publicProfile: true,
  showActivity: true,
  showBalance: true,
  showFollowers: true,
  darkMode: true,
  compactView: false,
  animations: true,
  language: 'en-US',
  timezone: 'UTC',
  currency: 'USD',
  sessionLockout: false,
  ipWhitelist: true,
  desktopNotificationsEnabled: true,
  soundNotificationsEnabled: false,
  toastNotificationsEnabled: true,
  notificationTypeOrder: true,
  notificationTypeMessage: true,
  notificationTypeSystem: true,
  notificationTypeCommunity: true,
};

type DbUserAppSettingsRow = {
  user_id: string;
  notification_settings: Record<string, unknown> | null;
  privacy_settings: Record<string, unknown> | null;
  security_settings: Record<string, unknown> | null;
  display_settings: Record<string, unknown> | null;
  region_settings: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
};

type DbLegacyUserPreferencesRow = {
  user_id: string;
  notification_settings: Record<string, unknown> | null;
  ui_preferences: Record<string, unknown> | null;
  privacy_settings: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
};

const settingsHydrateInFlight = new Set<string>();

function safeObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeWallet(address?: string | null): string {
  return String(address || '').trim().toLowerCase();
}

function shouldBlockGuestWrite(op: string): boolean {
  if (!isGuestModeForced()) return false;
  console.warn(`[UserSettings] Blocked guest-mode write: ${op}`);
  return true;
}

function toBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function toStringValue(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function toLanguageCode(value: unknown, fallback: string): string {
  const normalized = toStringValue(value, fallback).trim().toLowerCase();
  if (normalized === 'en') return 'en-US';
  return normalized || fallback;
}

function toThemeMode(value: unknown): boolean | null {
  if (value === 'dark') return true;
  if (value === 'light') return false;
  return null;
}

function isNotificationPreferencesShape(value: unknown): value is NotificationPreferences {
  const source = safeObject(value);
  return (
    typeof source.enableDesktop === 'boolean' ||
    typeof source.enableSound === 'boolean' ||
    typeof source.enableToasts === 'boolean' ||
    typeof safeObject(source.types).order === 'boolean' ||
    typeof safeObject(source.types).message === 'boolean' ||
    typeof safeObject(source.types).system === 'boolean' ||
    typeof safeObject(source.types).community === 'boolean'
  );
}

function buildStoredSettingsRecord(raw: Record<string, unknown> | null | undefined): StoredUserAppSettingsRecord {
  const source = safeObject(raw);
  return {
    newOrders: toBoolean(source.newOrders, DEFAULT_USER_APP_SETTINGS.newOrders),
    payments: toBoolean(source.payments, DEFAULT_USER_APP_SETTINGS.payments),
    transfers: toBoolean(source.transfers, DEFAULT_USER_APP_SETTINGS.transfers),
    messagingAlerts: toBoolean(source.messagingAlerts, DEFAULT_USER_APP_SETTINGS.messagingAlerts),
    twoFactor: toBoolean(source.twoFactor, DEFAULT_USER_APP_SETTINGS.twoFactor),
    emailNotifications: toBoolean(source.emailNotifications, DEFAULT_USER_APP_SETTINGS.emailNotifications),
    pushNotifications: toBoolean(source.pushNotifications, DEFAULT_USER_APP_SETTINGS.pushNotifications),
    saleNotifications: toBoolean(source.saleNotifications, DEFAULT_USER_APP_SETTINGS.saleNotifications),
    offerNotifications: toBoolean(source.offerNotifications, DEFAULT_USER_APP_SETTINGS.offerNotifications),
    followerNotifications: toBoolean(source.followerNotifications, DEFAULT_USER_APP_SETTINGS.followerNotifications),
    publicProfile: toBoolean(source.publicProfile, DEFAULT_USER_APP_SETTINGS.publicProfile),
    showActivity: toBoolean(source.showActivity, DEFAULT_USER_APP_SETTINGS.showActivity),
    showBalance: toBoolean(source.showBalance, DEFAULT_USER_APP_SETTINGS.showBalance),
    showFollowers: toBoolean(source.showFollowers, DEFAULT_USER_APP_SETTINGS.showFollowers),
    darkMode: toBoolean(source.darkMode, DEFAULT_USER_APP_SETTINGS.darkMode),
    compactView: toBoolean(source.compactView, DEFAULT_USER_APP_SETTINGS.compactView),
    animations: toBoolean(source.animations, DEFAULT_USER_APP_SETTINGS.animations),
    language: toLanguageCode(source.language, DEFAULT_USER_APP_SETTINGS.language),
    timezone: toStringValue(source.timezone, DEFAULT_USER_APP_SETTINGS.timezone),
    currency: toStringValue(source.currency, DEFAULT_USER_APP_SETTINGS.currency),
    sessionLockout: toBoolean(source.sessionLockout, DEFAULT_USER_APP_SETTINGS.sessionLockout),
    ipWhitelist: toBoolean(source.ipWhitelist, DEFAULT_USER_APP_SETTINGS.ipWhitelist),
    desktopNotificationsEnabled: toBoolean(source.desktopNotificationsEnabled, DEFAULT_USER_APP_SETTINGS.desktopNotificationsEnabled),
    soundNotificationsEnabled: toBoolean(source.soundNotificationsEnabled, DEFAULT_USER_APP_SETTINGS.soundNotificationsEnabled),
    toastNotificationsEnabled: toBoolean(source.toastNotificationsEnabled, DEFAULT_USER_APP_SETTINGS.toastNotificationsEnabled),
    notificationTypeOrder: toBoolean(source.notificationTypeOrder, DEFAULT_USER_APP_SETTINGS.notificationTypeOrder),
    notificationTypeMessage: toBoolean(source.notificationTypeMessage, DEFAULT_USER_APP_SETTINGS.notificationTypeMessage),
    notificationTypeSystem: toBoolean(source.notificationTypeSystem, DEFAULT_USER_APP_SETTINGS.notificationTypeSystem),
    notificationTypeCommunity: toBoolean(source.notificationTypeCommunity, DEFAULT_USER_APP_SETTINGS.notificationTypeCommunity),
    updatedAt: typeof source.updatedAt === 'number' && Number.isFinite(source.updatedAt)
      ? source.updatedAt
      : Date.now(),
  };
}

function buildDbRow(userId: string, settings: StoredUserAppSettingsRecord): DbUserAppSettingsRow {
  return {
    user_id: userId,
    notification_settings: {
      newOrders: settings.newOrders,
      payments: settings.payments,
      transfers: settings.transfers,
      messagingAlerts: settings.messagingAlerts,
      emailNotifications: settings.emailNotifications,
      pushNotifications: settings.pushNotifications,
      saleNotifications: settings.saleNotifications,
      offerNotifications: settings.offerNotifications,
      followerNotifications: settings.followerNotifications,
      enableDesktop: settings.desktopNotificationsEnabled,
      enableSound: settings.soundNotificationsEnabled,
      enableToasts: settings.toastNotificationsEnabled,
      types: {
        order: settings.notificationTypeOrder,
        message: settings.notificationTypeMessage,
        system: settings.notificationTypeSystem,
        community: settings.notificationTypeCommunity,
      },
    },
    privacy_settings: {
      publicProfile: settings.publicProfile,
      showActivity: settings.showActivity,
      showBalance: settings.showBalance,
      showFollowers: settings.showFollowers,
    },
    security_settings: {
      twoFactor: settings.twoFactor,
      sessionLockout: settings.sessionLockout,
      ipWhitelist: settings.ipWhitelist,
    },
    display_settings: {
      darkMode: settings.darkMode,
      compactView: settings.compactView,
      animations: settings.animations,
    },
    region_settings: {
      language: settings.language,
      timezone: settings.timezone,
      currency: settings.currency,
    },
  };
}

function mapDbRowToStoredSettings(row: DbUserAppSettingsRow): StoredUserAppSettingsRecord {
  const notification = safeObject(row.notification_settings);
  const privacy = safeObject(row.privacy_settings);
  const security = safeObject(row.security_settings);
  const display = safeObject(row.display_settings);
  const region = safeObject(row.region_settings);
  const types = safeObject(notification.types);

  return buildStoredSettingsRecord({
    ...DEFAULT_USER_APP_SETTINGS,
    newOrders: notification.newOrders,
    payments: notification.payments,
    transfers: notification.transfers,
    messagingAlerts: notification.messagingAlerts,
    emailNotifications: notification.emailNotifications,
    pushNotifications: notification.pushNotifications,
    saleNotifications: notification.saleNotifications,
    offerNotifications: notification.offerNotifications,
    followerNotifications: notification.followerNotifications,
    publicProfile: privacy.publicProfile,
    showActivity: privacy.showActivity,
    showBalance: privacy.showBalance,
    showFollowers: privacy.showFollowers,
    twoFactor: security.twoFactor,
    sessionLockout: security.sessionLockout,
    ipWhitelist: security.ipWhitelist,
    darkMode: display.darkMode,
    compactView: display.compactView,
    animations: display.animations,
    desktopNotificationsEnabled: notification.enableDesktop,
    soundNotificationsEnabled: notification.enableSound,
    toastNotificationsEnabled: notification.enableToasts,
    notificationTypeOrder: types.order,
    notificationTypeMessage: types.message,
    notificationTypeSystem: types.system,
    notificationTypeCommunity: types.community,
    language: region.language,
    timezone: region.timezone,
    currency: region.currency,
    updatedAt: row.updated_at ? Date.parse(row.updated_at) : Date.now(),
  });
}

function mapLegacyUserPreferencesRowToStoredSettings(
  row: DbLegacyUserPreferencesRow,
  fallback: StoredUserAppSettingsRecord
): StoredUserAppSettingsRecord {
  const notification = safeObject(row.notification_settings);
  const ui = safeObject(row.ui_preferences);
  const privacy = safeObject(row.privacy_settings);

  const notificationPatch = isNotificationPreferencesShape(notification)
    ? {
        desktopNotificationsEnabled: notification.enableDesktop,
        soundNotificationsEnabled: notification.enableSound,
        toastNotificationsEnabled: notification.enableToasts,
        notificationTypeOrder: safeObject(notification.types).order,
        notificationTypeMessage: safeObject(notification.types).message,
        notificationTypeSystem: safeObject(notification.types).system,
        notificationTypeCommunity: safeObject(notification.types).community,
      }
    : {
        emailNotifications: notification.email,
        pushNotifications: notification.push,
        saleNotifications: notification.sales,
        offerNotifications: notification.offers,
        followerNotifications: notification.followers,
      };

  const themeMode = toThemeMode(ui.theme);

  return buildStoredSettingsRecord({
    ...fallback,
    ...notificationPatch,
    darkMode: themeMode === null ? fallback.darkMode : themeMode,
    currency: typeof ui.currency === 'string' ? ui.currency : fallback.currency,
    language: typeof ui.language === 'string' ? ui.language : fallback.language,
    showActivity: privacy.showActivity,
    showBalance: privacy.showBalance,
    showFollowers: privacy.showFollowers,
    updatedAt: row.updated_at ? Date.parse(row.updated_at) : fallback.updatedAt,
  });
}

function profileDisplayLanguage(settings: UserAppSettings): 'en' | 'vi' {
  return settings.language.toLowerCase().startsWith('vi') ? 'vi' : 'en';
}

function profileDisplayCurrency(settings: UserAppSettings): 'ETH' | 'USD' {
  return settings.currency === 'ETH' ? 'ETH' : 'USD';
}

async function resolveRemoteProfileId(address: string): Promise<string | null> {
  const normalized = normalizeWallet(address);
  if (!normalized) return null;
  return (
    getCachedRemoteProfileId(normalized) ||
    await ensureRemoteProfileIdForWallet(normalized)
  );
}

export function appSettingsToNotificationPreferences(settings: UserAppSettings): NotificationPreferences {
  return {
    enableDesktop: settings.desktopNotificationsEnabled,
    enableSound: settings.soundNotificationsEnabled,
    enableToasts: settings.toastNotificationsEnabled,
    types: {
      order: settings.notificationTypeOrder,
      message: settings.notificationTypeMessage,
      system: settings.notificationTypeSystem,
      community: settings.notificationTypeCommunity,
    },
  };
}

export function mergeNotificationPreferencesIntoAppSettings(
  base: UserAppSettings,
  preferences: NotificationPreferences
): UserAppSettings {
  return {
    ...base,
    desktopNotificationsEnabled: preferences.enableDesktop,
    soundNotificationsEnabled: preferences.enableSound,
    toastNotificationsEnabled: preferences.enableToasts,
    notificationTypeOrder: preferences.types.order,
    notificationTypeMessage: preferences.types.message,
    notificationTypeSystem: preferences.types.system,
    notificationTypeCommunity: preferences.types.community ?? true,
  };
}

export function appSettingsToProfileSettings(settings: UserAppSettings): UserProfile['settings'] {
  return {
    notifications: {
      email: settings.emailNotifications,
      push: settings.pushNotifications,
      sales: settings.saleNotifications,
      offers: settings.offerNotifications,
      followers: settings.followerNotifications,
    },
    privacy: {
      showActivity: settings.showActivity,
      showBalance: settings.showBalance,
      showFollowers: settings.showFollowers,
    },
    display: {
      theme: settings.darkMode ? 'dark' : 'light',
      currency: profileDisplayCurrency(settings),
      language: profileDisplayLanguage(settings),
    },
  };
}

export function mergeProfileSettingsIntoAppSettings(
  base: UserAppSettings,
  profileSettings: UserProfile['settings']
): UserAppSettings {
  return {
    ...base,
    emailNotifications: profileSettings.notifications.email,
    pushNotifications: profileSettings.notifications.push,
    saleNotifications: profileSettings.notifications.sales,
    offerNotifications: profileSettings.notifications.offers,
    followerNotifications: profileSettings.notifications.followers,
    showActivity: profileSettings.privacy.showActivity,
    showBalance: profileSettings.privacy.showBalance,
    showFollowers: profileSettings.privacy.showFollowers,
    darkMode: profileSettings.display.theme === 'dark',
    currency: profileSettings.display.currency,
    language: profileSettings.display.language === 'vi' ? 'vi' : 'en-US',
  };
}

function saveLocalSettings(address: string, settings: StoredUserAppSettingsRecord): StoredUserAppSettingsRecord {
  const normalizedWallet = normalizeWallet(address);
  const key = getWalletSettingsKey(normalizedWallet);
  if (!key) return settings;
  const normalized = buildStoredSettingsRecord(settings as unknown as Record<string, unknown>);
  localStorage.setItem(key, JSON.stringify(normalized));
  dispatchSyncEvent(USER_SETTINGS_SYNC_EVENT);
  return normalized;
}

export function hasLocalUserAppSettings(address?: string | null): boolean {
  if (typeof window === 'undefined') return false;
  const key = getWalletSettingsKey(address);
  if (!key) return false;
  return window.localStorage.getItem(key) !== null;
}

export function readLocalUserAppSettings(address?: string | null): StoredUserAppSettingsRecord {
  if (typeof window === 'undefined') {
    return {
      ...DEFAULT_USER_APP_SETTINGS,
      updatedAt: Date.now(),
    };
  }

  const key = getWalletSettingsKey(address);
  if (!key) {
    return {
      ...DEFAULT_USER_APP_SETTINGS,
      updatedAt: Date.now(),
    };
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return {
        ...DEFAULT_USER_APP_SETTINGS,
        updatedAt: Date.now(),
      };
    }
    return buildStoredSettingsRecord(JSON.parse(raw) as Record<string, unknown>);
  } catch {
    return {
      ...DEFAULT_USER_APP_SETTINGS,
      updatedAt: Date.now(),
    };
  }
}

export function settingsRecordToAppSettings(record: StoredUserAppSettingsRecord): UserAppSettings {
  const { updatedAt: _updatedAt, ...settings } = record;
  return settings;
}

export async function hydrateUserAppSettingsFromSupabase(address?: string | null): Promise<StoredUserAppSettingsRecord> {
  const normalizedWallet = normalizeWallet(address);
  const local = readLocalUserAppSettings(normalizedWallet);
  if (!normalizedWallet || settingsHydrateInFlight.has(normalizedWallet) || !isSupabaseRestEnabled()) {
    return local;
  }

  settingsHydrateInFlight.add(normalizedWallet);
  try {
    const userId = await resolveRemoteProfileId(normalizedWallet);
    if (!userId) return local;

    const [rows, legacyRows] = await Promise.all([
      restSelect<DbUserAppSettingsRow>(
        'user_app_settings',
        toQuery({
          select: 'user_id,notification_settings,privacy_settings,security_settings,display_settings,region_settings,created_at,updated_at',
          user_id: encodeEq(userId),
          limit: '1',
        })
      ).catch(() => []),
      restSelect<DbLegacyUserPreferencesRow>(
        'user_preferences',
        toQuery({
          select: 'user_id,notification_settings,ui_preferences,privacy_settings,created_at,updated_at',
          user_id: encodeEq(userId),
          limit: '1',
        })
      ).catch(() => []),
    ]);
    const row = rows[0];
    const legacyRow = legacyRows[0];
    if (!row && !legacyRow) return local;

    const remote = row
      ? mapDbRowToStoredSettings(row)
      : mapLegacyUserPreferencesRowToStoredSettings(legacyRow as DbLegacyUserPreferencesRow, local);
    const nextBase = (remote.updatedAt || 0) >= (local.updatedAt || 0) ? remote : local;
    const next: StoredUserAppSettingsRecord = {
      ...nextBase,
      // Theme is runtime-first and may change outside Settings.
      // Never let a stale remote settings row flip the active wallet theme on hydrate.
      darkMode: local.darkMode,
    };
    saveLocalSettings(normalizedWallet, next);
    return next;
  } catch (error) {
    console.debug('[UserSettings] Supabase hydrate skipped:', error);
    return local;
  } finally {
    settingsHydrateInFlight.delete(normalizedWallet);
  }
}

export async function saveUserAppSettings(
  address: string,
  settings: UserAppSettings
): Promise<{ settings: StoredUserAppSettingsRecord; remoteSynced: boolean }> {
  if (shouldBlockGuestWrite('saveUserAppSettings')) {
    throw new Error('Guest mode is read only');
  }

  const normalizedWallet = normalizeWallet(address);
  if (!normalizedWallet) {
    throw new Error('No wallet connected');
  }

  const nextRecord = saveLocalSettings(normalizedWallet, {
    ...buildStoredSettingsRecord(settings as unknown as Record<string, unknown>),
    updatedAt: Date.now(),
  });

  if (!isSupabaseRestEnabled()) {
    return { settings: nextRecord, remoteSynced: false };
  }

  try {
    const userId = await resolveRemoteProfileId(normalizedWallet);
    if (!userId) {
      return { settings: nextRecord, remoteSynced: false };
    }

    await restUpsert(
      'user_app_settings',
      [buildDbRow(userId, nextRecord)],
      { onConflict: 'user_id' }
    );

    return { settings: nextRecord, remoteSynced: true };
  } catch (error) {
    console.debug('[UserSettings] Supabase sync skipped:', error);
    return { settings: nextRecord, remoteSynced: false };
  }
}

export async function patchUserAppSettings(
  address: string,
  patch: Partial<UserAppSettings>
): Promise<{ settings: StoredUserAppSettingsRecord; remoteSynced: boolean }> {
  const current = settingsRecordToAppSettings(readLocalUserAppSettings(address));
  return saveUserAppSettings(address, { ...current, ...patch });
}
