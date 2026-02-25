import { Check, Minus } from 'lucide-react';

interface BulkSelectCheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  className?: string;
}

export function BulkSelectCheckbox({
  checked,
  indeterminate = false,
  onChange,
  className = '',
}: BulkSelectCheckboxProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      className={`
        w-5 h-5 rounded border-2 flex items-center justify-center transition-all
        ${checked || indeterminate
          ? 'bg-[#2CC295] border-[#2CC295]'
          : 'border-zinc-600 hover:border-zinc-400 bg-zinc-900'
        }
        ${className}
      `}
      type="button"
    >
      {indeterminate ? (
        <Minus size={12} className="text-black" strokeWidth={3} />
      ) : checked ? (
        <Check size={12} className="text-black" strokeWidth={3} />
      ) : null}
    </button>
  );
}
