import { forwardRef, type MouseEvent } from 'react';
import { X, ExternalLink, Package, MessageSquare, Settings as SettingsIcon, CheckCircle, AlertTriangle, XCircle, ShoppingCart, Bell } from 'lucide-react';
import { motion } from 'motion/react';
import { AppNotification, NotificationType } from '@/types/notifications';
import { formatRelativeTime } from '@/utils/notifications';
import { useNotifications } from '@/contexts/NotificationContext';

interface NotificationItemProps {
  notification: AppNotification;
  onClose?: () => void;
}

export const NotificationItem = forwardRef<HTMLDivElement, NotificationItemProps>(function NotificationItem(
  { notification, onClose }: NotificationItemProps,
  ref
) {
  const { markAsRead, deleteNotification } = useNotifications();

  const handleClick = () => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('orina:notification-action', {
          detail: { notification },
        })
      );
    }
    if (notification.actionUrl) {
      console.log('Navigate to:', notification.actionUrl);
    }
    onClose?.();
  };

  const handleDelete = (e: MouseEvent) => {
    e.stopPropagation();
    deleteNotification(notification.id);
  };

  // Icon & Color mapping theo Toast Sonner-style
  const getIconAndColor = (type: NotificationType) => {
    switch (type) {
      case 'order':
        return {
          icon: <ShoppingCart size={16} />,
          iconColor: 'text-orange-400',
        };
      case 'message':
        return {
          icon: <MessageSquare size={16} />,
          iconColor: 'text-[#2CC295]',
        };
      case 'system':
        return {
          icon: <SettingsIcon size={16} />,
          iconColor: 'text-blue-400',
        };
      case 'success':
        return {
          icon: <CheckCircle size={16} />,
          iconColor: 'text-[#2CC295]',
        };
      case 'warning':
        return {
          icon: <AlertTriangle size={16} />,
          iconColor: 'text-[#f59e0b]',
        };
      case 'error':
        return {
          icon: <XCircle size={16} />,
          iconColor: 'text-[#ef4444]',
        };
      default:
        return {
          icon: <Bell size={16} />,
          iconColor: 'text-blue-400',
        };
    }
  };

  const { icon, iconColor } = getIconAndColor(notification.type);

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      onClick={handleClick}
      className={`relative group w-full text-left px-4 py-3 border-b border-[var(--color-panel-border)]/50 hover:bg-[rgba(255,255,255,0.05)] transition-colors cursor-pointer ${
        !notification.read ? 'bg-[var(--color-primary-custom)]/5' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        {!notification.read && (
          <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 bg-[var(--color-primary-custom)]" />
        )}
        {/* Icon */}
        <div className="mt-0.5">
          <div className={iconColor}>
            {icon}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="text-white text-xs font-bold truncate">
            {notification.title}
          </h4>
          <p className="text-zinc-400 text-[11px] mt-0.5 line-clamp-2">
            {notification.message}
          </p>

          {/* Metadata */}
          <div className="flex items-center gap-3 mt-1 text-[10px] text-zinc-600">
            <span>{formatRelativeTime(notification.timestamp)}</span>
            
            {notification.metadata?.orderId && (
              <span className="text-[#2CC295]">
                Order #{notification.metadata.orderId.slice(0, 8)}
              </span>
            )}

            {notification.actionUrl && (
              <button className="flex items-center gap-1 text-[#2CC295] hover:text-[#25a882] transition-colors">
                View <ExternalLink size={10} />
              </button>
            )}
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={handleDelete}
          className="text-zinc-600 hover:text-white transition-colors flex-shrink-0 mt-0.5"
        >
          <X size={14} />
        </button>
      </div>
    </motion.div>
  );
});

NotificationItem.displayName = 'NotificationItem';
