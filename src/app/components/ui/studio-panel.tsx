import type { HTMLAttributes, ReactNode } from 'react';

interface StudioPanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function StudioPanel({ children, className = '', ...props }: StudioPanelProps) {
  return (
    <div
      className={`bg-[rgba(255,255,255,0.02)] border-0 ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}
