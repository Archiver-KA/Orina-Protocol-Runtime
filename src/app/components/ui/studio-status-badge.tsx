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
      ? 'px-2 py-0.5 text-[10px] rounded-md'
      : 'px-1.5 py-0.5 text-[9px] rounded';

  const variantClass =
    variant === 'success'
      ? 'bg-zinc-800 text-[#2CC295] border-[#27272a]'
      : variant === 'warning'
        ? 'bg-zinc-800 text-[#F7DC7F] border-[#27272a]'
        : variant === 'danger'
          ? 'bg-zinc-800 text-orange-400 border-[#27272a]'
          : variant === 'info'
            ? 'bg-zinc-800 text-blue-400 border-[#27272a]'
            : variant === 'accent'
              ? 'bg-zinc-800 text-purple-300 border-[#27272a]'
              : 'bg-zinc-800 text-zinc-400 border-[#27272a]';

  return (
    <span
      className={cn(
        'inline-flex items-center border font-bold uppercase tracking-wide',
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
