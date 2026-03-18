import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';
import { AppNotification, NotificationPreferences, NotificationType } from '@/types/notifications';
import {
  loadNotifications,
  saveNotifications,
  saveNotificationsLocalOnly,
  loadPreferences,
  savePreferences,
  createNotification,
  showDesktopNotification,
  playNotificationSound,
  getUnreadCount,
  sortNotifications,
  markNotificationReadRemote,
  markAllNotificationsReadRemote,
  hydrateNotificationsFromSupabase,
} from '@/utils/notifications';
import { exchangeWalletAuthForSupabaseClaimSession } from '@/utils/supabaseAuthClaimBridge';
import { hydrateUserAppSettingsFromSupabase } from '@/utils/userSettingsUtils';

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  preferences: NotificationPreferences;
  addNotification: (
    type: NotificationType,
    title: string,
    message: string,
    metadata?: AppNotification['metadata']
  ) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;
  updatePreferences: (preferences: Partial<NotificationPreferences>) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

function areNotificationsEquivalent(a: AppNotification[], b: AppNotification[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (!x || !y) return false;
    if (
      x.id !== y.id ||
      !!x.read !== !!y.read ||
      x.timestamp !== y.timestamp ||
      x.type !== y.type ||
      x.title !== y.title ||
      x.message !== y.message
    ) {
      return false;
    }
  }
  return true;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  // ✅ PHASE 1: Get wallet address for address-based storage
  const { address } = useAccount();
  
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const skipNextPersistRef = useRef(false);
  const persistLocalOnlyNextRef = useRef(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>(() => {
    // Load preferences on mount (only if address exists)
    return address ? loadPreferences(address) : {
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
  });

  // Load notifications when address changes
  useEffect(() => {
    if (!address) {
      setNotifications([]);
      skipNextPersistRef.current = true;
      setPreferences({
        enableDesktop: true,
        enableSound: false,
        enableToasts: true,
        types: {
          order: true,
          message: true,
          system: true,
          community: true,
        },
      });
      return;
    }

    const refreshNotifications = () => {
      const loaded = loadNotifications(address);
      const next = sortNotifications(loaded);
      setNotifications((prev) => {
        if (areNotificationsEquivalent(prev, next)) return prev;
        skipNextPersistRef.current = true;
        return next;
      });
    };
    const refreshPreferences = () => {
      setPreferences(loadPreferences(address));
    };
    let cancelled = false;
    const hydrateNotifications = async () => {
      await exchangeWalletAuthForSupabaseClaimSession(address).catch(() => {
        // H3 bridge may be disabled/unavailable; remote hydrate will gracefully fall back.
      });
      await hydrateNotificationsFromSupabase(address).catch(() => {
        // Remote hydrate is best-effort only.
      });
      if (!cancelled) refreshNotifications();
    };
    const hydratePreferences = async () => {
      await hydrateUserAppSettingsFromSupabase(address).catch(() => {
        // Remote hydrate is best-effort only.
      });
      if (!cancelled) refreshPreferences();
    };

    refreshPreferences();
    refreshNotifications();
    void hydratePreferences();
    void hydrateNotifications();
    window.addEventListener('focus', refreshNotifications);
    window.addEventListener('storage', refreshNotifications);
    window.addEventListener('orina:notifications-changed', refreshNotifications as EventListener);
    window.addEventListener('orina:notification-preferences-changed', refreshPreferences as EventListener);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', refreshNotifications);
      window.removeEventListener('storage', refreshNotifications);
      window.removeEventListener('orina:notifications-changed', refreshNotifications as EventListener);
      window.removeEventListener('orina:notification-preferences-changed', refreshPreferences as EventListener);
    };
  }, [address]);

  // Save notifications whenever they change (only if address exists)
  useEffect(() => {
    if (!address) return;
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      return;
    }
    if (persistLocalOnlyNextRef.current) {
      persistLocalOnlyNextRef.current = false;
      saveNotificationsLocalOnly(address, notifications);
      return;
    }
    saveNotifications(address, notifications);
  }, [notifications, address]);

  // Calculate unread count
  const unreadCount = getUnreadCount(notifications);

  /**
   * Add a new notification
   */
  const addNotification = useCallback(
    (
      type: NotificationType,
      title: string,
      message: string,
      metadata?: AppNotification['metadata']
    ) => {
      const notification = createNotification(type, title, message, metadata);

      // Add to state
      setNotifications((prev) => sortNotifications([notification, ...prev]));

      // Show toast if enabled
      if (preferences.enableToasts && preferences.types[type as keyof typeof preferences.types] !== false) {
        switch (type) {
          case 'success':
            toast.success(title, { description: message });
            break;
          case 'error':
            toast.error(title, { description: message });
            break;
          case 'warning':
            toast.warning(title, { description: message });
            break;
          default:
            toast(title, { description: message });
        }
      }

      // Show desktop notification if enabled
      if (preferences.enableDesktop && preferences.types[type as keyof typeof preferences.types] !== false) {
        showDesktopNotification(title, message);
      }

      // Play sound if enabled
      if (preferences.enableSound) {
        playNotificationSound();
      }
    },
    [preferences]
  );

  /**
   * Mark notification as read
   */
  const markAsRead = useCallback((id: string) => {
    persistLocalOnlyNextRef.current = true;
    setNotifications((prev) =>
      prev.map((n) => (n.id === id && !n.read ? { ...n, read: true } : n))
    );
    if (address) {
      void markNotificationReadRemote(address, id);
    }
  }, [address]);

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(() => {
    persistLocalOnlyNextRef.current = true;
    setNotifications((prev) => prev.map((n) => (n.read ? n : { ...n, read: true })));
    if (address) {
      void markAllNotificationsReadRemote(address);
    }
  }, [address]);

  /**
   * Delete a notification
   */
  const deleteNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  /**
   * Clear all notifications
   */
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  /**
   * Update preferences
   */
  const updatePreferences = useCallback((newPreferences: Partial<NotificationPreferences>) => {
    if (!address) return;
    
    setPreferences((prev) => {
      const updated = { ...prev, ...newPreferences };
      savePreferences(address, updated);
      return updated;
    });
  }, [address]);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    preferences,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    updatePreferences,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

/**
 * Hook to use notification context
 */
export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}
