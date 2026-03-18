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
    <div className="px-2">
      {/* Track */}
      <div 
        ref={trackRef}
        className="h-1 bg-[var(--t-surface-10)] rounded-full relative cursor-pointer"
      >
        {/* Active range */}
        <div
          className="absolute h-full bg-[#2CC295] rounded-full"
          style={{
            left: `${minPercent}%`,
            right: `${100 - maxPercent}%`,
          }}
        ></div>

        {/* Min thumb */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full border-2 border-[#2CC295] shadow-lg cursor-pointer hover:scale-110 transition-transform"
          style={{ left: `${minPercent}%`, marginLeft: '-8px' }}
          onMouseDown={handleMouseDown('min')}
        ></div>

        {/* Max thumb */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full border-2 border-[#2CC295] shadow-lg cursor-pointer hover:scale-110 transition-transform"
          style={{ left: `${maxPercent}%`, marginLeft: '-8px' }}
          onMouseDown={handleMouseDown('max')}
        ></div>
      </div>

      {/* Value displays */}
      <div className="flex justify-between mt-4">
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
          className="bg-ui-input border border-ui-border-subtle rounded px-3 py-1.5 text-xs text-ui-primary w-20 placeholder:text-ui-muted focus:border-[#2CC295] focus:ring-1 focus:ring-[#2CC295] outline-none"
        />
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
          className="bg-ui-input border border-ui-border-subtle rounded px-3 py-1.5 text-xs text-ui-primary w-20 placeholder:text-ui-muted focus:border-[#2CC295] focus:ring-1 focus:ring-[#2CC295] outline-none"
        />
      </div>
    </div>
  );
}
