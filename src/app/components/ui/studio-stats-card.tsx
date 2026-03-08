import type { HTMLAttributes, ReactNode } from 'react';
import { StudioPanel } from '@/app/components/ui/studio-panel';
import { cn } from '@/app/components/ui/utils';

interface StudioStatsCardProps extends HTMLAttributes<HTMLDivElement> {
  label: ReactNode;
  value: ReactNode;
  meta?: ReactNode;
  icon?: ReactNode;
}

export function StudioStatsCard({
  label,
  value,
  meta,
  icon,
  children,
  className,
  ...props
}: StudioStatsCardProps) {
  return (
    <StudioPanel className={cn('rounded-2xl p-5', className)} {...props}>
      {children}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-bold text-ui-muted uppercase tracking-widest">{label}</span>
        {icon}
      </div>
      <div className="text-2xl font-bold text-ui-primary">{value}</div>
      {meta ? <div className="text-xs mt-1">{meta}</div> : null}
    </StudioPanel>
  );
}
