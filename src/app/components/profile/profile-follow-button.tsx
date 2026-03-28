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
        'inline-flex h-[36px] min-w-[73px] items-center justify-center rounded-full border px-4 text-[12px] font-bold leading-none transition-colors backdrop-blur-md',
        following
          ? 'border-[rgba(44,194,149,0.28)] bg-[rgba(44,194,149,0.14)] text-[var(--color-primary-custom)] hover:bg-[rgba(44,194,149,0.2)]'
          : 'border-white/10 bg-[rgba(255,255,255,0.02)] text-[#F1F5F9] hover:bg-[rgba(255,255,255,0.06)]',
        className
      )}
      {...props}
    >
      {children ?? (following ? 'Following' : 'Follow')}
    </button>
  );
}
