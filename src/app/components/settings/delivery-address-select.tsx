import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Loader2, RotateCcw, Search } from 'lucide-react';
import { createPortal } from 'react-dom';
import { cn } from '@/app/components/ui/utils';

export interface DeliveryAddressSelectOption {
  id: string;
  label: string;
  meta?: string;
}

interface DeliveryAddressSelectProps {
  options: DeliveryAddressSelectOption[];
  selectedId?: string;
  placeholder: string;
  searchPlaceholder: string;
  emptyText?: string;
  disabled?: boolean;
  loading?: boolean;
  invalid?: boolean;
  onSelect: (option: DeliveryAddressSelectOption) => void;
  onRetry?: () => void;
}

function matchesQuery(option: DeliveryAddressSelectOption, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return `${option.label} ${option.meta || ''}`.toLowerCase().includes(q);
}

export function DeliveryAddressSelect({
  options,
  selectedId,
  placeholder,
  searchPlaceholder,
  emptyText = 'No options found.',
  disabled = false,
  loading = false,
  invalid = false,
  onSelect,
  onRetry,
}: DeliveryAddressSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selectedOption = useMemo(
    () => options.find((option) => option.id === selectedId) || null,
    [options, selectedId]
  );

  const filteredOptions = useMemo(
    () => options.filter((option) => matchesQuery(option, query)),
    [options, query]
  );

  useEffect(() => {
    if (!open) {
      setQuery('');
    }
  }, [open, selectedOption?.id]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedTrigger = wrapperRef.current?.contains(target);
      const clickedMenu = menuRef.current?.contains(target);
      if (!clickedTrigger && !clickedMenu) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open || !wrapperRef.current || typeof window === 'undefined') {
      setMenuPosition(null);
      return;
    }

    const updatePosition = () => {
      if (!wrapperRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
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
  }, [open, filteredOptions.length, loading]);

  const handleSelect = (option: DeliveryAddressSelectOption) => {
    onSelect(option);
    setQuery('');
    setOpen(false);
  };

  const displayValue = open ? query : selectedOption?.label || '';

  const portalMenu = (content: ReactNode) => {
    if (!open || !menuPosition || typeof document === 'undefined') return null;

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
      >
        {content}
      </div>,
      document.body
    );
  };

  return (
    <div ref={wrapperRef} className={cn('delivery-address-select relative isolate min-w-0', open && 'z-[80]')}>
      <div
        className={cn(
          'delivery-address-select-trigger relative h-[43px] rounded-full bg-ui-input border border-ui-border-subtle transition-colors',
          'hover:bg-ui-input-focus focus-within:bg-ui-input-focus',
          invalid
            ? 'border-[rgba(239,68,68,0.4)] focus-within:border-[rgba(239,68,68,0.48)] focus-within:shadow-[0_0_0_2px_rgba(239,68,68,0.08)]'
            : 'focus-within:border-[#2CC295]/30 focus-within:shadow-[0_0_0_2px_rgba(44,194,149,0.10)]'
        )}
      >
        <Search
          size={13}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-ui-muted opacity-70 pointer-events-none"
        />
        <input
          ref={inputRef}
          type="text"
          value={loading ? 'Loading...' : displayValue}
          disabled={disabled || loading}
          placeholder={searchPlaceholder || placeholder}
          onFocus={() => {
            if (disabled) return;
            setQuery('');
            setOpen(true);
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          className={cn(
            'delivery-address-select-input h-full w-full rounded-full border-0 bg-transparent pl-10 pr-10 text-[13px] text-ui-primary outline-none',
            'placeholder:text-ui-muted',
            'focus:outline-none',
            'disabled:cursor-not-allowed disabled:opacity-55'
          )}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => {
            if (disabled) return;
            if (!open) {
              setQuery('');
              setOpen(true);
              inputRef.current?.focus();
              return;
            }
            setOpen(false);
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-ui-muted hover:text-ui-primary transition-colors"
          aria-label="Toggle options"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <ChevronDown size={16} className={open ? 'rotate-180' : ''} />
          )}
        </button>
      </div>

      {portalMenu(
        <div className="delivery-address-select-popover dropdown-panel overflow-hidden rounded-[24px] border border-ui-border-subtle shadow-[0_24px_60px_-28px_rgba(0,0,0,0.7)]">
          <div className="max-h-64 overflow-y-auto p-2 custom-scrollbar">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const isSelected = option.id === selectedId;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleSelect(option)}
                    className={cn(
                      'w-full rounded-xl px-4 py-3 text-left transition-colors',
                      'flex items-center justify-between gap-3',
                      isSelected
                        ? 'bg-[var(--t-surface-10)] text-ui-primary'
                        : 'text-ui-secondary hover:bg-[var(--t-surface-5)] hover:text-ui-primary'
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm">{option.label}</p>
                      {option.meta ? (
                        <p className="mt-0.5 truncate text-[11px] text-ui-muted">{option.meta}</p>
                      ) : null}
                    </div>
                    {isSelected ? <Check size={16} className="shrink-0 text-[#2CC295]" /> : null}
                  </button>
                );
              })
            ) : (
              <div className="px-4 py-6 text-xs text-ui-muted">
                {loading ? 'Loading options...' : emptyText}
              </div>
            )}
          </div>

          {!loading && onRetry ? (
            <div className="border-t border-[rgba(255,255,255,0.06)] p-2">
              <button
                type="button"
                onClick={onRetry}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-ui-secondary hover:bg-[rgba(255,255,255,0.04)] hover:text-ui-primary transition-colors"
              >
                <RotateCcw size={14} />
                Reload options
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
