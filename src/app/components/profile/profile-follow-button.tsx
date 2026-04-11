import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/app/components/ui/utils';

interface ProfileFollowButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  following: boolean;
}

export function ProfileFollowButton({
  following,
  className,
  children,
  ...props
}: ProfileFollowButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex h-10 min-w-[96px] items-center justify-center rounded-full border px-4 text-[12px] font-semibold leading-none tracking-[-0.01em] transition-[background-color,border-color,color,box-shadow]',
        following
          ? 'border-[rgba(44,194,149,0.24)] bg-[rgba(44,194,149,0.12)] text-[var(--color-primary-custom)] hover:bg-[rgba(44,194,149,0.18)]'
          : 'ui-secondary-button',
        className
      )}
      {...props}
    >
      {children ?? (following ? 'Following' : 'Follow')}
    </button>
  );
}
