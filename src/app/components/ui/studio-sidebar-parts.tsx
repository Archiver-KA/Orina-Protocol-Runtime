import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/app/components/ui/utils';
import { StudioPanel } from '@/app/components/ui/studio-panel';

interface BaseProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function SidebarSectionTitle({ children, className, ...props }: BaseProps) {
  return (
    <div
      className={cn(
        'text-[11px] uppercase tracking-[0.15em] font-bold text-zinc-500 px-2 flex items-center gap-2',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function SidebarStatCard({ children, className, ...props }: BaseProps) {
  return (
    <StudioPanel className={cn('rounded-xl p-4', className)} {...props}>
      {children}
    </StudioPanel>
  );
}

