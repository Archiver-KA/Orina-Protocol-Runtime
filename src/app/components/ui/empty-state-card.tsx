import type { ReactNode } from 'react';
import { StudioPanel } from '@/app/components/ui/studio-panel';

interface EmptyStateCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyStateCard({
  icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateCardProps) {
  return (
    <StudioPanel className={`rounded-2xl py-16 px-6 text-center ${className}`.trim()}>
      <div className="w-16 h-16 rounded-2xl bg-[var(--t-surface-5)] border border-ui-border-subtle flex items-center justify-center mx-auto mb-5">
        {icon}
      </div>
      <h3 className="text-2xl font-bold text-ui-primary mb-2">{title}</h3>
      <p className="text-sm text-ui-secondary max-w-sm mx-auto">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </StudioPanel>
  );
}
