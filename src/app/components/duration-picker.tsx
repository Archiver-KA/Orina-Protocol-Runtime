import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';

interface DurationPickerProps {
  defaultDays?: number;
  onConfirm: (days: number, targetDate: Date) => void;
  onCancel: () => void;
}

export function DurationPicker({ defaultDays = 7, onConfirm, onCancel }: DurationPickerProps) {
  const [days, setDays] = useState(defaultDays);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const calendarRef = useRef<HTMLDivElement>(null);

  // Calculate target date based on days
  const targetDate = selectedDate || new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setShowCalendar(false);
      }
    };

    if (showCalendar) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCalendar]);

  const handleDaysChange = (newDays: number) => {
    if (newDays >= 1 && newDays <= 365) {
      setDays(newDays);
      setSelectedDate(null); // Reset selected date when days change
    }
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    const diffTime = date.getTime() - Date.now();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    setDays(Math.max(1, diffDays));
    setShowCalendar(false);
  };

  const handleConfirm = () => {
    onConfirm(days, targetDate);
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

  const calendarDays = getDaysInMonth(currentMonth);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#141417] border border-[#27272a] rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-6">
        <div>
          <h3 className="text-lg font-bold text-white">Set Delivery Time</h3>
          <p className="text-sm text-zinc-500 mt-1">Choose estimated delivery duration for this order</p>
        </div>

        <div className="space-y-4">
          {/* Duration Input */}
          <div className="relative group">
            <label className="text-xs font-bold text-zinc-400 block mb-2 uppercase tracking-wider">Delivery Duration</label>
            <div className="flex items-center bg-zinc-900 border border-[#27272a] rounded-lg overflow-hidden h-[54px]">
              <div className="flex items-center px-4 border-r border-[#27272a]">
                <span className="text-[10px] text-zinc-500 uppercase font-bold mr-3 tracking-wider">Days</span>
                <input
                  className="bg-transparent border-none focus:ring-0 p-0 text-sm text-white w-12 font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  type="number"
                  value={days}
                  onChange={(e) => handleDaysChange(parseInt(e.target.value) || 1)}
                  min="1"
                  max="365"
                />
                <div className="flex flex-col ml-1">
                  <button
                    onClick={() => handleDaysChange(days + 1)}
                    className="p-0.5 hover:text-[#2CC295] transition-colors leading-[0] flex items-center justify-center"
                  >
                    <ChevronUp size={16} />
                  </button>
                  <button
                    onClick={() => handleDaysChange(days - 1)}
                    className="p-0.5 hover:text-[#2CC295] transition-colors leading-[0] flex items-center justify-center"
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>
              </div>
              <div className="flex-1 flex items-center justify-between px-4">
                <div className="flex flex-col">
                  <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-tighter">Target Date</span>
                  <span className="text-sm text-zinc-300 font-medium">{formatTargetDate(targetDate)}</span>
                </div>
                <button
                  onClick={() => setShowCalendar(!showCalendar)}
                  className="text-zinc-500 hover:text-[#2CC295] transition-colors flex items-center"
                >
                  <Calendar size={20} />
                </button>
              </div>
            </div>

            {/* Calendar Dropdown */}
            {showCalendar && (
              <div
                ref={calendarRef}
                className="absolute top-full mt-3 left-0 z-20 w-[320px] bg-zinc-900 border border-[#27272a] rounded-xl shadow-2xl p-4"
              >
                <div className="flex items-center justify-between mb-4 px-1">
                  <span className="text-sm font-bold text-white uppercase tracking-wider">
                    {formatMonthYear(currentMonth)}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                      className="p-1 hover:bg-zinc-800 rounded text-zinc-400 transition-colors"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                      className="p-1 hover:bg-zinc-800 rounded text-zinc-400 transition-colors"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                {/* Weekday headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                    <span key={i} className="text-[10px] text-zinc-600 font-bold text-center">
                      {day}
                    </span>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((dayInfo, i) => {
                    const isPast = dayInfo.date < today;
                    const isSelected = isSelectedDate(dayInfo.date);
                    const isToday = dayInfo.date.toDateString() === today.toDateString();

                    return (
                      <button
                        key={i}
                        onClick={() => !isPast && dayInfo.isCurrentMonth && handleDateSelect(dayInfo.date)}
                        disabled={isPast || !dayInfo.isCurrentMonth}
                        className={`
                          text-xs py-2 text-center rounded-md transition-all
                          ${!dayInfo.isCurrentMonth ? 'text-zinc-700 cursor-not-allowed' : ''}
                          ${isPast ? 'text-zinc-700 cursor-not-allowed' : ''}
                          ${dayInfo.isCurrentMonth && !isPast && !isSelected ? 'text-zinc-400 hover:bg-zinc-800 cursor-pointer' : ''}
                          ${isSelected ? 'bg-[#2CC295] text-black font-bold shadow-lg shadow-[#2CC295]/30' : ''}
                          ${isToday && !isSelected ? 'ring-1 ring-[#2CC295]/50' : ''}
                        `}
                      >
                        {dayInfo.day}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-4 bg-zinc-900/50 border border-[#27272a] rounded-lg">
            <p className="text-xs text-zinc-400 leading-relaxed">
              <span className="font-bold text-[#2CC295]">Auto-release:</span> If buyer doesn't confirm delivery by the target date, 
              funds will be automatically released to you after a 3-day dispute window.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onCancel}
            className="flex-1 py-3 bg-zinc-800 text-zinc-300 border border-[#27272a] rounded-lg font-bold text-sm hover:bg-zinc-700 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-3 bg-[#2CC295] text-black rounded-lg font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-[#2CC295]/20"
          >
            Confirm & Sign
          </button>
        </div>
      </div>
    </div>
  );
}
