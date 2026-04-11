import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/app/components/ui/utils';

interface StudioMetricRowProps extends HTMLAttributes<HTMLDivElement> {
  left: ReactNode;
  right?: ReactNode;
}

export function StudioMetricRow({ left, right, className, ...props }: StudioMetricRowProps) {
  return (
    <div className={cn('flex items-center justify-between gap-3', className)} {...props}>
      <div className="min-w-0">{left}</div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

interface StudioTimelineItemProps extends HTMLAttributes<HTMLDivElement> {
  title: ReactNode;
  description?: ReactNode;
  timestamp?: ReactNode;
  tone?: 'success' | 'muted' | 'warning' | 'danger' | 'info';
  showConnector?: boolean;
}

export function StudioTimelineItem({
  title,
  description,
  timestamp,
  tone = 'muted',
  showConnector = true,
  className,
  ...props
}: StudioTimelineItemProps) {
  const dotClass =
    tone === 'success'
      ? 'bg-[#2CC295]'
      : tone === 'warning'
        ? 'bg-[#F7DC7F]'
        : tone === 'danger'
          ? 'bg-orange-400'
          : tone === 'info'
            ? 'bg-blue-400'
            : 'bg-zinc-700';

  const titleClass =
    tone === 'success'
      ? 'text-ui-primary'
      : tone === 'warning'
        ? 'text-[#F7DC7F]'
      : tone === 'danger'
        ? 'text-orange-300'
      : tone === 'info'
            ? 'text-blue-300'
            : 'text-ui-secondary';

  return (
    <div
      className={cn(
        'relative pl-6',
        showConnector ? 'border-l border-ui-border-subtle pb-4' : '',
        className
      )}
      {...props}
    >
      <div className={cn('absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full', dotClass)} />
      <p className={cn('text-xs font-semibold', titleClass)}>{title}</p>
      {description ? <p className="text-[10px] text-ui-muted mt-1">{description}</p> : null}
      {timestamp ? <p className="text-[9px] font-mono text-ui-muted mt-1">{timestamp}</p> : null}
    </div>
  );
}

interface StudioListItemProps extends HTMLAttributes<HTMLDivElement> {
  left: ReactNode;
  center?: ReactNode;
  right?: ReactNode;
}

export function StudioListItem({ left, center, right, className, ...props }: StudioListItemProps) {
  return (
    <div className={cn('flex items-center gap-3', className)} {...props}>
      <div className="shrink-0">{left}</div>
      {center ? <div className="flex-1 min-w-0">{center}</div> : null}
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}
