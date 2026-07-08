import { useState, useRef, useEffect } from 'react';
import { preventInvalidNumberKeyDown } from '@/utils/numericInput';

interface PriceRangeSliderProps {
  min: number;
  max: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  step?: number;
}

export function PriceRangeSlider({ 
  min, 
  max, 
  value, 
  onChange, 
  step = 0.01 
}: PriceRangeSliderProps) {
  const [localValue, setLocalValue] = useState<[number, number]>(value);
  const [isDragging, setIsDragging] = useState<'min' | 'max' | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const getPercentage = (val: number) => {
    if (max <= min) return 0;
    return ((val - min) / (max - min)) * 100;
  };

  const handleMouseDown = (thumb: 'min' | 'max') => (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(thumb);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !trackRef.current) return;

    const rect = trackRef.current.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const newValue = min + (percentage / 100) * (max - min);
    const roundedValue = Math.round(newValue / step) * step;

    if (isDragging === 'min') {
      const newMin = Math.min(roundedValue, localValue[1] - step);
      const newLocalValue: [number, number] = [newMin, localValue[1]];
      setLocalValue(newLocalValue);
      onChange(newLocalValue);
    } else {
      const newMax = Math.max(roundedValue, localValue[0] + step);
      const newLocalValue: [number, number] = [localValue[0], newMax];
      setLocalValue(newLocalValue);
      onChange(newLocalValue);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(null);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, localValue]);

  const minPercent = getPercentage(localValue[0]);
  const maxPercent = getPercentage(localValue[1]);

  return (
    <div className="space-y-4 px-1">
      <div className="flex items-center justify-between rounded-[24px] border border-ui-border-subtle bg-ui-input px-4 py-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ui-muted">Selected Range</p>
          <p className="mt-1 text-sm font-semibold text-ui-primary">
            {localValue[0].toFixed(2)} - {localValue[1].toFixed(2)} ETH
          </p>
        </div>
        <span className="rounded-full border border-ui-border-subtle bg-[var(--t-surface-2)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ui-secondary">
          Live
        </span>
      </div>

      {/* Track */}
      <div
        ref={trackRef}
        className="relative cursor-pointer rounded-full bg-[var(--t-surface-10)] h-2"
      >
        {/* Active range */}
        <div
          className="absolute h-full rounded-full bg-[var(--t-accent)]"
          style={{
            left: `${minPercent}%`,
            right: `${100 - maxPercent}%`,
          }}
        />

        {/* Min thumb */}
        <div
          className="absolute top-1/2 h-5 w-5 -translate-y-1/2 cursor-grab rounded-full border-2 border-[var(--t-accent)] bg-[var(--t-card-bg)] shadow-[0_12px_28px_-18px_var(--t-accent-shadow)] transition-transform hover:scale-110 active:cursor-grabbing"
          style={{ left: `${minPercent}%`, marginLeft: '-10px' }}
          onMouseDown={handleMouseDown('min')}
        />

        {/* Max thumb */}
        <div
          className="absolute top-1/2 h-5 w-5 -translate-y-1/2 cursor-grab rounded-full border-2 border-[var(--t-accent)] bg-[var(--t-card-bg)] shadow-[0_12px_28px_-18px_var(--t-accent-shadow)] transition-transform hover:scale-110 active:cursor-grabbing"
          style={{ left: `${maxPercent}%`, marginLeft: '-10px' }}
          onMouseDown={handleMouseDown('max')}
        />
      </div>

      {/* Value displays */}
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-ui-muted">
            Min
          </span>
          <div className="relative">
            <input
              type="number"
              inputMode="decimal"
              value={localValue[0].toFixed(2)}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || min;
                const newMin = Math.max(min, Math.min(val, localValue[1] - step));
                const newValue: [number, number] = [newMin, localValue[1]];
                setLocalValue(newValue);
                onChange(newValue);
              }}
              onKeyDown={preventInvalidNumberKeyDown}
              step={step}
              min={min}
              max={localValue[1] - step}
              aria-label="Minimum price"
              className="h-[44px] w-full rounded-full border border-ui-border-subtle bg-ui-input px-4 pr-12 text-sm font-medium text-ui-primary placeholder:text-ui-muted outline-none focus:border-[var(--t-accent)] focus:ring-2 focus:ring-[var(--t-accent-ring-soft)]"
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ui-muted">
              ETH
            </span>
          </div>
        </label>
        <label className="block">
          <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-ui-muted">
            Max
          </span>
          <div className="relative">
            <input
              type="number"
              inputMode="decimal"
              value={localValue[1].toFixed(2)}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || max;
                const newMax = Math.min(max, Math.max(val, localValue[0] + step));
                const newValue: [number, number] = [localValue[0], newMax];
                setLocalValue(newValue);
                onChange(newValue);
              }}
              onKeyDown={preventInvalidNumberKeyDown}
              step={step}
              min={localValue[0] + step}
              max={max}
              aria-label="Maximum price"
              className="h-[44px] w-full rounded-full border border-ui-border-subtle bg-ui-input px-4 pr-12 text-sm font-medium text-ui-primary placeholder:text-ui-muted outline-none focus:border-[var(--t-accent)] focus:ring-2 focus:ring-[var(--t-accent-ring-soft)]"
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ui-muted">
              ETH
            </span>
          </div>
        </label>
      </div>
    </div>
  );
}
