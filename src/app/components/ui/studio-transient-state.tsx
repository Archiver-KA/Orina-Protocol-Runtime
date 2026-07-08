import type { HTMLAttributes, ReactNode } from 'react';
import { AlertCircle, CheckCircle, Info, Loader2 } from 'lucide-react';
import { cn } from '@/app/components/ui/utils';

type StudioTransientVariant = 'success' | 'error' | 'info' | 'warning' | 'loading';

interface StudioTransientStateProps extends HTMLAttributes<HTMLDivElement> {
  variant: StudioTransientVariant;
  title?: ReactNode;
  description?: ReactNode;
  inline?: boolean;
  icon?: ReactNode;
}

export function StudioTransientState({
  variant,
  title,
  description,
  inline = true,
  icon,
  className,
  ...props
}: StudioTransientStateProps) {
  const tone =
    variant === 'success'
      ? {
          text: 'text-[var(--t-success-text)]',
          border: 'border-[var(--t-success-border)]',
          bg: 'bg-[var(--t-success-bg)]',
        }
      : variant === 'error'
        ? { text: 'text-red-400', border: 'border-red-500/30', bg: 'bg-red-500/10' }
        : variant === 'warning'
          ? { text: 'text-yellow-400', border: 'border-yellow-500/30', bg: 'bg-yellow-500/10' }
          : variant === 'loading'
            ? { text: 'text-blue-400', border: 'border-blue-500/30', bg: 'bg-blue-500/10' }
            : { text: 'text-ui-secondary', border: 'border-[var(--color-panel-border)]', bg: 'bg-[var(--t-surface-5)]' };

  const defaultIcon =
    variant === 'success' ? <CheckCircle size={14} /> :
    variant === 'error' ? <AlertCircle size={14} /> :
    variant === 'loading' ? <Loader2 size={14} className="animate-spin" /> :
    <Info size={14} />;

  return (
    <div
      className={cn(
        inline
          ? `flex items-center gap-2 text-xs ${tone.text}`
          : `rounded-lg border p-3 ${tone.bg} ${tone.border}`,
        className
      )}
      {...props}
    >
      <span className={cn('shrink-0', inline ? '' : tone.text)}>{icon ?? defaultIcon}</span>
      <div className={cn(inline ? '' : 'min-w-0')}>
        {title ? <div className={cn(inline ? '' : `text-sm font-semibold ${tone.text}`)}>{title}</div> : null}
        {description ? (
          <div className={cn(inline ? '' : 'mt-1 text-xs text-ui-secondary')}>{description}</div>
        ) : null}
      </div>
    </div>
  );
}
