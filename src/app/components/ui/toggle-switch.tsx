import { cn } from '@/app/components/ui/utils';

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
      className={cn(
        'relative inline-flex h-[18px] w-8 shrink-0 items-center rounded-full transition-all duration-200',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--t-accent-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--t-page-bg)]',
        checked
          ? 'bg-[var(--t-accent)] shadow-[inset_0_1px_3px_rgba(0,0,0,0.15)]'
          : 'bg-[rgba(255,255,255,0.1)] shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)]',
        disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer',
        className,
      )}
    >
      <span
        className={cn(
          'block h-[14px] w-[14px] rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.28),0_0.5px_1px_rgba(0,0,0,0.18)] transition-transform duration-200',
          checked ? 'translate-x-4' : 'translate-x-[2px]',
        )}
      />
    </button>
  );
}
