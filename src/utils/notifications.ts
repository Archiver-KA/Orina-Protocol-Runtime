/**
 * @deprecated Phase 3 - Hybrid wallet data: Notifications.
 * localStorage persistence should migrate to remote-first via the
 * notifications table server table.
 * See spec: 15-local-api-audit-and-server-migration-plan.md
 */
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
import { ensureRemoteProfileIdForWallet, getCachedRemoteProfileId } from '@/utils/profileRemoteIdentity';
import {
  appSettingsToNotificationPreferences,
  mergeNotificationPreferencesIntoAppSettings,
  readLocalUserAppSettings,
  saveUserAppSettings,
  settingsRecordToAppSettings,
} from '@/utils/userSettingsUtils';

// 🔒 PHASE 1 FIX: Address-based storage for privacy isolation
// REMOVED: Legacy localStorage keys — data now fully server-side via notifications table
// const LEGACY_STORAGE_KEY = 'studio_notifications';
// const LEGACY_PREFERENCES_KEY = 'studio_notification_preferences';
const NOTIFICATION_SOURCE_TYPE = 'atp2_app_v1';
const NOTIFICATIONS_SYNC_EVENT = 'orina:notifications-changed';
const PREFERENCES_SYNC_EVENT = 'orina:notification-preferences-changed';
const notifSyncTimers = new Map<string, number>();
const notifHydrateInFlight = new Set<string>();

function normalizeNotificationType(value: unknown): NotificationType {
  switch (value) {
    case 'order':
    case 'message':
    case 'system':
    case 'success':
    case 'warning':
    case 'error':
    case 'community':
      return value;
    default:
      return 'system';
  }
}

function normalizeStoredNotification(value: unknown): AppNotification | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const id = normalizeNotificationSourceId(raw.id) || generateNotificationId();
  const title = typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : 'Notification';
  const message = typeof raw.message === 'string' ? raw.message : '';
  const timestamp = Number(raw.timestamp);

  return {
    id,
    type: normalizeNotificationType(raw.type),
    title,
    message,
    timestamp: Number.isFinite(timestamp) ? timestamp : Date.now(),
    read: !!raw.read,
    actionUrl: typeof raw.actionUrl === 'string' ? raw.actionUrl : undefined,
    metadata: normalizeNotificationMetadata(raw.metadata as AppNotification['metadata']),
  };
}

function normalizeNotificationSourceId(value: unknown): string | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  return raw.slice(0, 200);
}

function normalizeNotificationEventCode(value: unknown): string | null {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return null;
  return raw.replace(/[^a-z0-9:_-]+/g, '_').slice(0, 120);
}

function normalizeNotificationMetadata(
  metadata?: AppNotification['metadata']
): AppNotification['metadata'] | undefined {
  if (!metadata || typeof metadata !== 'object') return metadata;

  const sourceId =
    normalizeNotificationSourceId((metadata as any).sourceId) ??
    normalizeNotificationSourceId((metadata as any).source_id);
  const eventCode =
    normalizeNotificationEventCode((metadata as any).eventCode) ??
    normalizeNotificationEventCode((metadata as any).event_code);

  const next: AppNotification['metadata'] = {
    ...metadata,
  };

  if (sourceId) {
    (next as any).sourceId = sourceId;
    (next as any).source_id = sourceId;
  }
  if (eventCode) {
    (next as any).eventCode = eventCode;
    (next as any).event_code = eventCode;
  }

  if ((next as any).actorAddress) {
    (next as any).actorAddress = String((next as any).actorAddress).toLowerCase();
  }
  if ((next as any).targetAddress) {
    (next as any).targetAddress = String((next as any).targetAddress).toLowerCase();
  }

  return next;
}

export function buildNotificationSourceId(
  eventCode: string,
  parts: Array<string | number | null | undefined>
): string {
  const code = normalizeNotificationEventCode(eventCode) || 'event';
  const normalizedParts = parts
    .map((part) => String(part ?? '').trim().toLowerCase())
    .filter(Boolean)
    .map((part) => part.replace(/[^a-z0-9:_-]+/g, '_'))
    .slice(0, 8);
  return normalizeNotificationSourceId([code, ...normalizedParts].join(':')) || generateNotificationId();
}

