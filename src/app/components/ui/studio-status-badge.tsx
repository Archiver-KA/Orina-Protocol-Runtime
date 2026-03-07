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
      ? 'bg-[rgba(44,194,149,0.12)] text-[#2CC295]'
      : variant === 'warning'
        ? 'bg-[rgba(247,220,127,0.12)] text-[#F7DC7F]'
        : variant === 'danger'
          ? 'bg-[rgba(251,146,60,0.12)] text-orange-400'
          : variant === 'info'
            ? 'bg-[rgba(96,165,250,0.12)] text-blue-400'
            : variant === 'accent'
              ? 'bg-[rgba(196,181,253,0.12)] text-purple-300'
              : 'bg-[rgba(255,255,255,0.06)] text-zinc-400';

  return (
    <span
      className={cn(
        'inline-flex items-center border-0 font-bold uppercase tracking-wide',
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
