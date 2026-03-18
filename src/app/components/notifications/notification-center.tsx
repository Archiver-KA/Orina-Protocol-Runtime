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
          className="group relative w-[43px] h-[43px] flex items-center justify-center bg-[rgba(18,18,18,0.5)] hover:bg-[rgba(18,18,18,0.65)] rounded-[50px] transition-colors"
          title="Notifications"
        >
          <Bell size={20} className="text-zinc-400 group-hover:text-zinc-200 transition-colors" />
          
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
                className="dropdown-panel rounded-[24px] overflow-hidden"
                style={{
                  background: 'rgba(18, 18, 18, 1)',
                  backdropFilter: 'blur(20px) saturate(140%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(140%)',
                }}
              >
                {/* Header */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Bell size={18} className="text-primary" />
                      <h3 className="text-label font-bold text-white">Notifications</h3>
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
                          className="p-1.5 hover:bg-[rgba(255,255,255,0.06)] rounded-lg text-zinc-400 transition-colors"
                          title="Mark all as read"
                        >
                          <Check size={16} />
                        </button>
                      )}

                      {/* Clear all */}
                      {notifications.length > 0 && (
                        <button
                          onClick={handleClearAll}
                          className="p-1.5 hover:bg-[rgba(255,255,255,0.06)] rounded-lg text-zinc-400 transition-colors"
                          title="Clear all"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}

                      {/* Settings button */}
                      <button
                        onClick={() => setShowSettings(!showSettings)}
                        className={`ml-1 p-1.5 rounded-lg transition-colors ${
                          showSettings ? 'bg-[rgba(255,255,255,0.08)] text-white' : 'hover:bg-[rgba(255,255,255,0.06)] text-zinc-400'
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
                          className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border-0 ${
                            filterType === option.value
                              ? 'bg-[rgba(255,255,255,0.08)] text-white'
                              : 'bg-[rgba(255,255,255,0.04)] text-zinc-400 hover:bg-[rgba(255,255,255,0.05)] hover:text-white'
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
                      <h4 className="text-section-header text-white mb-4">
                        Notification Preferences
                      </h4>

                      <div className="space-y-3">
                        {/* Toggle switches */}
                        <label className="flex items-center justify-between cursor-pointer group">
                          <span className="text-xs text-zinc-400 group-hover:text-white transition-colors">
                            Desktop notifications
                          </span>
                          <ToggleSwitch
                            checked={preferences.enableDesktop}
                            onChange={() => updatePreferences({ enableDesktop: !preferences.enableDesktop })}
                          />
                        </label>

                        <label className="flex items-center justify-between cursor-pointer group">
                          <span className="text-xs text-zinc-400 group-hover:text-white transition-colors">
                            Sound effects
                          </span>
                          <ToggleSwitch
                            checked={preferences.enableSound}
                            onChange={() => updatePreferences({ enableSound: !preferences.enableSound })}
                          />
                        </label>

                        <label className="flex items-center justify-between cursor-pointer group">
                          <span className="text-xs text-zinc-400 group-hover:text-white transition-colors">
                            Toast notifications
                          </span>
                          <ToggleSwitch
                            checked={preferences.enableToasts}
                            onChange={() => updatePreferences({ enableToasts: !preferences.enableToasts })}
                          />
                        </label>

                        {/* Divider */}
                        <div className="pt-3 mt-3">
                          <p className="text-xs font-bold text-zinc-500 mb-3 uppercase tracking-wider">
                            Notification Types
                          </p>

                          {/* Toggle switches thay thế checkboxes */}
                          <label className="flex items-center justify-between cursor-pointer group mb-2">
                            <span className="text-xs text-zinc-400 group-hover:text-white transition-colors">
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
                            <span className="text-xs text-zinc-400 group-hover:text-white transition-colors">
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
                            <span className="text-xs text-zinc-400 group-hover:text-white transition-colors">
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
                            <span className="text-xs text-zinc-400 group-hover:text-white transition-colors">
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
                          <Bell size={48} className="text-zinc-700 mx-auto mb-3" />
                          <p className="text-sm text-zinc-500">
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
                    <button className="w-full text-center text-xs font-bold text-primary hover:text-[color:color-mix(in_srgb,var(--color-primary-custom)_82%,black)] transition-colors py-2">
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
