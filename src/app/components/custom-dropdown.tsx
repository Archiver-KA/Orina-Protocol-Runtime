import { useState, useRef, useEffect, ReactNode } from 'react';
import { ChevronDown, Check, LucideIcon } from 'lucide-react';

type DropdownOptionObject = {
  value: string;
  label: string;
  icon?: ReactNode;
  tag?: string;
};

type DropdownOption = string | DropdownOptionObject;

interface CustomDropdownProps {
  options: DropdownOption[];
  defaultOption?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  icon?: LucideIcon;
  className?: string;
  variant?: 'default' | 'compact';
  placeholder?: string;
  splitRightPane?: boolean;
  triggerClassName?: string;
  menuClassName?: string;
}

export function CustomDropdown({ 
  options, 
  defaultOption,
  defaultValue,
  onChange, 
  icon,
  className,
  variant = 'default',
  placeholder = 'Select an option',
  splitRightPane = false,
  triggerClassName,
  menuClassName
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

  const getOptionObject = (option: DropdownOption): DropdownOptionObject => {
    if (typeof option === 'string') {
      return { value: option, label: option };
    }
    return option;
  };

  const selectedOption = options.find(opt => getValue(opt) === selected);
  const selectedOptionObject = selectedOption ? getOptionObject(selectedOption) : null;
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
          className={`relative overflow-hidden w-full h-[43px] flex items-center justify-between gap-2 px-4 bg-[rgba(255,255,255,0.03)] rounded-full text-sm text-ui-primary hover:bg-[rgba(255,255,255,0.05)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2CC295]/35 ${triggerClassName || ''}`}
        >
          <div className="relative z-10 min-w-0 flex items-center gap-2">
            {selectedOptionObject?.icon && (
              <span className="shrink-0">{selectedOptionObject.icon}</span>
            )}
            <span className="truncate">{selectedLabel}</span>
            {selectedOptionObject?.tag && (
              <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-[0.5px] bg-[rgba(44,194,149,0.14)] text-[#2CC295]">
                {selectedOptionObject.tag}
              </span>
            )}
          </div>
          <ChevronDown 
            size={16} 
            className={`transition-transform text-ui-muted flex-shrink-0 relative z-10 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Dropdown Menu - Compact Style with Style Guide specs */}
        {isOpen && (
          <div 
            className={`absolute top-full left-0 right-0 mt-2 dropdown-panel rounded-[24px] overflow-hidden z-[9999] ${menuClassName || ''}`}
          >
            {options.map((option, index) => {
              const optionObject = getOptionObject(option);
              const value = optionObject.value;
              const label = optionObject.label;
              const isSelected = selected === value;
              const hasVisualMeta = Boolean(optionObject.icon || optionObject.tag);
              
              return (
                <button
                  key={`${value}-${index}`}
                  onClick={() => handleSelect(option)}
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors text-left ${
                    isSelected 
                      ? hasVisualMeta
                        ? 'bg-[rgba(44,194,149,0.16)] text-ui-primary'
                        : 'bg-[rgba(255,255,255,0.08)] text-white'
                      : 'text-ui-secondary hover:bg-[rgba(255,255,255,0.05)] hover:text-ui-primary'
                  }`}
                >
                  <div className="min-w-0 flex items-center gap-2.5">
                    {optionObject.icon && <span className="shrink-0">{optionObject.icon}</span>}
                    <span className="truncate">{label}</span>
                    {optionObject.tag && (
                      <span className="shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.5px] bg-[rgba(44,194,149,0.14)] text-[#2CC295]">
                        {optionObject.tag}
                      </span>
                    )}
                  </div>
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
        className={`relative overflow-hidden w-full h-[43px] flex items-center justify-between gap-2 px-4 bg-[rgba(255,255,255,0.03)] rounded-full text-sm text-ui-secondary hover:text-ui-primary hover:bg-[rgba(255,255,255,0.05)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2CC295]/35 ${triggerClassName || ''}`}
      >
        <div className="flex items-center gap-2 truncate relative z-10">
          {icon && (() => { const Icon = icon; return <Icon size={14} className="text-ui-muted flex-shrink-0" />; })()}
          {selectedOptionObject?.icon && (
            <span className="flex-shrink-0">{selectedOptionObject.icon}</span>
          )}
          <span className="truncate">{selectedLabel}</span>
          {selectedOptionObject?.tag && (
            <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-[0.5px] bg-[rgba(44,194,149,0.14)] text-[#2CC295]">
              {selectedOptionObject.tag}
            </span>
          )}
        </div>
        <ChevronDown 
          size={14} 
          className={`transition-transform text-ui-muted flex-shrink-0 relative z-10 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu - Style Guide compliant */}
      {isOpen && (
        <div 
          className={`absolute top-full left-0 right-0 mt-2 dropdown-panel rounded-[24px] overflow-hidden z-50 ${menuClassName || ''}`}
        >
          {options.map((option, index) => {
            const optionObject = getOptionObject(option);
            const value = optionObject.value;
            const label = optionObject.label;
            const isSelected = selected === value;
            const hasVisualMeta = Boolean(optionObject.icon || optionObject.tag);
            
            return (
              <button
                key={`${value}-${index}`}
                onClick={() => handleSelect(option)}
                className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors text-left ${
                  isSelected
                    ? hasVisualMeta
                      ? 'bg-[rgba(44,194,149,0.16)] text-ui-primary'
                      : 'bg-[rgba(255,255,255,0.08)] text-white'
                    : 'text-ui-secondary hover:bg-[rgba(255,255,255,0.05)] hover:text-ui-primary'
                }`}
              >
                <div className="min-w-0 flex items-center gap-2.5">
                  {optionObject.icon && <span className="shrink-0">{optionObject.icon}</span>}
                  <span className="truncate">{label}</span>
                  {optionObject.tag && (
                    <span className="shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.5px] bg-[rgba(44,194,149,0.14)] text-[#2CC295]">
                      {optionObject.tag}
                    </span>
                  )}
                </div>
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
