import { AppNotification, NotificationPreferences, NotificationType } from '@/types/notifications';
import {
  dispatchSyncEvent,
  encodeEq,
  restDelete,
  restPatch,
  restSelect,
  restUpsert,
  toQuery,
} from '@/utils/supabaseRest';
import { ensureRemoteProfileIdForWallet, getCachedRemoteProfileId } from '@/utils/profileUtils';

// 🔒 PHASE 1 FIX: Address-based storage for privacy isolation
const LEGACY_STORAGE_KEY = 'studio_notifications'; // For migration
const LEGACY_PREFERENCES_KEY = 'studio_notification_preferences';
const NOTIFICATION_SOURCE_TYPE = 'atp2_app_v1';
const NOTIFICATIONS_SYNC_EVENT = 'orina:notifications-changed';
const PREFERENCES_SYNC_EVENT = 'orina:notification-preferences-changed';
const notifSyncTimers = new Map<string, number>();
const prefSyncTimers = new Map<string, number>();
const notifHydrateInFlight = new Set<string>();
const prefHydrateInFlight = new Set<string>();

/**
 * Get storage keys (address-based)
 */
function getNotificationsKey(walletAddress: string): string {
  return `orina_notifications_${walletAddress.toLowerCase()}`;
}

function getPreferencesKey(walletAddress: string): string {
  return `orina_notification_prefs_${walletAddress.toLowerCase()}`;
}

/**
 * Generate unique notification ID
 */
export function generateNotificationId(): string {
  return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Load notifications for a specific wallet address
 * @param walletAddress - The wallet address to load notifications for
 */
export function loadNotifications(walletAddress: string): AppNotification[] {
  return loadNotificationsInternal(walletAddress, false);
}

export function loadNotificationsLocalOnly(walletAddress: string): AppNotification[] {
  return loadNotificationsInternal(walletAddress, true);
}

function loadNotificationsInternal(walletAddress: string, skipHydrate: boolean): AppNotification[] {
  try {
    const key = getNotificationsKey(walletAddress);
    const stored = localStorage.getItem(key);
    const parsed = stored ? JSON.parse(stored) : [];
    if (walletAddress && !skipHydrate) {
      void hydrateNotificationsFromSupabase(walletAddress);
    }
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('[Notifications] Failed to load:', error);
    return [];
  }
}

/**
 * Save notifications for a specific wallet address
 * @param walletAddress - The wallet address to save notifications for
 * @param notifications - The notifications to save
 */
export function saveNotifications(walletAddress: string, notifications: AppNotification[]): void {
  saveNotificationsInternal(walletAddress, notifications, false);
}

export function saveNotificationsLocalOnly(walletAddress: string, notifications: AppNotification[]): void {
  saveNotificationsInternal(walletAddress, notifications, true);
}

function saveNotificationsInternal(walletAddress: string, notifications: AppNotification[], skipRemoteSync: boolean): void {
  try {
    const key = getNotificationsKey(walletAddress);
    localStorage.setItem(key, JSON.stringify(notifications));
    dispatchSyncEvent(NOTIFICATIONS_SYNC_EVENT);
    if (walletAddress && !skipRemoteSync) {
      queueNotificationsSync(walletAddress, notifications);
    }
  } catch (error) {
    console.error('[Notifications] Failed to save:', error);
  }
}

/**
 * Load notification preferences for a specific wallet address
 * @param walletAddress - The wallet address to load preferences for
 */
export function loadPreferences(walletAddress: string): NotificationPreferences {
  try {
    const key = getPreferencesKey(walletAddress);
    const stored = localStorage.getItem(key);
    const parsed = stored ? { ...getDefaultPreferences(), ...JSON.parse(stored) } : getDefaultPreferences();
    if (walletAddress) {
      void hydratePreferencesFromSupabase(walletAddress);
    }
    return parsed;
  } catch (error) {
    console.error('[Notifications] Failed to load preferences:', error);
    return getDefaultPreferences();
  }
}

/**
 * Save notification preferences for a specific wallet address
 * @param walletAddress - The wallet address to save preferences for
 * @param preferences - The preferences to save
 */
export function savePreferences(walletAddress: string, preferences: NotificationPreferences): void {
  try {
    const key = getPreferencesKey(walletAddress);
    localStorage.setItem(key, JSON.stringify(preferences));
    dispatchSyncEvent(PREFERENCES_SYNC_EVENT);
    if (walletAddress) {
      queuePreferencesSync(walletAddress, preferences);
    }
  } catch (error) {
    console.error('[Notifications] Failed to save preferences:', error);
  }
}

/**
 * Get default preferences
 */
export function getDefaultPreferences(): NotificationPreferences {
  return {
    enableDesktop: true,
    enableSound: false,
    enableToasts: true,
    types: {
      order: true,
      message: true,
      system: true,
      community: true,
    },
  };
}

type DbNotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title: string | null;
  body: string | null;
  payload: Record<string, any> | null;
  source_type: string | null;
  source_id: string | null;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
};

