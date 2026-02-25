import type { HTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';
import { cn } from '@/app/components/ui/utils';

export function StudioFieldLabel({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        'block text-[10px] font-bold text-zinc-400 mb-2 uppercase tracking-widest',
        className
      )}
      {...props}
    >
      {children}
    </label>
  );
}

export function StudioFieldHint({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-xs text-zinc-500 mt-2', className)} {...props}>
      {children}
    </p>
  );
}

export function StudioFieldError({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex items-center gap-2 mt-2 text-red-400', className)} {...props}>
      {children}
    </div>
  );
}

type StudioInputFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  leftSlot?: ReactNode;
  rightSlot?: ReactNode;
  invalid?: boolean;
  wrapperClassName?: string;
  inputClassName?: string;
};

export function StudioInputField({
  leftSlot,
  rightSlot,
  invalid = false,
  className,
  wrapperClassName,
  inputClassName,
  ...props
}: StudioInputFieldProps) {
  const hasLeftSlot = !!leftSlot;
  const hasRightSlot = !!rightSlot;

  if (!hasLeftSlot && !hasRightSlot) {
    return (
      <input
        className={cn(
          'w-full px-4 py-3 bg-zinc-900/50 border rounded-xl text-sm text-white placeholder-zinc-600 transition-all',
          'focus:outline-none focus:border-[var(--color-primary-custom)] focus:ring-1 focus:ring-[color:color-mix(in_srgb,var(--color-primary-custom)_50%,transparent)]',
          invalid ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/30' : 'border-[var(--color-panel-border)]',
          className,
          inputClassName
        )}
        {...props}
      />
    );
  }

  return (
    <div className={cn('relative', wrapperClassName)}>
      {hasLeftSlot ? (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">
          {leftSlot}
        </div>
      ) : null}

      <input
        className={cn(
          'w-full py-3 bg-zinc-900/50 border rounded-xl text-sm text-white placeholder-zinc-600 transition-all',
          'focus:outline-none focus:border-[var(--color-primary-custom)] focus:ring-1 focus:ring-[color:color-mix(in_srgb,var(--color-primary-custom)_50%,transparent)]',
          hasLeftSlot ? 'pl-11' : 'pl-4',
          hasRightSlot ? 'pr-12' : 'pr-4',
          invalid ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/30' : 'border-[var(--color-panel-border)]',
          className,
          inputClassName
        )}
        {...props}
      />

      {hasRightSlot ? (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">
          {rightSlot}
        </div>
      ) : null}
    </div>
  );
}

type StudioNumberFieldProps = Omit<StudioInputFieldProps, 'type'>;

export function StudioNumberField(props: StudioNumberFieldProps) {
  return <StudioInputField type="number" {...props} />;
}

type StudioTextareaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
};

export function StudioTextareaField({
  invalid = false,
  className,
  ...props
}: StudioTextareaFieldProps) {
  return (
    <textarea
      className={cn(
        'w-full px-4 py-3 bg-zinc-900/50 border rounded-xl text-sm text-white placeholder-zinc-600 transition-all resize-none',
        'focus:outline-none focus:border-[var(--color-primary-custom)] focus:ring-1 focus:ring-[color:color-mix(in_srgb,var(--color-primary-custom)_50%,transparent)]',
        invalid ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/30' : 'border-[var(--color-panel-border)]',
        className
      )}
      {...props}
    />
  );
}
