import { Clock, AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

interface OrderCountdownProps {
  deadline: bigint | number; // Unix timestamp in seconds
  label?: string;
  showIcon?: boolean;
  compact?: boolean;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
}

export function OrderCountdown({ 
  deadline, 
  label = 'EXPIRATION',
  showIcon = true,
  compact = false
}: OrderCountdownProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining | null>(null);

  useEffect(() => {
    const calculateTimeRemaining = (): TimeRemaining => {
      const now = Math.floor(Date.now() / 1000);
      const deadlineNum = typeof deadline === 'bigint' ? Number(deadline) : deadline;
      const diff = deadlineNum - now;

      if (diff <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 };
      }

      const days = Math.floor(diff / (24 * 60 * 60));
      const hours = Math.floor((diff % (24 * 60 * 60)) / (60 * 60));
      const minutes = Math.floor((diff % (60 * 60)) / 60);
      const seconds = diff % 60;

      return { days, hours, minutes, seconds, totalSeconds: diff };
    };

    // Initial calculation
    setTimeRemaining(calculateTimeRemaining());

    // Update every second
    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining());
    }, 1000);

    return () => clearInterval(interval);
  }, [deadline]);

  if (!timeRemaining) {
    return null;
  }

  // Determine color state based on time remaining
  const getColorState = () => {
    const hours = timeRemaining.totalSeconds / 3600;
    
    if (timeRemaining.totalSeconds === 0) {
      return {
        bg: 'bg-red-500/10',
        border: 'border-red-500/40',
        text: 'text-red-400',
        glow: 'shadow-[0_0_20px_rgba(239,68,68,0.3)]',
        label: 'text-red-400/70',
        pulse: false
      };
    } else if (hours < 6) {
      return {
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
        text: 'text-red-400',
        glow: 'shadow-[0_0_15px_rgba(239,68,68,0.2)]',
        label: 'text-red-400/70',
        pulse: true
      };
    } else if (hours < 24) {
      return {
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        text: 'text-amber-400',
        glow: 'shadow-[0_0_12px_rgba(245,158,11,0.15)]',
        label: 'text-amber-400/70',
        pulse: false
      };
    } else {
      return {
        bg: 'bg-[#2CC295]/10',
        border: 'border-[#2CC295]/30',
        text: 'text-[#2CC295]',
        glow: 'shadow-[0_0_10px_rgba(44,194,149,0.1)]',
        label: 'text-[#2CC295]/70',
        pulse: false
      };
    }
  };

  const colorState = getColorState();
  const isExpired = timeRemaining.totalSeconds === 0;

  // Format display
  const formatTime = () => {
    if (isExpired) {
      return 'EXPIRED';
    }

    const { days, hours, minutes, seconds } = timeRemaining;

    if (compact) {
      if (days > 0) {
        return `${days}d ${hours}h`;
      } else if (hours > 0) {
        return `${hours}h ${minutes}m`;
      } else {
        return `${minutes}m ${seconds}s`;
      }
    }

    // Full format: DD:HH:MM:SS or HH:MM:SS
    if (days > 0) {
      return `${String(days).padStart(2, '0')}:${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    } else {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
  };

  return (
    <div 
      className={`
        ${colorState.bg} 
        ${colorState.border} 
        ${colorState.glow}
        border rounded-lg px-3 py-2 
        transition-all duration-300
        ${colorState.pulse ? 'animate-pulse' : ''}
      `}
    >
      {/* Label */}
      <div className="flex items-center gap-1.5 mb-1">
        {showIcon && (
          isExpired ? (
            <AlertCircle size={10} className={colorState.text} />
          ) : (
            <Clock size={10} className={colorState.text} />
          )
        )}
        <span className={`text-[8px] font-bold uppercase tracking-widest ${colorState.label}`}>
          {label}
        </span>
      </div>

      {/* Timer */}
      <div className={`font-mono text-sm font-bold ${colorState.text} tracking-wider`}>
        {formatTime()}
      </div>

      {/* Time unit labels (only for full format) */}
      {!compact && !isExpired && (
        <div className="flex gap-2 mt-0.5">
          {timeRemaining.days > 0 && (
            <>
              <span className="text-[7px] text-ui-muted uppercase w-5">DD</span>
              <span className="text-[7px] text-ui-muted uppercase w-5">HH</span>
              <span className="text-[7px] text-ui-muted uppercase w-5">MM</span>
              <span className="text-[7px] text-ui-muted uppercase w-5">SS</span>
            </>
          )}
          {timeRemaining.days === 0 && (
            <>
              <span className="text-[7px] text-ui-muted uppercase w-5">HH</span>
              <span className="text-[7px] text-ui-muted uppercase w-5">MM</span>
              <span className="text-[7px] text-ui-muted uppercase w-5">SS</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Compact inline version for table rows
export function OrderCountdownInline({ deadline, showLabel = false }: { 
  deadline: bigint | number;
  showLabel?: boolean;
}) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining | null>(null);

  useEffect(() => {
    const calculateTimeRemaining = (): TimeRemaining => {
      const now = Math.floor(Date.now() / 1000);
      const deadlineNum = typeof deadline === 'bigint' ? Number(deadline) : deadline;
      const diff = deadlineNum - now;

      if (diff <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 };
      }

      const days = Math.floor(diff / (24 * 60 * 60));
      const hours = Math.floor((diff % (24 * 60 * 60)) / (60 * 60));
      const minutes = Math.floor((diff % (60 * 60)) / 60);
      const seconds = diff % 60;

      return { days, hours, minutes, seconds, totalSeconds: diff };
    };

    setTimeRemaining(calculateTimeRemaining());

    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining());
    }, 1000);

    return () => clearInterval(interval);
  }, [deadline]);

  if (!timeRemaining) {
    return <span className="text-ui-muted text-xs">Loading...</span>;
  }

  const hours = timeRemaining.totalSeconds / 3600;
  const isExpired = timeRemaining.totalSeconds === 0;

  let colorClass = 'text-[#2CC295]';
  if (isExpired) {
    colorClass = 'text-red-400';
  } else if (hours < 6) {
    colorClass = 'text-red-400';
  } else if (hours < 24) {
    colorClass = 'text-amber-400';
  }

  const formatTime = () => {
    if (isExpired) return 'Expired';

    const { days, hours, minutes } = timeRemaining;
    
    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <Clock size={12} className={colorClass} />
      <span className={`font-mono text-xs font-bold ${colorClass}`}>
        {formatTime()}
      </span>
      {showLabel && (
        <span className="text-[9px] text-ui-muted uppercase tracking-wide">
          left
        </span>
      )}
    </div>
  );
}