type DbUserPreferencesRow = {
  user_id: string;
  notification_settings: Record<string, any>;
  ui_preferences: Record<string, any>;
  privacy_settings: Record<string, any>;
};

function normalizeWalletKey(walletAddress: string): string {
  return String(walletAddress || '').toLowerCase();
}

function mapDbNotificationsToApp(rows: DbNotificationRow[]): AppNotification[] {
  return rows
    .map((row) => ({
      id: row.source_id || row.id,
      type: (row.type as NotificationType) || 'system',
      title: row.title || 'Notification',
      message: row.body || '',
      timestamp: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
      read: !!row.is_read,
      metadata: (row.payload || {}) as AppNotification['metadata'],
    }))
    .sort((a, b) => b.timestamp - a.timestamp);
}

function mapAppNotificationsToDb(userId: string, notifications: AppNotification[]) {
  return notifications.slice(0, 100).map((n) => ({
    user_id: userId,
    type: n.type || 'system',
    title: n.title || null,
    body: n.message || null,
    payload: n.metadata || {},
    source_type: NOTIFICATION_SOURCE_TYPE,
    source_id: n.id,
    is_read: !!n.read,
    created_at: new Date(n.timestamp || Date.now()).toISOString(),
    read_at: n.read ? new Date(n.timestamp || Date.now()).toISOString() : null,
  }));
}

async function hydrateNotificationsFromSupabase(walletAddress: string): Promise<void> {
  const walletKey = normalizeWalletKey(walletAddress);
  if (!walletKey || notifHydrateInFlight.has(walletKey)) return;
  notifHydrateInFlight.add(walletKey);
  try {
    const userId = getCachedRemoteProfileId(walletKey) || await ensureRemoteProfileIdForWallet(walletKey);
    if (!userId) return;
    const rows = await restSelect<DbNotificationRow>(
      'notifications',
      toQuery({
        select: '*',
        user_id: encodeEq(userId),
        source_type: encodeEq(NOTIFICATION_SOURCE_TYPE),
        order: 'created_at.desc',
        limit: '100',
      })
    );
    const mapped = mapDbNotificationsToApp(rows);
    const existingRaw = localStorage.getItem(getNotificationsKey(walletKey));
    const existing = existingRaw ? JSON.parse(existingRaw) : [];
    const existingList = Array.isArray(existing) ? (existing as AppNotification[]) : [];

    const remoteById = new Map<string, AppNotification>(
      mapped.filter((n) => n?.id).map((n) => [String(n.id), n])
    );

    for (const localNotif of existingList) {
      if (!localNotif?.id) continue;
      const key = String(localNotif.id);
      const remoteNotif = remoteById.get(key);
      if (!remoteNotif) continue;
      // Preserve local read-state immediately after user actions while remote sync catches up.
      // This avoids unread badges/items "coming back" on refresh in non-realtime mode.
      remoteById.set(key, {
        ...remoteNotif,
        read: !!remoteNotif.read || !!localNotif.read,
      });
    }

    const remoteIds = new Set(remoteById.keys());
    const localOnly = existingList.filter((n) => n?.id && !remoteIds.has(String(n.id)));
    const merged = [...Array.from(remoteById.values()), ...localOnly]
      .sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0))
      .slice(0, 100);
    localStorage.setItem(getNotificationsKey(walletKey), JSON.stringify(merged));
    dispatchSyncEvent(NOTIFICATIONS_SYNC_EVENT);
  } catch (error) {
    console.debug('[Notifications] Supabase hydrate skipped:', error);
  } finally {
    notifHydrateInFlight.delete(walletKey);
  }
}

