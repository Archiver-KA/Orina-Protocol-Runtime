interface PillSegmentedToggleProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function PillSegmentedToggle({ options, value, onChange, className = '' }: PillSegmentedToggleProps) {
  return (
    <div className={`inline-flex w-full p-1 bg-ui-pill backdrop-blur-md rounded-full gap-1 border border-ui-border-subtle ${className}`}>
      {options.map((option) => {
        const isActive = value === option;
        return (
          <button
            key={option}
            onClick={() => onChange(option)}
            className={`
              relative flex-1 min-w-0 px-4 py-2.5 text-sm font-bold rounded-full border transition-all duration-200 ease-out
              ${isActive 
                ? 'bg-[#2CC295] text-black border-[#2CC295]'
                : 'bg-ui-input text-ui-secondary border-ui-border-subtle hover:text-ui-primary hover:bg-ui-input-focus'
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
