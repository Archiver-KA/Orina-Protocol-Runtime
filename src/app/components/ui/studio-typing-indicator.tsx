import type { HTMLAttributes } from 'react';
import { cn } from '@/app/components/ui/utils';

type StudioTypingTone = 'muted' | 'primary' | 'light' | 'inherit';

interface StudioTypingIndicatorProps extends HTMLAttributes<HTMLDivElement> {
  dots?: number;
  dotSize?: number;
  tone?: StudioTypingTone;
}

export function StudioTypingIndicator({
  dots = 3,
  dotSize = 8,
  tone = 'muted',
  className,
  ...props
}: StudioTypingIndicatorProps) {
  const toneClass =
    tone === 'primary'
      ? 'bg-[var(--color-primary-custom)]'
      : tone === 'light'
        ? 'bg-white/80'
        : tone === 'inherit'
          ? 'bg-current'
          : 'bg-zinc-500';

  return (
    <div className={cn('flex items-center gap-1', className)} {...props}>
      {Array.from({ length: dots }).map((_, index) => (
        <div
          key={index}
          className={cn('rounded-full animate-bounce', toneClass)}
          style={{
            width: dotSize,
            height: dotSize,
            animationDelay: `${index * 150}ms`,
          }}
        />
      ))}
    </div>
  );
}
