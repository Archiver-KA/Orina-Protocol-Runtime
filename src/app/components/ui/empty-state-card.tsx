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
      <div className="w-16 h-16 rounded-2xl bg-zinc-950/80 border border-[#27272a] flex items-center justify-center mx-auto mb-5">
        {icon}
      </div>
      <h3 className="text-2xl font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-zinc-500 max-w-sm mx-auto">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </StudioPanel>
  );
}

