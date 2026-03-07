import type { HTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/app/components/ui/utils';

type StudioLoadingLayout = 'inline' | 'stacked';
type StudioLoadingTone = 'primary' | 'muted' | 'light' | 'inherit';

interface StudioLoadingIndicatorProps extends HTMLAttributes<HTMLDivElement> {
  layout?: StudioLoadingLayout;
  tone?: StudioLoadingTone;
  size?: number;
  label?: ReactNode;
  subLabel?: ReactNode;
  iconClassName?: string;
  labelClassName?: string;
  subLabelClassName?: string;
}

export function StudioLoadingIndicator({
  layout = 'inline',
  tone = 'primary',
  size = 16,
  label,
  subLabel,
  className,
  iconClassName,
  labelClassName,
  subLabelClassName,
  ...props
}: StudioLoadingIndicatorProps) {
  const toneClass =
    tone === 'primary'
      ? 'text-primary'
      : tone === 'muted'
        ? 'text-zinc-400'
        : tone === 'light'
          ? 'text-white'
          : 'text-current';

  const isStacked = layout === 'stacked';

  return (
    <div
      className={cn(
        isStacked ? 'flex flex-col items-center justify-center gap-2 text-center' : 'inline-flex items-center justify-center gap-2',
        className
      )}
      {...props}
    >
      <Loader2 className={cn('animate-spin shrink-0', toneClass, iconClassName)} size={size} />
      {(label || subLabel) && (
        <div className={cn(isStacked ? 'space-y-0.5' : 'contents')}>
          {label ? (
            <span className={cn(isStacked ? 'block text-sm font-medium text-white' : 'text-current', labelClassName)}>
              {label}
            </span>
          ) : null}
          {subLabel ? (
            <span className={cn(isStacked ? 'block text-xs text-zinc-500' : 'text-current', subLabelClassName)}>
              {subLabel}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}
