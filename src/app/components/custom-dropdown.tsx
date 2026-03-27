import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ChevronDown, Check, LucideIcon } from 'lucide-react';
import { createPortal } from 'react-dom';

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
  openOnHover?: boolean;
  triggerStyle?: CSSProperties;
  disableDefaultTriggerTone?: boolean;
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
  menuClassName,
  openOnHover = true,
  triggerStyle,
  disableDefaultTriggerTone = false,
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState(defaultValue || defaultOption || '');
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ✅ Sync selected state when defaultValue changes (e.g., wallet switch reloads settings)
  useEffect(() => {
    if (defaultValue !== undefined) {
      setSelected(defaultValue);
    }
  }, [defaultValue]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedTrigger = dropdownRef.current?.contains(target);
      const clickedMenu = menuRef.current?.contains(target);
      if (!clickedTrigger && !clickedMenu) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isOpen || !dropdownRef.current || typeof window === 'undefined') {
      setMenuPosition(null);
      return;
    }

    const updatePosition = () => {
      if (!dropdownRef.current) return;
      const rect = dropdownRef.current.getBoundingClientRect();
      const gap = 8;
      const menuHeight = menuRef.current?.offsetHeight ?? 0;
      let top = rect.bottom + gap;
      let left = rect.left;
      const width = rect.width;

      if (top + menuHeight > window.innerHeight - 8 && rect.top - menuHeight - gap >= 8) {
        top = rect.top - menuHeight - gap;
      }

      if (left + width > window.innerWidth - 8) {
        left = Math.max(8, window.innerWidth - width - 8);
      }

      setMenuPosition({ top, left, width });
    };

    updatePosition();
    const rafId = window.requestAnimationFrame(updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, options.length]);

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

  const handleOpen = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setIsOpen(true);
  };

  const handleDelayedClose = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => setIsOpen(false), 120);
  };

  const portalMenu = (content: ReactNode) => {
    if (!isOpen || !menuPosition || typeof document === 'undefined') return null;

    return createPortal(
      <div
        ref={menuRef}
        className="fixed"
        style={{
          top: menuPosition.top,
          left: menuPosition.left,
          width: menuPosition.width,
          zIndex: 99999,
        }}
        onMouseEnter={openOnHover ? handleOpen : undefined}
        onMouseLeave={openOnHover ? handleDelayedClose : undefined}
      >
        {content}
      </div>,
      document.body
    );
  };

  // Compact variant for Settings and Swap
  if (variant === 'compact') {
    const compactToneClass = disableDefaultTriggerTone
      ? ''
      : 'bg-ui-input border border-ui-border-subtle hover:bg-ui-input-focus';

    return (
      <div
        ref={dropdownRef}
        className={`relative overflow-visible ${isOpen ? 'z-[9999]' : ''} ${className || 'w-full'}`}
        onMouseEnter={openOnHover ? handleOpen : undefined}
        onMouseLeave={openOnHover ? handleDelayedClose : undefined}
      >
        {/* Dropdown Button - Compact Style */}
        <button
          onClick={() => setIsOpen(openOnHover ? true : !isOpen)}
          className={`relative overflow-hidden w-full h-[43px] flex items-center justify-between gap-2 px-4 rounded-full text-sm text-ui-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2CC295]/35 ${compactToneClass} ${triggerClassName || ''}`}
          style={triggerStyle}
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
        {portalMenu(
          <div 
            className={`dropdown-panel rounded-[24px] overflow-hidden ${menuClassName || ''}`}
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
                        : 'bg-[var(--t-surface-10)] text-ui-primary'
                      : 'text-ui-secondary hover:bg-[var(--t-surface-5)] hover:text-ui-primary'
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
    <div
      ref={dropdownRef}
      className={`relative overflow-visible ${isOpen ? 'z-[9999]' : ''} ${className || 'w-40'}`}
      onMouseEnter={openOnHover ? handleOpen : undefined}
      onMouseLeave={openOnHover ? handleDelayedClose : undefined}
    >
      {/* Dropdown Button */}
      <button
        onClick={() => setIsOpen(openOnHover ? true : !isOpen)}
        className={`relative overflow-hidden w-full h-[43px] flex items-center justify-between gap-2 px-4 bg-[rgba(255,255,255,0.03)] rounded-full text-sm text-ui-secondary hover:text-ui-primary hover:bg-[rgba(255,255,255,0.05)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2CC295]/35 ${triggerClassName || ''}`}
        style={triggerStyle}
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
      {portalMenu(
        <div 
          className={`dropdown-panel rounded-[24px] overflow-hidden ${menuClassName || ''}`}
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
                      : 'bg-[var(--t-surface-10)] text-ui-primary'
                    : 'text-ui-secondary hover:bg-[var(--t-surface-5)] hover:text-ui-primary'
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