function dedupeNotificationsById(notifications: AppNotification[]): AppNotification[] {
  const map = new Map<string, AppNotification>();

  for (const item of sortNotifications(notifications)) {
    if (!item) continue;
    const normalizedMetadata = normalizeNotificationMetadata(item.metadata);
    const key =
      normalizeNotificationSourceId(item.id) ??
      normalizeNotificationSourceId((normalizedMetadata as any)?.sourceId) ??
      generateNotificationId();

    const nextItem: AppNotification = {
      ...item,
      id: key,
      metadata: normalizedMetadata,
    };

    const existing = map.get(key);
    if (!existing) {
      map.set(key, nextItem);
      continue;
    }

    map.set(key, {
      ...existing,
      ...nextItem,
      id: key,
      timestamp: Math.max(Number(existing.timestamp || 0), Number(nextItem.timestamp || 0)),
      read: !!existing.read || !!nextItem.read,
      metadata: {
        ...(existing.metadata || {}),
        ...(nextItem.metadata || {}),
      },
    });
  }

  return sortNotifications(Array.from(map.values())).slice(0, 100);
}

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
    // In-memory cache via sessionStorage for tab persistence, no localStorage
    const stored = (typeof sessionStorage !== 'undefined') ? sessionStorage.getItem(key) : null;
    const parsed = stored ? JSON.parse(stored) : [];
    const normalized = Array.isArray(parsed)
      ? parsed
          .map(normalizeStoredNotification)
          .filter((item): item is AppNotification => !!item)
      : [];
    return normalized;
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

export function appendNotification(
  walletAddress: string,
  notification: AppNotification,
  options?: {
    syncRemote?: boolean;
    limit?: number;
  }
): AppNotification[] {
  const limit = options?.limit ?? 100;
  const existing = loadNotificationsLocalOnly(walletAddress);
  const updated = dedupeNotificationsById([notification, ...existing]).slice(0, limit);

  if (options?.syncRemote === false) {
    saveNotificationsLocalOnly(walletAddress, updated);
  } else {
    saveNotifications(walletAddress, updated);
  }

  return updated;
}

function saveNotificationsInternal(walletAddress: string, notifications: AppNotification[], skipRemoteSync: boolean): void {
  try {
    const normalized = dedupeNotificationsById(notifications || []);
    const key = getNotificationsKey(walletAddress);
    // Tab-session cache only, no localStorage
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(key, JSON.stringify(normalized));
    }
    dispatchSyncEvent(NOTIFICATIONS_SYNC_EVENT);
    if (walletAddress && !skipRemoteSync) {
      queueNotificationsSync(walletAddress, normalized);
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
    if (!walletAddress) return getDefaultPreferences();
    const currentSettings = settingsRecordToAppSettings(readLocalUserAppSettings(walletAddress));
    return appSettingsToNotificationPreferences(currentSettings);
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
    if (walletAddress) {
      const currentSettings = settingsRecordToAppSettings(readLocalUserAppSettings(walletAddress));
      void saveUserAppSettings(walletAddress, mergeNotificationPreferencesIntoAppSettings(currentSettings, preferences));
    }
    dispatchSyncEvent(PREFERENCES_SYNC_EVENT);
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

function normalizeWalletKey(walletAddress: string): string {
  return String(walletAddress || '').toLowerCase();
}

function mapDbNotificationsToApp(rows: DbNotificationRow[]): AppNotification[] {
  return rows
    .map((row) => {
      const normalizedMetadata = normalizeNotificationMetadata((row.payload || {}) as AppNotification['metadata']);
      return {
      id: normalizeNotificationSourceId(row.source_id) || row.id,
      type: (row.type as NotificationType) || 'system',
      title: row.title || 'Notification',
      message: row.body || '',
      timestamp: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
      read: !!row.is_read,
      metadata: normalizedMetadata,
    };
    })
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

export async function hydrateNotificationsFromSupabase(walletAddress: string): Promise<void> {
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
    const existingList = loadNotificationsLocalOnly(walletKey);

    const remoteById = new Map<string, AppNotification>(
      mapped.filter((n) => n?.id).map((n) => [String(n.id), n])
    );

    for (const localNotif of existingList) {
      if (!localNotif?.id) continue;
      const key = String(localNotif.id);
      const remoteNotif = remoteById.get(key);
      if (!remoteNotif) continue;
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
    saveNotificationsLocalOnly(walletKey, merged);
  } catch (error) {
    console.debug('[Notifications] Supabase hydrate skipped:', error);
  } finally {
    notifHydrateInFlight.delete(walletKey);
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
  const normalizedMetadata = normalizeNotificationMetadata(metadata);
  const sourceId =
    normalizeNotificationSourceId((normalizedMetadata as any)?.sourceId) ??
    normalizeNotificationSourceId((normalizedMetadata as any)?.source_id);

  return {
    id: sourceId || generateNotificationId(),
    type,
    title,
    message,
    timestamp: Date.now(),
    read: false,
    metadata: normalizedMetadata,
  };
}

/**
 * 🔄 MIGRATION: Migrate notifications from legacy storage to address-based storage
 * @param walletAddress - The wallet address to migrate data for
 * @param userId - The legacy userId (if available for filtering)
 */
/**
 * @deprecated Legacy migration removed. Notifications now fully server-side.
 */
export function migrateNotificationsToAddressBased(_walletAddress: string, _userId?: string): void {
  // No-op: legacy localStorage migration removed
}