async function hydratePreferencesFromSupabase(walletAddress: string): Promise<void> {
  const walletKey = normalizeWalletKey(walletAddress);
  if (!walletKey || prefHydrateInFlight.has(walletKey)) return;
  prefHydrateInFlight.add(walletKey);
  try {
    const userId = getCachedRemoteProfileId(walletKey) || await ensureRemoteProfileIdForWallet(walletKey);
    if (!userId) return;
    const rows = await restSelect<DbUserPreferencesRow>(
      'user_preferences',
      toQuery({ select: 'user_id,notification_settings,ui_preferences,privacy_settings', user_id: encodeEq(userId), limit: '1' })
    );
    const row = rows[0];
    if (!row) return;
    const merged: NotificationPreferences = {
      ...getDefaultPreferences(),
      ...(row.notification_settings || {}),
      types: {
        ...getDefaultPreferences().types,
        ...((row.notification_settings || {}).types || {}),
      },
    };
    localStorage.setItem(getPreferencesKey(walletKey), JSON.stringify(merged));
    dispatchSyncEvent(PREFERENCES_SYNC_EVENT);
  } catch (error) {
    console.debug('[Notifications] Preferences hydrate skipped:', error);
  } finally {
    prefHydrateInFlight.delete(walletKey);
  }
}

function queueNotificationsSync(walletAddress: string, notifications: AppNotification[]): void {
  const walletKey = normalizeWalletKey(walletAddress);
  if (!walletKey) return;
  const prev = notifSyncTimers.get(walletKey);
  if (prev) window.clearTimeout(prev);
  const timer = window.setTimeout(() => {
    notifSyncTimers.delete(walletKey);
    void syncNotificationsToSupabase(walletKey, notifications);
  }, 250);
  notifSyncTimers.set(walletKey, timer);
}

function queuePreferencesSync(walletAddress: string, preferences: NotificationPreferences): void {
  const walletKey = normalizeWalletKey(walletAddress);
  if (!walletKey) return;
  const prev = prefSyncTimers.get(walletKey);
  if (prev) window.clearTimeout(prev);
  const timer = window.setTimeout(() => {
    prefSyncTimers.delete(walletKey);
    void syncPreferencesToSupabase(walletKey, preferences);
  }, 250);
  prefSyncTimers.set(walletKey, timer);
}

async function syncNotificationsToSupabase(walletAddress: string, notifications: AppNotification[]): Promise<void> {
  try {
    const userId = await ensureRemoteProfileIdForWallet(walletAddress);
    if (!userId) return;
    await restDelete(
      'notifications',
      toQuery({
        user_id: encodeEq(userId),
        source_type: encodeEq(NOTIFICATION_SOURCE_TYPE),
      })
    );
    const rows = mapAppNotificationsToDb(userId, notifications);
    if (rows.length > 0) {
      await restUpsert('notifications', rows);
    }
  } catch (error) {
    console.debug('[Notifications] Supabase sync skipped:', error);
  }
}

