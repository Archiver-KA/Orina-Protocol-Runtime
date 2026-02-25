import { X, ExternalLink, Package, MessageSquare, Settings as SettingsIcon, CheckCircle, AlertTriangle, XCircle, ShoppingCart, Bell } from 'lucide-react';
import { motion } from 'motion/react';
import { AppNotification, NotificationType } from '@/types/notifications';
import { formatRelativeTime } from '@/utils/notifications';
import { useNotifications } from '@/contexts/NotificationContext';

interface NotificationItemProps {
  notification: AppNotification;
  onClose?: () => void;
}

export function NotificationItem({ notification, onClose }: NotificationItemProps) {
  const { markAsRead, deleteNotification } = useNotifications();

  const handleClick = () => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    if (notification.actionUrl) {
      console.log('Navigate to:', notification.actionUrl);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNotification(notification.id);
  };

  // Icon & Color mapping theo Toast Sonner-style
  const getIconAndColor = (type: NotificationType) => {
    switch (type) {
      case 'order':
        return {
          icon: <ShoppingCart size={20} />,
          iconColor: 'text-orange-400',
          borderColor: 'border-l-orange-400',
        };
      case 'message':
        return {
          icon: <MessageSquare size={20} />,
          iconColor: 'text-[#2CC295]',
          borderColor: 'border-l-[#2CC295]',
        };
      case 'system':
        return {
          icon: <SettingsIcon size={20} />,
          iconColor: 'text-blue-400',
          borderColor: 'border-l-blue-400',
        };
      case 'success':
        return {
          icon: <CheckCircle size={20} />,
          iconColor: 'text-[#2CC295]',
          borderColor: 'border-l-[#2CC295]',
        };
      case 'warning':
        return {
          icon: <AlertTriangle size={20} />,
          iconColor: 'text-[#f59e0b]',
          borderColor: 'border-l-[#f59e0b]',
        };
      case 'error':
        return {
          icon: <XCircle size={20} />,
          iconColor: 'text-[#ef4444]',
          borderColor: 'border-l-[#ef4444]',
        };
      default:
        return {
          icon: <Bell size={20} />,
          iconColor: 'text-blue-400',
          borderColor: 'border-l-blue-400',
        };
    }
  };

  const { icon, iconColor, borderColor } = getIconAndColor(notification.type);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      onClick={handleClick}
      className={`
        relative group
        bg-zinc-900 border-l-4 ${borderColor} rounded-r-lg
        p-4 mx-3 my-2
        shadow-[0_4px_12px_rgba(0,0,0,0.15)]
        hover:bg-zinc-800/80
        transition-all
        cursor-pointer
        ${!notification.read ? 'ring-1 ring-[#2CC295]/20' : ''}
      `}
    >
      {/* Unread indicator dot - positioned at top-right */}
      {!notification.read && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#2CC295] rounded-full shadow-[0_0_8px_rgba(44,194,149,0.6)]" />
      )}

      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="mt-1">
          <div className={iconColor}>
            {icon}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="text-white text-sm font-bold">
            {notification.title}
          </h4>
          <p className="text-zinc-500 text-xs mt-1 leading-relaxed">
            {notification.message}
          </p>

          {/* Metadata */}
          <div className="flex items-center gap-3 mt-2 text-[10px] text-zinc-600">
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
          className="text-zinc-600 hover:text-white transition-colors flex-shrink-0"
        >
          <X size={16} />
        </button>
      </div>
    </motion.div>
  );
}