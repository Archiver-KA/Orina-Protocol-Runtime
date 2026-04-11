import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/app/components/ui/utils';
import { StudioActionButton } from '@/app/components/ui/studio-action-button';

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
      className={cn('absolute inset-0 bg-black/70 backdrop-blur-[10px]', className)}
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
        'studio-modal-theme ui-card-surface w-full max-h-[90vh] overflow-hidden flex flex-col rounded-[24px] text-ui-secondary',
        'bg-ui-card backdrop-blur-[20px] shadow-[0_24px_60px_-32px_rgba(0,0,0,0.8)]',
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
    <div className={cn('p-6 border-b border-ui-border-subtle', className)} {...props}>
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
      className={cn('p-6 border-t border-ui-border-subtle flex gap-3', className)}
      {...props}
    >
      {children}
    </div>
  );
}

interface StudioModalCloseButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  iconSize?: number;
}

export function StudioModalCloseButton({
  className,
  iconSize = 20,
  ...props
}: StudioModalCloseButtonProps) {
  return (
    <StudioActionButton
      type="button"
      size="icon"
      variant="secondary"
      className={cn('text-ui-muted hover:text-ui-primary', className)}
      aria-label="Close modal"
      title="Close"
      {...props}
    >
      <X size={iconSize} />
    </StudioActionButton>
  );
}
