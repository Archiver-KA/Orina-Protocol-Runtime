interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function ToggleSwitch({ 
  checked, 
  onChange, 
  disabled = false,
  className = '' 
}: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`
        relative inline-flex h-4 w-8 items-center rounded-full border border-ui-border-subtle transition-colors
        focus:outline-none focus:ring-2 focus:ring-[#2CC295] focus:ring-offset-2 focus:ring-offset-[var(--t-page-bg)]
        ${checked ? 'bg-[#2CC295] border-[#2CC295]' : 'bg-[var(--t-surface-10)]'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
    >
      <span
        className={`
          inline-block h-3 w-3 transform rounded-full bg-white transition-transform
          ${checked ? 'translate-x-[1.125rem]' : 'translate-x-0.5'}
        `}
      />
    </button>
  );
}
