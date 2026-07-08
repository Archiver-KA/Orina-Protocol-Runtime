import type { HTMLAttributes } from 'react';
import { cn } from '@/app/components/ui/utils';

type StudioProgressBarVariant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'purple'
  | 'muted';

interface StudioProgressBarProps extends HTMLAttributes<HTMLDivElement> {
  value: number;
  variant?: StudioProgressBarVariant;
  heightClassName?: string;
  trackClassName?: string;
  indicatorClassName?: string;
}

export function StudioProgressBar({
  value,
  className,
  variant = 'success',
  heightClassName = 'h-1.5',
  trackClassName,
  indicatorClassName,
  ...props
}: StudioProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const indicatorVariantClass =
    variant === 'success'
      ? 'bg-[var(--t-success-text)]'
    : variant === 'warning'
        ? 'bg-[var(--t-status-warning-text)]'
        : variant === 'danger'
          ? 'bg-[var(--t-status-danger-text)]'
          : variant === 'info'
            ? 'bg-[var(--t-status-info-text)]'
            : variant === 'purple'
              ? 'bg-[var(--t-status-accent-text)]'
              : 'bg-ui-border';

  return (
    <div
      className={cn(
        'w-full rounded-full overflow-hidden bg-ui-border-subtle',
        heightClassName,
        trackClassName,
        className
      )}
      {...props}
    >
      <div
        className={cn('h-full rounded-full transition-all duration-500', indicatorVariantClass, indicatorClassName)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
