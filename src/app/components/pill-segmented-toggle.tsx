interface PillSegmentedToggleProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function PillSegmentedToggle({ options, value, onChange, className = '' }: PillSegmentedToggleProps) {
  return (
    <div className={`inline-flex p-1 bg-black/40 backdrop-blur-md border border-[#27272a]/50 rounded-full ${className}`}>
      {options.map((option) => {
        const isActive = value === option;
        return (
          <button
            key={option}
            onClick={() => onChange(option)}
            className={`
              relative px-6 py-2 text-sm font-bold rounded-full transition-all duration-300 ease-out
              ${isActive 
                ? 'bg-[#2CC295] text-black shadow-lg shadow-[#2CC295]/30' 
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }
            `}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
