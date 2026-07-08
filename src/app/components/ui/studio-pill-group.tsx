import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/app/components/ui/utils';
import { StudioPanel } from '@/app/components/ui/studio-panel';

interface StudioPillGroupProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  compact?: boolean;
}

interface StudioPillButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  children: ReactNode;
}

export function StudioPillGroup({
  children,
  className,
  compact = false,
  ...props
}: StudioPillGroupProps) {
  return (
    <StudioPanel
      className={cn(
        'inline-flex items-center gap-1 p-1 rounded-full',
        compact && 'gap-0.5',
        className
      )}
      {...props}
    >
      {children}
    </StudioPanel>
  );
}

export function StudioPillButton({
  active = false,
  children,
  className,
  ...props
}: StudioPillButtonProps) {
  return (
    <button
      className={cn(
        'px-5 py-2 rounded-full text-xs font-semibold transition-all',
        active
          ? 'bg-[var(--color-pill-active-bg)] text-[var(--color-pill-active-fg)] shadow-lg shadow-[var(--t-accent-ring-soft)]'
          : 'text-ui-secondary hover:text-ui-primary',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
