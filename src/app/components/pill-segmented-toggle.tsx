interface PillSegmentedToggleProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function PillSegmentedToggle({ options, value, onChange, className = '' }: PillSegmentedToggleProps) {
  return (
    <div className={`inline-flex w-full p-1 bg-ui-pill backdrop-blur-md rounded-full gap-1 ${className}`}>
      {options.map((option) => {
        const isActive = value === option;
        return (
          <button
            key={option}
            onClick={() => onChange(option)}
            className={`
              relative flex-1 min-w-0 px-4 py-2.5 text-sm font-bold rounded-full transition-all duration-200 ease-out
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
