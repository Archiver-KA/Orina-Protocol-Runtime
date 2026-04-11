import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/app/components/ui/utils';

interface StudioPanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  elevation?: 'default' | 'none';
}

export function StudioPanel({
  children,
  className = '',
  elevation = 'none',
  ...props
}: StudioPanelProps) {
  return (
    <div
      className={cn(
        'ui-card-surface rounded-[24px] bg-ui-card backdrop-blur-[14px]',
        elevation === 'default' ? 'shadow-[0_24px_60px_-42px_rgba(0,0,0,0.34)]' : 'shadow-none',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
