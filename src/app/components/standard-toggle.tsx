interface StandardToggleProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function StandardToggle({ options, value, onChange, className = '' }: StandardToggleProps) {
  return (
    <div className={`inline-flex bg-zinc-900 border border-[#27272a] rounded-lg p-1 ${className}`}>
      {options.map((option) => {
        const isActive = value === option;
        return (
          <button
            key={option}
            onClick={() => onChange(option)}
            className={`
              px-4 py-2 text-xs font-bold rounded-md transition-all duration-200
              ${isActive 
                ? 'bg-[#2CC295] text-black' 
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
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
