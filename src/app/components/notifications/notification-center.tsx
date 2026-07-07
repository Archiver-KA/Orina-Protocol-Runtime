import { Bell, X, Settings, Check, TrendingUp, MessageSquare, AlertCircle, Trash2 } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ToggleSwitch } from '@/app/components/ui/toggle-switch';
import { NotificationItem } from './notification-item';
import { NotificationBadge } from './notification-badge';
import { useNotifications } from '@/contexts/NotificationContext';
import { NotificationType } from '@/types/notifications';
import { filterNotificationsByType } from '@/utils/notifications';

interface NotificationCenterProps {
  className?: string;
}

export function NotificationCenter({ className = '' }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [filterType, setFilterType] = useState<NotificationType | 'all'>('all');
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const { 
    notifications, 
    unreadCount, 
    markAllAsRead, 
    clearAll,
    preferences,
    updatePreferences,
  } = useNotifications();

  const filteredNotifications = filterNotificationsByType(notifications, filterType);

  const handleToggle = () => {
    if (isOpen) {
      setIsOpen(false);
      setShowSettings(false);
    } else {
      setIsOpen(true);
    }
  };

  const handleMouseEnter = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false);
      setShowSettings(false);
    }, 120);
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all notifications?')) {
      clearAll();
    }
  };

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  // Filter pills với icons theo HTML template
  const filterOptions: { value: NotificationType | 'all'; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'order', label: 'Orders' },
    { value: 'message', label: 'Messages' },
    { value: 'system', label: 'System' },
    { value: 'community', label: 'Community' },
  ];

  return (
    <>
      {/* Notification Button */}
      <div className={`relative ${className}`} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        <button
          onClick={handleToggle}
          onMouseEnter={handleMouseEnter}
          className="group ui-control-surface relative flex h-[var(--t-shell-icon-button)] w-[var(--t-shell-icon-button)] items-center justify-center rounded-full"
          title="Notifications"
        >
          <Bell size={20} className="text-ui-muted transition-colors group-hover:text-ui-primary" />
          
          {unreadCount > 0 && (
            <div className="absolute -top-1 -right-1">
              <NotificationBadge count={unreadCount} size="sm" />
            </div>
          )}
        </button>

        {/* Dropdown Panel - 420px width theo HTML template */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 top-full mt-2 w-[470px] max-w-[calc(100vw-2rem)] z-50"
            >
              <div
                className="nativebar-dropdown-panel dropdown-panel overflow-hidden rounded-[var(--t-card-radius-lg)]"
                style={{
                  backdropFilter: 'blur(20px) saturate(140%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(140%)',
                }}
              >
                {/* Header */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Bell size={18} className="text-primary" />
                      <h3 className="text-label font-semibold text-ui-primary">Notifications</h3>
                      {unreadCount > 0 && (
                        <NotificationBadge count={unreadCount} size="sm" />
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1">
                      {/* Mark all as read */}
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllAsRead}
                          className="rounded-lg p-1.5 text-ui-muted transition-colors hover:bg-[var(--t-surface-5)] hover:text-ui-primary"
                          title="Mark all as read"
                        >
                          <Check size={16} />
                        </button>
                      )}

                      {/* Clear all */}
                      {notifications.length > 0 && (
                        <button
                          onClick={handleClearAll}
                          className="rounded-lg p-1.5 text-ui-muted transition-colors hover:bg-[var(--t-surface-5)] hover:text-ui-primary"
                          title="Clear all"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}

                      {/* Settings button */}
                      <button
                        onClick={() => setShowSettings(!showSettings)}
                        className={`ml-1 p-1.5 rounded-lg transition-colors ${
                          showSettings ? 'bg-[var(--t-surface-10)] text-ui-primary' : 'text-ui-muted hover:bg-[var(--t-surface-5)] hover:text-ui-primary'
                        }`}
                        title="Settings"
                      >
                        <Settings size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Filter pills */}
                  {!showSettings && (
                    <div className="flex flex-wrap items-center gap-2">
                      {filterOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setFilterType(option.value)}
                          className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border-0 ${
                            filterType === option.value
                              ? 'bg-[var(--t-surface-10)] text-ui-primary'
                              : 'bg-[var(--t-surface-5)] text-ui-muted hover:bg-[var(--t-surface-hover)] hover:text-ui-primary'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Settings Panel */}
                <AnimatePresence mode="wait">
                  {showSettings ? (
                    <motion.div
                      key="settings"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-4"
                    >
                      <h4 className="mb-4 text-section-header text-ui-primary">
                        Notification Preferences
                      </h4>

                      <div className="space-y-3">
                        {/* Toggle switches */}
                        <label className="flex items-center justify-between cursor-pointer group">
                          <span className="text-xs text-ui-secondary transition-colors group-hover:text-ui-primary">
                            Desktop notifications
                          </span>
                          <ToggleSwitch
                            checked={preferences.enableDesktop}
                            onChange={() => updatePreferences({ enableDesktop: !preferences.enableDesktop })}
                          />
                        </label>

                        <label className="flex items-center justify-between cursor-pointer group">
                          <span className="text-xs text-ui-secondary transition-colors group-hover:text-ui-primary">
                            Sound effects
                          </span>
                          <ToggleSwitch
                            checked={preferences.enableSound}
                            onChange={() => updatePreferences({ enableSound: !preferences.enableSound })}
                          />
                        </label>

                        <label className="flex items-center justify-between cursor-pointer group">
                          <span className="text-xs text-ui-secondary transition-colors group-hover:text-ui-primary">
                            Toast notifications
                          </span>
                          <ToggleSwitch
                            checked={preferences.enableToasts}
                            onChange={() => updatePreferences({ enableToasts: !preferences.enableToasts })}
                          />
                        </label>

                        {/* Divider */}
                        <div className="pt-3 mt-3">
                          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-ui-muted">
                            Notification Types
                          </p>

                          {/* Toggle switches thay thế checkboxes */}
                          <label className="flex items-center justify-between cursor-pointer group mb-2">
                            <span className="text-xs text-ui-secondary transition-colors group-hover:text-ui-primary">
                              Order updates
                            </span>
                            <ToggleSwitch
                              checked={preferences.types.order}
                              onChange={(checked) => updatePreferences({
                                types: { ...preferences.types, order: checked }
                              })}
                            />
                          </label>

                          <label className="flex items-center justify-between cursor-pointer group mb-2">
                            <span className="text-xs text-ui-secondary transition-colors group-hover:text-ui-primary">
                              New messages
                            </span>
                            <ToggleSwitch
                              checked={preferences.types.message}
                              onChange={(checked) => updatePreferences({
                                types: { ...preferences.types, message: checked }
                              })}
                            />
                          </label>

                          <label className="flex items-center justify-between cursor-pointer group mb-2">
                            <span className="text-xs text-ui-secondary transition-colors group-hover:text-ui-primary">
                              Community activity
                            </span>
                            <ToggleSwitch
                              checked={preferences.types.community !== false}
                              onChange={(checked) => updatePreferences({
                                types: { ...preferences.types, community: checked }
                              })}
                            />
                          </label>

                          <label className="flex items-center justify-between cursor-pointer group">
                            <span className="text-xs text-ui-secondary transition-colors group-hover:text-ui-primary">
                              System alerts
                            </span>
                            <ToggleSwitch
                              checked={preferences.types.system}
                              onChange={(checked) => updatePreferences({
                                types: { ...preferences.types, system: checked }
                              })}
                            />
                          </label>
                        </div>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                {/* Notifications List */}
                {!showSettings && (
                  <div className="max-h-[500px] overflow-y-auto custom-scrollbar py-2">
                    <AnimatePresence mode="popLayout">
                      {filteredNotifications.length === 0 ? (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="p-12 text-center"
                        >
                          <Bell size={48} className="mx-auto mb-3 text-ui-muted opacity-50" />
                          <p className="text-sm text-ui-muted">
                            {filterType === 'all' 
                              ? 'No notifications yet' 
                              : `No ${filterType} notifications`
                            }
                          </p>
                        </motion.div>
                      ) : (
                        filteredNotifications.map((notification) => (
                          <NotificationItem
                            key={notification.id}
                            notification={notification}
                            onClose={() => setIsOpen(false)}
                          />
                        ))
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Footer - View All Notifications */}
                {!showSettings && notifications.length > 0 && (
                  <div className="p-3">
                    <button className="w-full text-center text-xs font-semibold text-primary hover:text-[color:color-mix(in_srgb,var(--color-primary-custom)_82%,black)] transition-colors py-2">
                      View All Notifications
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
