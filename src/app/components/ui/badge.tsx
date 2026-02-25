interface BadgeProps {
  children: React.ReactNode;
  variant?: 'rwa' | 'legendary' | 'epic' | 'rare' | 'common';
  position?: 'top-left' | 'top-right';
  className?: string;
}

export function Badge({ children, variant = 'rwa', position = 'top-left', className = '' }: BadgeProps) {
  const variantStyles = {
    rwa: 'text-[#2CC295] border-[#2CC295]/30',
    legendary: 'text-[#2CC295] border-[#2CC295]/30',
    epic: 'text-purple-400 border-purple-400/30',
    rare: 'text-blue-400 border-blue-400/30',
    common: 'text-zinc-400 border-zinc-400/30',
  };

  const positionStyles = {
    'top-left': 'top-3 left-3',
    'top-right': 'top-3 right-3',
  };

  return (
    <div
      className={`absolute ${positionStyles[position]} bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full text-[9px] font-bold ${variantStyles[variant]} border uppercase tracking-wider ${className}`}
    >
      {children}
    </div>
  );
}