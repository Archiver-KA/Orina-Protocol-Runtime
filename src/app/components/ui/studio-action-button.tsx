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
      ? 'w-10 h-10 p-0 rounded-lg'
      : size === 'lg'
        ? 'px-6 py-3 text-sm rounded-xl'
        : size === 'sm'
      ? 'px-3 py-1.5 text-xs rounded-lg'
      : 'px-4 py-2 text-xs rounded-lg';

  const variantClass =
    variant === 'primary'
      ? 'bg-[var(--color-button-primary-bg)] hover:bg-[var(--color-button-primary-bg-hover)] text-[var(--color-button-primary-fg)] border border-transparent'
      : variant === 'danger'
        ? 'bg-red-500 hover:bg-red-600 text-white border border-transparent'
      : variant === 'ghost'
        ? 'bg-transparent border border-transparent text-[var(--color-button-ghost-fg)] hover:text-[var(--color-button-ghost-fg-hover)] hover:bg-zinc-900/40'
        : 'bg-[var(--color-button-secondary-bg)] border border-[var(--color-button-secondary-border)] text-white hover:bg-[var(--color-button-secondary-bg-hover)] hover:border-[#2CC295]/40';

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 font-bold transition-colors',
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
