interface BadgeProps {
  children: React.ReactNode;
  variant?: 'rwa' | 'legendary' | 'epic' | 'rare' | 'common';
  position?: 'top-left' | 'top-right';
  className?: string;
}

export function Badge({ children, variant = 'rwa', position = 'top-left', className = '' }: BadgeProps) {
  const variantStyles = {
    rwa: 'text-[#2CC295] bg-[rgba(44,194,149,0.12)]',
    legendary: 'text-[#2CC295] bg-[rgba(44,194,149,0.12)]',
    epic: 'text-purple-300 bg-[rgba(196,181,253,0.12)]',
    rare: 'text-blue-300 bg-[rgba(147,197,253,0.12)]',
    common: 'text-zinc-400 bg-[rgba(255,255,255,0.06)]',
  };

  const positionStyles = {
    'top-left': 'top-3 left-3',
    'top-right': 'top-3 right-3',
  };

  return (
    <div
      className={`absolute ${positionStyles[position]} backdrop-blur-md px-2.5 py-1 rounded-full text-[9px] font-bold ${variantStyles[variant]} border-0 uppercase tracking-wider ${className}`}
    >
      {children}
    </div>
  );
}
