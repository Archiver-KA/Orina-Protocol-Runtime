import type { HTMLAttributes, ReactNode } from 'react';
import { AlertCircle, Info } from 'lucide-react';
import { cn } from '@/app/components/ui/utils';

type StudioNoticeVariant = 'error' | 'warning' | 'info' | 'success' | 'neutral';

interface StudioNoticePanelProps extends HTMLAttributes<HTMLDivElement> {
  variant?: StudioNoticeVariant;
  title?: ReactNode;
  children?: ReactNode;
  icon?: ReactNode;
  compact?: boolean;
}

export function StudioNoticePanel({
  variant = 'neutral',
  title,
  children,
  icon,
  compact = false,
  className,
  ...props
}: StudioNoticePanelProps) {
  const tone =
    variant === 'error'
      ? {
          box: 'bg-[var(--t-notice-error-bg)] border-[var(--t-notice-error-border)]',
          title: 'text-[color:var(--t-notice-error-title)]',
          body: 'text-[color:var(--t-notice-error-body)]',
          icon: <AlertCircle className="text-[color:var(--t-notice-error-title)] flex-shrink-0 mt-0.5" size={compact ? 16 : 20} />,
        }
      : variant === 'warning'
        ? {
            box: 'bg-[var(--t-notice-warning-bg)] border-[var(--t-notice-warning-border)]',
            title: 'text-[color:var(--t-notice-warning-title)]',
            body: 'text-[color:var(--t-notice-warning-body)]',
            icon: <AlertCircle className="text-[color:var(--t-notice-warning-title)] flex-shrink-0 mt-0.5" size={compact ? 16 : 20} />,
          }
        : variant === 'info'
          ? {
              box: 'bg-[var(--t-notice-info-bg)] border-[var(--t-notice-info-border)]',
              title: 'text-[color:var(--t-notice-info-title)]',
              body: 'text-[color:var(--t-notice-info-body)]',
              icon: <Info className="text-[color:var(--t-notice-info-title)] flex-shrink-0 mt-0.5" size={compact ? 16 : 20} />,
            }
      : variant === 'success'
            ? {
                box: 'bg-[var(--t-notice-success-bg)] border-[var(--t-notice-success-border)]',
                title: 'text-[color:var(--t-notice-success-title)]',
                body: 'text-[color:var(--t-notice-success-body)]',
                icon: <Info className="text-[color:var(--t-notice-success-title)] flex-shrink-0 mt-0.5" size={compact ? 16 : 20} />,
              }
            : {
                box: 'bg-ui-input border-ui-border-subtle',
                title: 'text-ui-secondary',
                body: 'text-ui-muted',
                icon: <Info className="text-ui-muted flex-shrink-0 mt-0.5" size={compact ? 16 : 20} />,
              };

  return (
    <div
      className={cn(
        'rounded-lg border',
        compact ? 'p-3' : 'p-4',
        tone.box,
        className
      )}
      {...props}
    >
      <div className="flex items-start gap-3">
        {icon ?? tone.icon}
        <div className="flex-1 min-w-0">
          {title ? <h3 className={cn('font-semibold mb-1', compact ? 'text-xs' : 'text-sm', tone.title)}>{title}</h3> : null}
          {children ? (
            <div className={cn(compact ? 'text-xs leading-relaxed' : 'text-xs', tone.body)}>{children}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