export async function markNotificationReadRemote(walletAddress: string, notificationId: string): Promise<void> {
  try {
    const walletKey = normalizeWalletKey(walletAddress);
    const userId = getCachedRemoteProfileId(walletKey) || await ensureRemoteProfileIdForWallet(walletKey);
    if (!userId || !notificationId) return;
    await restPatch(
      'notifications',
      toQuery({
        user_id: encodeEq(userId),
        source_type: encodeEq(NOTIFICATION_SOURCE_TYPE),
        source_id: encodeEq(notificationId),
      }),
      {
        is_read: true,
        read_at: new Date().toISOString(),
      }
    );
  } catch (error) {
    console.debug('[Notifications] markNotificationReadRemote skipped:', error);
  }
}

export async function markAllNotificationsReadRemote(walletAddress: string): Promise<void> {
  try {
    const walletKey = normalizeWalletKey(walletAddress);
    const userId = getCachedRemoteProfileId(walletKey) || await ensureRemoteProfileIdForWallet(walletKey);
    if (!userId) return;
    await restPatch(
      'notifications',
      toQuery({
        user_id: encodeEq(userId),
        source_type: encodeEq(NOTIFICATION_SOURCE_TYPE),
        is_read: encodeEq(false),
      }),
      {
        is_read: true,
        read_at: new Date().toISOString(),
      }
    );
  } catch (error) {
    console.debug('[Notifications] markAllNotificationsReadRemote skipped:', error);
  }
}

async function syncPreferencesToSupabase(walletAddress: string, preferences: NotificationPreferences): Promise<void> {
  try {
    const userId = await ensureRemoteProfileIdForWallet(walletAddress);
    if (!userId) return;
    await restUpsert(
      'user_preferences',
      [{
        user_id: userId,
        notification_settings: preferences,
        ui_preferences: {},
        privacy_settings: {},
      }],
      { onConflict: 'user_id' }
    );
  } catch (error) {
    console.debug('[Notifications] Preferences sync skipped:', error);
  }
}

/**
 * Request desktop notification permission
 */
export async function requestDesktopPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('Desktop notifications not supported');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

/**
 * Show desktop notification
 */
export function showDesktopNotification(
  title: string,
  body: string,
  icon?: string
): void {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    const notification = new Notification(title, {
      body,
      icon: icon || '/favicon.ico',
      badge: '/favicon.ico',
      tag: generateNotificationId(),
      requireInteraction: false,
    });

    // Auto close after 5 seconds
    setTimeout(() => notification.close(), 5000);
  } catch (error) {
    console.error('Failed to show desktop notification:', error);
  }
}

/**
 * Play notification sound
 */
export function playNotificationSound(): void {
  try {
    // Create a simple beep sound using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  } catch (error) {
    console.error('Failed to play notification sound:', error);
  }
}

/**
 * Get notification icon based on type
 */
export function getNotificationIcon(type: NotificationType): string {
  switch (type) {
    case 'order':
      return '📦';
    case 'message':
      return '💬';
    case 'system':
      return '⚙️';
    case 'success':
      return '✅';
    case 'warning':
      return '⚠️';
    case 'error':
      return '❌';
    case 'community':
      return '🔔';
    default:
      return '🔔';
  }
}

/**
 * Get notification color based on type
 */
