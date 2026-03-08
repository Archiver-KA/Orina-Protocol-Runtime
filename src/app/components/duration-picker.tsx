import { useState, useRef, useEffect, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react';
import { StudioActionButton } from '@/app/components/ui/studio-action-button';
import { StudioModalCloseButton } from '@/app/components/ui/studio-modal';

interface DurationPickerProps {
  defaultDays?: number;
  onConfirm: (days: number, targetDate: Date) => void;
  onCancel: () => void;
}

export function DurationPicker({ defaultDays = 7, onConfirm, onCancel }: DurationPickerProps) {
  const [days, setDays] = useState(defaultDays);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const modalRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  const DAY_MS = 24 * 60 * 60 * 1000;
  const startOfDay = (date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  };
  const today = startOfDay(new Date());

  // Calculate target date based on days
  const targetDate = selectedDate || new Date(today.getTime() + days * DAY_MS);
  const effectiveDays = Math.max(
    1,
    Math.ceil((startOfDay(targetDate).getTime() - today.getTime()) / DAY_MS),
  );

  // Prevent body scroll while modal is mounted
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleDaysChange = (newDays: number) => {
    if (newDays >= 1 && newDays <= 365) {
      setDays(newDays);
      setSelectedDate(null); // Reset selected date when days change
      const nextTarget = new Date(today.getTime() + newDays * DAY_MS);
      setCurrentMonth(new Date(nextTarget.getFullYear(), nextTarget.getMonth(), 1));
    }
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    const diffTime = date.getTime() - Date.now();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    setDays(Math.max(1, diffDays));
  };

  const handleConfirm = () => {
    onConfirm(effectiveDays, targetDate);
  };

  // Generate calendar days
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({ day: prevMonthLastDay - i, isCurrentMonth: false, date: new Date(year, month - 1, prevMonthLastDay - i) });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({ day, isCurrentMonth: true, date: new Date(year, month, day) });
    }

    // Next month days to fill the grid
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      days.push({ day, isCurrentMonth: false, date: new Date(year, month + 1, day) });
    }

    return days;
  };

  const calendarDays = useMemo(() => getDaysInMonth(currentMonth), [currentMonth]);

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const formatTargetDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const isSelectedDate = (date: Date) => {
    const target = targetDate;
    return date.toDateString() === target.toDateString();
  };

  return (
    <div
      className="studio-portal-backdrop fixed inset-0 z-[75] flex items-center justify-center p-4 md:p-6 bg-black/70 backdrop-blur-[10px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        ref={modalRef}
        className="studio-modal-theme studio-glass-modal w-full max-w-[700px] rounded-[2rem] border border-ui-border-subtle bg-[rgba(18,18,18,0.86)] backdrop-blur-[20px] shadow-[0_30px_120px_rgba(0,0,0,0.55)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="studio-glass-header px-6 md:px-8 py-6 border-b border-[rgba(255,255,255,0.06)] flex items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold text-white">Set Delivery Time</h3>
            <p className="text-sm text-zinc-400 mt-1">
              Confirm order duration and estimated delivery target date.
            </p>
          </div>
          <StudioModalCloseButton onClick={onCancel} className="studio-glass-secondary" />
        </div>

        <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-5">
          {/* Left: Calendar */}
          <div className="space-y-4">
            <div ref={calendarRef} className="studio-glass-surface rounded-2xl border-0 bg-[rgba(255,255,255,0.02)] p-3">
              <div className="flex items-center justify-between mb-3">
                <p className="text-lg font-bold text-white">{formatMonthYear(currentMonth)}</p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentMonth(
                        new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1),
                      )
                    }
                    className="studio-glass-secondary w-8 h-8 rounded-lg border border-white/10 bg-white/5 text-zinc-400 hover:text-white inline-flex items-center justify-center"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentMonth(
                        new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1),
                      )
                    }
                    className="studio-glass-secondary w-8 h-8 rounded-lg border border-white/10 bg-white/5 text-zinc-400 hover:text-white inline-flex items-center justify-center"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center mb-1">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d) => (
                  <div key={d} className="text-[10px] font-bold text-zinc-500 uppercase py-1">
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((dayInfo, i) => {
                  const isPast = dayInfo.date < today;
                  const isSelected = isSelectedDate(dayInfo.date);
                  const isToday = dayInfo.date.toDateString() === today.toDateString();

                  return (
                    <button
                      key={i}
                      onClick={() =>
                        !isPast && dayInfo.isCurrentMonth && handleDateSelect(startOfDay(dayInfo.date))
                      }
                      disabled={isPast || !dayInfo.isCurrentMonth}
                      className={[
                        'aspect-square w-full rounded-lg text-sm font-semibold transition-colors border',
                        isSelected
                          ? 'bg-[#2CC295] text-black border-[#2CC295] shadow-[0_0_0_1px_rgba(44,194,149,0.15)]'
                          : isToday
                            ? 'border-[#2CC295]/60 text-white bg-[#2CC295]/8'
                            : 'border-transparent bg-transparent',
                        !isSelected && !isToday && dayInfo.isCurrentMonth
                          ? 'text-zinc-300 hover:bg-white/5'
                          : '',
                        !dayInfo.isCurrentMonth && !isSelected ? 'text-zinc-600' : '',
                        isPast ? 'opacity-35 cursor-not-allowed' : '',
                      ].join(' ')}
                    >
                      {dayInfo.day}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Summary */}
          <div className="space-y-4">
            <div className="studio-glass-surface rounded-2xl border-0 bg-[rgba(255,255,255,0.02)] p-4">
              <p className="text-[10px] font-bold tracking-[0.18em] text-zinc-500 uppercase mb-3">
                Order Summary
              </p>

              <div className="studio-glass-subsurface mb-3 rounded-xl border border-[rgba(255,255,255,0.06)] overflow-hidden">
                <div className="studio-glass-subsurface px-3 py-2.5 bg-[rgba(255,255,255,0.02)] border-b border-[rgba(255,255,255,0.06)]">
                  <p className="text-[10px] font-bold tracking-[0.18em] text-zinc-500 uppercase">
                    Delivery Duration
                  </p>
                </div>

                <div className="grid grid-cols-[1fr_auto_1.2fr] items-stretch gap-0">
                  <div className="studio-glass-subsurface px-3 py-3 flex items-center justify-between bg-[rgba(255,255,255,0.02)]">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">Days</p>
                      <p className="text-xl font-bold text-white mt-1">{effectiveDays}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => handleDaysChange(days + 1)}
                        className="studio-glass-secondary w-7 h-7 rounded-lg border border-white/10 bg-white/5 text-zinc-300 hover:text-white hover:border-white/20 inline-flex items-center justify-center"
                      >
                        <Plus size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDaysChange(days - 1)}
                        className="studio-glass-secondary w-7 h-7 rounded-lg border border-white/10 bg-white/5 text-zinc-300 hover:text-white hover:border-white/20 inline-flex items-center justify-center"
                      >
                        <Minus size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="w-px bg-[rgba(255,255,255,0.06)]" />

                  <div className="px-3 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] leading-none whitespace-nowrap text-zinc-500">
                        Target Date
                      </p>
                      <p className="text-lg font-bold text-white mt-1">{formatTargetDate(targetDate)}</p>
                    </div>
                    <div className="studio-glass-secondary w-9 h-9 rounded-xl border border-white/10 bg-white/5 inline-flex items-center justify-center text-zinc-300">
                      <Calendar size={16} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="studio-glass-subsurface rounded-xl border border-[rgba(255,255,255,0.06)] bg-black/20 p-3">
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  If buyer does not confirm by target date, escrow moves into dispute window before release.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <StudioActionButton
                onClick={onCancel}
                variant="secondary"
                size="lg"
                className="flex-1 h-[45px] rounded-full justify-center"
              >
                Cancel
              </StudioActionButton>
              <StudioActionButton
                onClick={handleConfirm}
                size="lg"
                className="flex-1 h-[45px] rounded-full justify-center text-sm"
              >
                Sign
              </StudioActionButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
