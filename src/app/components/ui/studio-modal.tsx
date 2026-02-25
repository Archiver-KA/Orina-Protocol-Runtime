import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/app/components/ui/utils';

interface StudioModalBackdropProps extends HTMLAttributes<HTMLDivElement> {
  onBackdropClick?: () => void;
}

export function StudioModalBackdrop({
  className,
  onBackdropClick,
  ...props
}: StudioModalBackdropProps) {
  return (
    <div
      className={cn('absolute inset-0 bg-black/80 backdrop-blur-sm', className)}
      onClick={onBackdropClick}
      {...props}
    />
  );
}

interface StudioModalShellProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function StudioModalShell({ className, children, ...props }: StudioModalShellProps) {
  return (
    <div
      className={cn('fixed inset-0 z-50 flex items-center justify-center p-4', className)}
      {...props}
    >
      {children}
    </div>
  );
}

interface StudioModalPanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function StudioModalPanel({ className, children, ...props }: StudioModalPanelProps) {
  return (
    <div
      className={cn(
        'w-full max-h-[90vh] overflow-hidden flex flex-col rounded-2xl',
        'bg-[linear-gradient(180deg,var(--color-panel-highlight)_0%,rgba(255,255,255,0)_100%),var(--color-panel-surface)] border border-[var(--color-panel-border-soft)] shadow-[0_8px_32px_rgba(0,0,0,0.4)]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface StudioModalHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function StudioModalHeader({ className, children, ...props }: StudioModalHeaderProps) {
  return (
    <div className={cn('p-6 border-b border-[var(--color-panel-border)]', className)} {...props}>
      {children}
    </div>
  );
}

interface StudioModalBodyProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  scrollable?: boolean;
}

export function StudioModalBody({
  className,
  children,
  scrollable = true,
  ...props
}: StudioModalBodyProps) {
  return (
    <div
      className={cn(
        scrollable ? 'flex-1 overflow-y-auto custom-scrollbar min-h-0' : '',
        'p-6',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface StudioModalFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function StudioModalFooter({ className, children, ...props }: StudioModalFooterProps) {
  return (
    <div
      className={cn('p-6 border-t border-[var(--color-panel-border)] flex gap-3', className)}
      {...props}
    >
      {children}
    </div>
  );
}
