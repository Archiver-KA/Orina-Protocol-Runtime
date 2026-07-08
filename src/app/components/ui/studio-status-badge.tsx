import type { HTMLAttributes } from 'react';
import { cn } from '@/app/components/ui/utils';

type StudioStatusBadgeVariant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'muted'
  | 'accent';

type StudioStatusBadgeSize = 'xs' | 'sm';

interface StudioStatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: StudioStatusBadgeVariant;
  size?: StudioStatusBadgeSize;
}

export function StudioStatusBadge({
  children,
  className,
  variant = 'muted',
  size = 'xs',
  ...props
}: StudioStatusBadgeProps) {
  const sizeClass =
    size === 'sm'
      ? 'px-2.5 py-1 text-[10px] rounded-full'
      : 'px-2 py-0.5 text-[9px] rounded-full';

  const variantClass =
    variant === 'success'
      ? 'bg-[var(--t-success-bg)] text-[var(--t-success-text)]'
      : variant === 'warning'
        ? 'bg-[var(--t-status-warning-bg)] text-[var(--t-status-warning-text)]'
        : variant === 'danger'
          ? 'bg-[var(--t-status-danger-bg)] text-[var(--t-status-danger-text)]'
          : variant === 'info'
            ? 'bg-[var(--t-status-info-bg)] text-[var(--t-status-info-text)]'
            : variant === 'accent'
              ? 'bg-[var(--t-status-accent-bg)] text-[var(--t-status-accent-text)]'
              : 'bg-[var(--t-status-muted-bg)] text-[var(--t-status-muted-text)]';

  return (
    <span
      className={cn(
        'inline-flex items-center border-0 font-semibold uppercase tracking-wide',
        sizeClass,
        variantClass,
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
