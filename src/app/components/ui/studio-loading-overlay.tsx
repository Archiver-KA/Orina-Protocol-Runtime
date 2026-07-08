import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/app/components/ui/utils';
import { StudioLoadingIndicator } from '@/app/components/ui/studio-loading-indicator';

interface StudioLoadingOverlayProps extends HTMLAttributes<HTMLDivElement> {
  visible?: boolean;
  children?: ReactNode;
  label?: ReactNode;
  subLabel?: ReactNode;
  size?: number;
  panel?: boolean;
  panelClassName?: string;
}

export function StudioLoadingOverlay({
  visible = true,
  children,
  label,
  subLabel,
  size = 28,
  panel = true,
  className,
  panelClassName,
  ...props
}: StudioLoadingOverlayProps) {
  if (!visible) return null;

  return (
    <div
      className={cn(
        'absolute inset-0 z-10 flex items-center justify-center bg-black/55 backdrop-blur-sm',
        className
      )}
      {...props}
    >
      {children ?? (
        <div
          className={cn(
            panel && 'rounded-xl border border-[var(--color-panel-border)] bg-[var(--t-dropdown-glass-bg)] px-4 py-3',
            panelClassName
          )}
        >
          <StudioLoadingIndicator
            layout="stacked"
            tone="primary"
            size={size}
            label={label}
            subLabel={subLabel}
          />
        </div>
      )}
    </div>
  );
}
