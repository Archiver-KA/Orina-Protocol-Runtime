import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/app/components/ui/utils';

interface BaseProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

interface ShellProps extends BaseProps {
  widthClassName?: string;
}

export function StudioSidebarShell({
  children,
  className,
  widthClassName = 'w-80',
  ...props
}: ShellProps) {
  return (
    <aside
      className={cn(
        widthClassName,
        'flex h-full min-h-0 shrink-0 flex-col overflow-hidden bg-ui-sidebar',
        className
      )}
      {...props}
    >
      {children}
    </aside>
  );
}

export function StudioSidebarHeader({ children, className, ...props }: BaseProps) {
  return (
    <div className={cn('shrink-0 p-6 border-b border-[var(--color-panel-border)]', className)} {...props}>
      {children}
    </div>
  );
}

export function StudioSidebarScroll({ children, className, ...props }: BaseProps) {
  return (
    <>
      <style>{`.hidden-scrollbar::-webkit-scrollbar { display: none; }`}</style>
      <div
        className={cn('min-h-0 flex-1 overflow-y-auto hidden-scrollbar p-4 space-y-6', className)}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        {...props}
      >
        {children}
      </div>
    </>
  );
}

export function StudioSidebarFooter({ children, className, ...props }: BaseProps) {
  return (
    <div
      className={cn(
        'border-t border-[var(--color-panel-border)] p-4 bg-[var(--color-sidebar-footer)] backdrop-blur-md space-y-3 flex-shrink-0',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
