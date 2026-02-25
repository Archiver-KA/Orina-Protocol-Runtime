import { X, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  id?: string;
  type: ToastType;
  title: string;
  message: string;
  duration?: number;
  onClose?: () => void;
}

export function Toast({ 
  id,
  type, 
  title, 
  message, 
  duration = 5000,
  onClose 
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => {
          onClose?.();
        }, 300);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose?.();
    }, 300);
  };

  const config = {
    success: {
      icon: CheckCircle,
      borderColor: 'border-[#2CC295]',
      iconColor: 'text-[#2CC295]',
    },
    error: {
      icon: XCircle,
      borderColor: 'border-[#ef4444]',
      iconColor: 'text-[#ef4444]',
    },
    warning: {
      icon: AlertTriangle,
      borderColor: 'border-[#f59e0b]',
      iconColor: 'text-[#f59e0b]',
    },
    info: {
      icon: Info,
      borderColor: 'border-[#2CC295]',
      iconColor: 'text-[#2CC295]',
    },
  };

  const { icon: Icon, borderColor, iconColor } = config[type];

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={`w-full max-w-md bg-zinc-900 border-l-4 ${borderColor} p-4 rounded-r-lg shadow-[0_20px_25px_-5px_rgba(0,0,0,0.3),0_10px_10px_-5px_rgba(0,0,0,0.2)] flex items-start gap-4`}
    >
      <div className="mt-1">
        <Icon size={20} className={iconColor} />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-white text-sm font-bold">{title}</h4>
        <p className="text-zinc-500 text-xs mt-1 leading-relaxed">{message}</p>
      </div>
      <button
        onClick={handleClose}
        className="text-zinc-600 hover:text-white transition-colors flex-shrink-0"
      >
        <X size={16} />
      </button>
    </motion.div>
  );
}

// Toast Container component
interface ToastContainerProps {
  toasts: ToastProps[];
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

export function ToastContainer({ toasts, position = 'top-right' }: ToastContainerProps) {
  const positionClasses = {
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6',
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-center': 'top-6 left-1/2 -translate-x-1/2',
    'bottom-center': 'bottom-6 left-1/2 -translate-x-1/2',
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-[9999] flex flex-col gap-3 pointer-events-none`}>
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast {...toast} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
