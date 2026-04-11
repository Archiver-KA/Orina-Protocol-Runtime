import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/app/components/ui/utils';

interface StudioPageHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  compact?: boolean;
}

export function StudioPageHeader({
  title,
  subtitle,
  actions,
  compact = false,
  className,
  ...props
}: StudioPageHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4',
        compact ? 'mb-6' : 'mb-8',
        className
      )}
      {...props}
    >
      <div className="min-w-0">
        <h1 className={cn('font-semibold text-ui-primary tracking-[-0.02em]', compact ? 'text-2xl' : 'text-2xl')}>{title}</h1>
        {subtitle ? <p className="text-sm text-ui-muted mt-1">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-3 flex-shrink-0">{actions}</div> : null}
    </div>
  );
}
