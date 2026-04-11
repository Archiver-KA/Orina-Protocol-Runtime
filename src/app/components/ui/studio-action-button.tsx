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
  const classNameString = typeof className === 'string' ? className : '';
  const hasCustomSurfaceOverride = /(^|\s)!?(?:bg-|border-|shadow-|backdrop-blur|\[background:|\[border:)/.test(classNameString);

  const sizeClass =
    size === 'icon'
      ? 'h-11 w-11 p-0'
      : size === 'lg'
        ? 'min-h-12 px-6 py-3 text-[13px]'
        : size === 'sm'
      ? 'min-h-8 px-3 py-1.5 text-[11px]'
      : 'min-h-11 px-4 py-2 text-[12px]';

  const variantClass =
    variant === 'primary'
      ? 'border border-transparent bg-[var(--color-button-primary-bg)] text-[var(--color-button-primary-fg)] shadow-[0_18px_35px_-24px_rgba(0,0,0,0.55)] hover:bg-[var(--color-button-primary-bg-hover)]'
      : variant === 'danger'
        ? 'border border-transparent bg-[#E05252] text-white shadow-[0_18px_35px_-24px_rgba(224,82,82,0.48)] hover:bg-[#C64343]'
      : variant === 'ghost'
        ? hasCustomSurfaceOverride
          ? 'studio-action-button--ghost border border-transparent bg-transparent text-[var(--color-button-ghost-fg)] hover:bg-[var(--t-surface-5)] hover:text-[var(--color-button-ghost-fg-hover)]'
          : 'studio-action-button--ghost ui-ghost-button border border-transparent'
        : hasCustomSurfaceOverride
          ? 'studio-action-button--secondary border border-[var(--color-button-secondary-border)] bg-[var(--color-button-secondary-bg)] text-ui-primary hover:bg-[var(--color-button-secondary-bg-hover)] backdrop-blur-[10px]'
          : 'studio-action-button--secondary ui-secondary-button border';

  return (
    <button
      className={cn(
        'studio-action-button inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-[-0.01em] transition-[background-color,border-color,color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2CC295]/35',
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
