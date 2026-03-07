interface StandardToggleProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function StandardToggle({ options, value, onChange, className = '' }: StandardToggleProps) {
  return (
    <div className={`inline-flex w-full bg-ui-pill rounded-full p-1 gap-1 ${className}`}>
      {options.map((option) => {
        const isActive = value === option;
        return (
          <button
            key={option}
            onClick={() => onChange(option)}
            className={`
              flex-1 min-w-0 px-4 py-2.5 text-xs font-bold rounded-full transition-all duration-200
              ${isActive 
                ? 'bg-[#2CC295] text-black' 
                : 'text-ui-secondary hover:text-ui-primary hover:bg-[rgba(255,255,255,0.05)]'
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
