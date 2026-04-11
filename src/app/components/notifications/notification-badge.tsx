import { motion, AnimatePresence } from 'motion/react';

interface NotificationBadgeProps {
  count: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'danger' | 'warning';
  className?: string;
}

export function NotificationBadge({ 
  count, 
  max = 99, 
  size = 'md',
  variant = 'primary',
  className = '' 
}: NotificationBadgeProps) {
  if (count <= 0) return null;

  const displayCount = count > max ? `${max}+` : count;

  const sizeClasses = {
    sm: 'w-4 h-4 text-[9px]',
    md: 'w-5 h-5 text-[10px]',
    lg: 'min-w-[1.5rem] h-6 px-1 text-[11px]',
  };

  const variantClasses = {
    primary: 'bg-[#2CC295] text-black shadow-[0_0_15px_rgba(44,194,149,0.3)]',
    danger: 'bg-[#ef4444] text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]',
    warning: 'bg-[#f59e0b] text-black shadow-[0_0_15px_rgba(245,158,11,0.3)]',
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={count}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className={`
          ${sizeClasses[size]}
          ${variantClasses[variant]}
          font-semibold 
          rounded-full 
          flex items-center justify-center
          leading-none
          ${className}
        `}
      >
        {displayCount}
      </motion.div>
    </AnimatePresence>
  );
}
