interface StandardToggleProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function StandardToggle({ options, value, onChange, className = '' }: StandardToggleProps) {
  return (
    <div className={`inline-flex w-full bg-[var(--t-surface-5)] rounded-lg p-1 gap-1 ${className}`}>
      {options.map((option) => {
        const isActive = value === option;
        return (
          <button
            key={option}
            onClick={() => onChange(option)}
            className={`
              flex-1 min-w-0 px-4 py-2.5 text-xs font-semibold rounded-md transition-all duration-200
              ${isActive 
                ? 'bg-[#2CC295] text-black shadow-[0_8px_18px_-16px_rgba(44,194,149,0.9)]' 
                : 'bg-transparent text-ui-secondary hover:text-ui-primary hover:bg-ui-input-focus'
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
