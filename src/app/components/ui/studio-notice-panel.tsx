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
          box: 'bg-red-500/10 border-red-500/30',
          title: 'text-red-400',
          body: 'text-red-400/80',
          icon: <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={compact ? 16 : 20} />,
        }
      : variant === 'warning'
        ? {
            box: 'bg-amber-500/10 border-amber-500/30',
            title: 'text-amber-400',
            body: 'text-amber-400/80',
            icon: <AlertCircle className="text-amber-400 flex-shrink-0 mt-0.5" size={compact ? 16 : 20} />,
          }
        : variant === 'info'
          ? {
              box: 'bg-blue-500/10 border-blue-500/30',
              title: 'text-blue-300',
              body: 'text-blue-200/80',
              icon: <Info className="text-blue-300 flex-shrink-0 mt-0.5" size={compact ? 16 : 20} />,
            }
          : variant === 'success'
            ? {
                box: 'bg-[color:color-mix(in_srgb,var(--color-primary-custom)_10%,transparent)] border-[color:color-mix(in_srgb,var(--color-primary-custom)_35%,transparent)]',
                title: 'text-primary',
                body: 'text-[color:color-mix(in_srgb,var(--color-primary-custom)_70%,white_0%)]/80',
                icon: <Info className="text-primary flex-shrink-0 mt-0.5" size={compact ? 16 : 20} />,
              }
            : {
                box: 'bg-zinc-950/30 border-zinc-800',
                title: 'text-zinc-400',
                body: 'text-zinc-500',
                icon: <Info className="text-zinc-600 flex-shrink-0 mt-0.5" size={compact ? 16 : 20} />,
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
          {title ? <h3 className={cn('font-bold mb-1', compact ? 'text-xs' : 'text-sm', tone.title)}>{title}</h3> : null}
          {children ? (
            <div className={cn(compact ? 'text-xs leading-relaxed' : 'text-xs', tone.body)}>{children}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