export function getNotificationColor(type: NotificationType): {
  bg: string;
  border: string;
  text: string;
  icon: string;
} {
  switch (type) {
    case 'order':
      return {
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/30',
        text: 'text-blue-400',
        icon: 'text-blue-400',
      };
    case 'message':
      return {
        bg: 'bg-[#2CC295]/10',
        border: 'border-[#2CC295]/30',
        text: 'text-[#2CC295]',
        icon: 'text-[#2CC295]',
      };
    case 'system':
      return {
        bg: 'bg-zinc-500/10',
        border: 'border-zinc-500/30',
        text: 'text-zinc-400',
        icon: 'text-zinc-400',
      };
    case 'success':
      return {
        bg: 'bg-green-500/10',
        border: 'border-green-500/30',
        text: 'text-green-400',
        icon: 'text-green-400',
      };
    case 'warning':
      return {
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        text: 'text-amber-400',
        icon: 'text-amber-400',
      };
    case 'error':
      return {
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
        text: 'text-red-400',
        icon: 'text-red-400',
      };
    case 'community':
      return {
        bg: 'bg-[#2CC295]/10',
        border: 'border-[#2CC295]/30',
        text: 'text-[#2CC295]',
        icon: 'text-[#2CC295]',
      };
    default:
      return {
        bg: 'bg-zinc-500/10',
        border: 'border-zinc-500/30',
        text: 'text-zinc-400',
        icon: 'text-zinc-400',
      };
  }
}

/**
 * Format relative time (e.g., "2m ago", "1h ago")
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return days === 1 ? '1 day ago' : `${days} days ago`;
  }
  if (hours > 0) {
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  }
  if (minutes > 0) {
    return minutes === 1 ? '1 min ago' : `${minutes} mins ago`;
  }
  return 'Just now';
}

/**
 * Sort notifications by timestamp (newest first)
 */
export function sortNotifications(notifications: AppNotification[]): AppNotification[] {
  return [...notifications].sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Filter notifications by type
 */
export function filterNotificationsByType(
  notifications: AppNotification[],
  type: NotificationType | 'all'
): AppNotification[] {
  if (type === 'all') return notifications;
  return notifications.filter((n) => n.type === type);
}

/**
 * Get unread count
 */
export function getUnreadCount(notifications: AppNotification[]): number {
  return notifications.filter((n) => !n.read).length;
}

/**
 * Create notification object
 */
export function createNotification(
  type: NotificationType,
  title: string,
  message: string,
  metadata?: AppNotification['metadata']
): AppNotification {
  return {
    id: generateNotificationId(),
    type,
    title,
    message,
    timestamp: Date.now(),
    read: false,
    metadata,
  };
}

/**
 * 🔄 MIGRATION: Migrate notifications from legacy storage to address-based storage
 * @param walletAddress - The wallet address to migrate data for
 * @param userId - The legacy userId (if available for filtering)
 */
export function migrateNotificationsToAddressBased(walletAddress: string, userId?: string): void {
  try {
    console.log(`[Notifications Migration] Starting migration for ${walletAddress}`);
    
    // Check if already migrated
    const newNotificationsKey = getNotificationsKey(walletAddress);
    const existing = localStorage.getItem(newNotificationsKey);
    if (existing && JSON.parse(existing).length > 0) {
      console.log(`[Notifications Migration] Already migrated (${JSON.parse(existing).length} notifications found)`);
      return;
    }
    
    // Load from legacy global storage
    const legacyNotifications = localStorage.getItem(LEGACY_STORAGE_KEY);
    const legacyPreferences = localStorage.getItem(LEGACY_PREFERENCES_KEY);
    
    // Migrate notifications
    if (legacyNotifications) {
      const allNotifications: AppNotification[] = JSON.parse(legacyNotifications);
      
      // For now, migrate ALL notifications to this user
      // In a real scenario, you'd filter by userId if available
      if (allNotifications.length > 0) {
        saveNotifications(walletAddress, allNotifications);
        console.log(`[Notifications Migration] ✅ Migrated ${allNotifications.length} notifications`);
      }
    }
    
    // Migrate preferences
    if (legacyPreferences) {
      const preferences: NotificationPreferences = JSON.parse(legacyPreferences);
      savePreferences(walletAddress, preferences);
      console.log(`[Notifications Migration] ✅ Migrated preferences`);
    }
    
    console.log(`[Notifications Migration] ✅ Migration complete for ${walletAddress}`);
  } catch (error) {
    console.error('[Notifications Migration] Failed:', error);
  }
}
