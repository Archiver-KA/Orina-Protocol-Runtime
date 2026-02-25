import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, LucideIcon } from 'lucide-react';

type DropdownOption = string | { value: string; label: string };

interface CustomDropdownProps {
  options: DropdownOption[];
  defaultOption?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  icon?: LucideIcon;
  className?: string;
  variant?: 'default' | 'compact';
  placeholder?: string;
}

export function CustomDropdown({ 
  options, 
  defaultOption,
  defaultValue,
  onChange, 
  icon,
  className,
  variant = 'default',
  placeholder = 'Select an option'
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState(defaultValue || defaultOption || '');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ✅ Sync selected state when defaultValue changes (e.g., wallet switch reloads settings)
  useEffect(() => {
    if (defaultValue !== undefined) {
      setSelected(defaultValue);
    }
  }, [defaultValue]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getLabel = (option: DropdownOption): string => {
    return typeof option === 'string' ? option : option.label;
  };

  const getValue = (option: DropdownOption): string => {
    return typeof option === 'string' ? option : option.value;
  };

  const selectedOption = options.find(opt => getValue(opt) === selected);
  const selectedLabel = selectedOption ? getLabel(selectedOption) : (defaultOption || defaultValue || placeholder);

  const handleSelect = (option: DropdownOption) => {
    const value = getValue(option);
    setSelected(value);
    setIsOpen(false);
    if (onChange) {
      onChange(value);
    }
  };

  // Compact variant for Settings and Swap
  if (variant === 'compact') {
    return (
      <div ref={dropdownRef} className={`relative ${className || 'w-full'}`}>
        {/* Dropdown Button - Compact Style */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-zinc-900 border border-[#27272a] rounded-xl text-xs text-white hover:border-zinc-700 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#2CC295] focus-visible:border-[#2CC295]"
        >
          <span className="truncate">{selectedLabel}</span>
          <ChevronDown 
            size={16} 
            className={`transition-transform text-zinc-500 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Dropdown Menu - Compact Style with Style Guide specs */}
        {isOpen && (
          <div 
            className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a1c] border border-[#27272a] rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-[9999]"
            style={{
              backdropFilter: 'blur(8px)',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)',
            }}
          >
            {options.map((option, index) => {
              const value = getValue(option);
              const label = getLabel(option);
              const isSelected = selected === value;
              
              return (
                <button
                  key={`${value}-${index}`}
                  onClick={() => handleSelect(option)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-xs transition-colors text-left ${
                    isSelected 
                      ? 'bg-zinc-800/80 text-white' 
                      : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white'
                  }`}
                >
                  <span className="truncate">{label}</span>
                  {isSelected && (
                    <Check size={16} className="text-[#2CC295] flex-shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Default variant - Updated with Style Guide typography
  return (
    <div ref={dropdownRef} className={`relative ${className || 'w-40'}`}>
      {/* Dropdown Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-4 py-2 bg-zinc-900 border border-[#27272a] rounded-lg text-xs text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors focus:ring-1 focus:ring-[#2CC295] focus:border-[#2CC295] outline-none"
      >
        <div className="flex items-center gap-2 truncate">
          {icon && (() => { const Icon = icon; return <Icon size={14} className="text-zinc-500 flex-shrink-0" />; })()}
          <span className="truncate">{selectedLabel}</span>
        </div>
        <ChevronDown 
          size={14} 
          className={`transition-transform text-zinc-500 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu - Style Guide compliant */}
      {isOpen && (
        <div 
          className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1c] border border-[#27272a] rounded-xl shadow-2xl overflow-hidden z-50"
          style={{
            backdropFilter: 'blur(8px)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)',
          }}
        >
          {options.map((option, index) => {
            const value = getValue(option);
            const label = getLabel(option);
            const isSelected = selected === value;
            
            return (
              <button
                key={`${value}-${index}`}
                onClick={() => handleSelect(option)}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-xs transition-colors text-left ${
                  isSelected
                    ? 'bg-zinc-800/80 text-white'
                    : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white'
                }`}
              >
                <span className="truncate">{label}</span>
                {isSelected && (
                  <Check size={14} className="text-[#2CC295] flex-shrink-0 ml-2" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}