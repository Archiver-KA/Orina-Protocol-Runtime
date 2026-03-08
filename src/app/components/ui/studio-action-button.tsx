import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/app/components/ui/utils';

type StudioActionButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type StudioActionButtonSize = 'sm' | 'md' | 'lg' | 'icon';

interface StudioActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: StudioActionButtonVariant;
  size?: StudioActionButtonSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export function StudioActionButton({
  children,
  className,
  variant = 'secondary',
  size = 'md',
  leftIcon,
  rightIcon,
  ...props
}: StudioActionButtonProps) {
  const sizeClass =
    size === 'icon'
      ? 'w-10 h-10 p-0 rounded-full'
      : size === 'lg'
        ? 'px-6 py-3 text-sm rounded-full'
        : size === 'sm'
      ? 'px-3 py-1.5 text-xs rounded-full'
      : 'px-4 py-2 text-xs rounded-full';

  const variantClass =
    variant === 'primary'
      ? 'bg-[var(--color-button-primary-bg)] hover:bg-[var(--color-button-primary-bg-hover)] text-[var(--color-button-primary-fg)] border-0'
      : variant === 'danger'
        ? 'bg-red-500 hover:bg-red-600 text-white border-0'
      : variant === 'ghost'
        ? 'bg-transparent border-0 text-[var(--color-button-ghost-fg)] hover:text-[var(--color-button-ghost-fg-hover)] hover:bg-[var(--t-surface-5)]'
        : 'bg-[var(--color-button-secondary-bg)] border border-ui-border-subtle text-ui-primary hover:bg-[var(--color-button-secondary-bg-hover)] backdrop-blur-[10px]';

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2CC295]/35',
        sizeClass,
        variantClass,
        className
      )}
      {...props}
    >
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  );
}
