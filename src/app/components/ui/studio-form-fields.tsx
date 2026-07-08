import type { HTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';
import { cn } from '@/app/components/ui/utils';
import { preventInvalidNumberKeyDown } from '@/utils/numericInput';

export function StudioFieldLabel({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        'block text-[10px] font-semibold text-ui-muted mb-2 uppercase tracking-widest',
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
    <p className={cn('text-xs text-ui-muted mt-2', className)} {...props}>
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
          'w-full px-4 py-3 bg-ui-input border border-ui-border-subtle rounded-full text-sm text-ui-primary placeholder:text-ui-muted transition-all',
          'focus:outline-none focus:ring-2 focus:ring-[var(--t-accent-ring)]',
          invalid ? 'focus:ring-red-500/30' : '',
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
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-ui-muted pointer-events-none">
          {leftSlot}
        </div>
      ) : null}

      <input
        className={cn(
          'w-full py-3 bg-ui-input border border-ui-border-subtle rounded-full text-sm text-ui-primary placeholder:text-ui-muted transition-all',
          'focus:outline-none focus:ring-2 focus:ring-[var(--t-accent-ring)]',
          hasLeftSlot ? 'pl-11' : 'pl-4',
          hasRightSlot ? 'pr-12' : 'pr-4',
          invalid ? 'focus:ring-red-500/30' : '',
          className,
          inputClassName
        )}
        {...props}
      />

      {hasRightSlot ? (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-ui-muted pointer-events-none">
          {rightSlot}
        </div>
      ) : null}
    </div>
  );
}

type StudioNumberFieldProps = Omit<StudioInputFieldProps, 'type'>;

export function StudioNumberField(props: StudioNumberFieldProps) {
  const { onKeyDown, inputMode, ...rest } = props;

  return (
    <StudioInputField
      type="number"
      inputMode={inputMode ?? 'numeric'}
      onKeyDown={(event) => {
        preventInvalidNumberKeyDown(event);
        onKeyDown?.(event);
      }}
      {...rest}
    />
  );
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
        'w-full px-4 py-3 bg-ui-input border border-ui-border-subtle rounded-[20px] text-sm text-ui-primary placeholder:text-ui-muted transition-all resize-none',
        'focus:outline-none focus:ring-2 focus:ring-[var(--t-accent-ring)]',
        invalid ? 'focus:ring-red-500/30' : '',
        className
      )}
      {...props}
    />
  );
}
