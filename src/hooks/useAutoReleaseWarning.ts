import { useMemo, useEffect, useState } from 'react';

export type WarningLevel = 'none' | 'info' | 'warning' | 'critical';

export interface AutoReleaseWarning {
  level: WarningLevel;
  message: string;
  timeRemaining: number; // in seconds
  percentage: number; // 0-100
  shouldShowWarning: boolean;
  isExpired: boolean;
}

interface UseAutoReleaseWarningProps {
  autoReleaseAt: bigint;
  state: number; // Order state
  finalized: boolean;
}

/**
 * Hook to calculate warning level for auto-release deadline
 * 
 * Warning Levels:
 * - Critical: < 1 hour (3600s)
 * - Warning: < 6 hours (21600s)
 * - Info: < 24 hours (86400s)
 * - None: > 24 hours
 */
export function useAutoReleaseWarning({
  autoReleaseAt,
  state,
  finalized,
}: UseAutoReleaseWarningProps): AutoReleaseWarning {
  const [currentTime, setCurrentTime] = useState(() => Math.floor(Date.now() / 1000));

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Math.floor(Date.now() / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return useMemo(() => {
    // Only show warnings for Paid orders that are not finalized
    const shouldShowWarning = state === 1 && !finalized;

    if (!shouldShowWarning) {
      return {
        level: 'none',
        message: 'Auto-release not applicable',
        timeRemaining: 0,
        percentage: 0,
        shouldShowWarning: false,
        isExpired: false,
      };
    }

    const deadline = Number(autoReleaseAt);
    const timeRemaining = deadline - currentTime;
    const isExpired = timeRemaining <= 0;

    // Calculate percentage (assuming 7 days = 604800 seconds as max)
    const maxTime = 604800; // 7 days in seconds
    const percentage = Math.max(0, Math.min(100, (timeRemaining / maxTime) * 100));

    // Determine warning level
    let level: WarningLevel = 'none';
    let message = '';

    if (isExpired) {
      level = 'critical';
      message = '⏰ Auto-release deadline has passed! Payment will be released automatically.';
    } else if (timeRemaining < 3600) {
      // < 1 hour
      level = 'critical';
      const minutes = Math.floor(timeRemaining / 60);
      message = `🚨 CRITICAL: Auto-release in ${minutes} minutes! Seller should confirm delivery immediately.`;
    } else if (timeRemaining < 21600) {
      // < 6 hours
      level = 'warning';
      const hours = Math.floor(timeRemaining / 3600);
      message = `⚠️ WARNING: Auto-release in ${hours} hours. Please confirm delivery soon.`;
    } else if (timeRemaining < 86400) {
      // < 24 hours
      level = 'info';
      const hours = Math.floor(timeRemaining / 3600);
      message = `ℹ️ INFO: Auto-release in ${hours} hours. Time to prepare for confirmation.`;
    } else {
      level = 'none';
      const days = Math.floor(timeRemaining / 86400);
      message = `Auto-release in ${days} days`;
    }

    return {
      level,
      message,
      timeRemaining,
      percentage,
      shouldShowWarning,
      isExpired,
    };
  }, [autoReleaseAt, state, finalized, currentTime]);
}

/**
 * Get color classes based on warning level
 */
export function getWarningColors(level: WarningLevel) {
  switch (level) {
    case 'critical':
      return {
        bg: 'bg-red-500/10',
        border: 'border-red-500/50',
        text: 'text-red-400',
        glow: 'shadow-[0_0_20px_rgba(239,68,68,0.3)]',
        pulse: 'animate-pulse',
      };
    case 'warning':
      return {
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/50',
        text: 'text-amber-400',
        glow: 'shadow-[0_0_15px_rgba(245,158,11,0.2)]',
        pulse: '',
      };
    case 'info':
      return {
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/50',
        text: 'text-blue-400',
        glow: 'shadow-[0_0_10px_rgba(59,130,246,0.15)]',
        pulse: '',
      };
    default:
      return {
        bg: 'bg-zinc-800/50',
        border: 'border-zinc-700',
        text: 'text-zinc-400',
        glow: '',
        pulse: '',
      };
  }
}

/**
 * Format time remaining in human-readable format
 */
export function formatTimeRemaining(seconds: number): {
  value: number;
  unit: string;
  full: string;
} {
  if (seconds <= 0) {
    return { value: 0, unit: 'expired', full: 'Expired' };
  }

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (days > 0) {
    return {
      value: days,
      unit: days === 1 ? 'day' : 'days',
      full: `${days}d ${hours}h ${minutes}m`,
    };
  }

  if (hours > 0) {
    return {
      value: hours,
      unit: hours === 1 ? 'hour' : 'hours',
      full: `${hours}h ${minutes}m ${secs}s`,
    };
  }

  if (minutes > 0) {
    return {
      value: minutes,
      unit: minutes === 1 ? 'minute' : 'minutes',
      full: `${minutes}m ${secs}s`,
    };
  }

  return {
    value: secs,
    unit: secs === 1 ? 'second' : 'seconds',
    full: `${secs}s`,
  };
}
