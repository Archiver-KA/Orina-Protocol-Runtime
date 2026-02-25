import type { HTMLAttributes, ReactNode } from 'react';

interface StudioPanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function StudioPanel({ children, className = '', ...props }: StudioPanelProps) {
  return (
    <div
      className={`bg-[linear-gradient(180deg,var(--color-panel-highlight)_0%,rgba(255,255,255,0)_100%),var(--color-panel-surface)] border border-[var(--color-panel-border-soft)] shadow-[inset_0_1px_0_0_var(--color-panel-inset)] ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}
