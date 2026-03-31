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
        'inline-flex h-[38px] min-w-[84px] items-center justify-center rounded-full border px-4 text-[12px] font-bold leading-none transition-colors backdrop-blur-md',
        following
          ? 'border-[rgba(44,194,149,0.28)] bg-[rgba(44,194,149,0.14)] text-[var(--color-primary-custom)] hover:bg-[rgba(44,194,149,0.2)]'
          : 'border-white/75 bg-white/95 text-[#0b0d12] hover:bg-white',
        className
      )}
      {...props}
    >
      {children ?? (following ? 'Following' : 'Follow')}
    </button>
  );
}
