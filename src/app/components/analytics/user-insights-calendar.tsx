import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { UserAnalyticsEvent } from '@/hooks/useAnalytics';

interface UserInsightsCalendarProps {
  events: UserAnalyticsEvent[];
}

interface CalendarDaySummary {
  key: string;
  day: number;
  month: number;
  year: number;
  timestamp: number;
  isCurrentMonth: boolean;
  events: UserAnalyticsEvent[];
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function toDayKey(timestamp: number) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function statusDotColor(status: UserAnalyticsEvent['status']) {
  if (status === 'completed') return '#2CC295';
  if (status === 'pending') return '#F7DC7F';
  return '#60A5FA';
}

function statusLabel(status: UserAnalyticsEvent['status']) {
  if (status === 'completed') return 'Completed';
  if (status === 'pending') return 'Pending';
  return 'Future';
}

function buildMonthCells(monthDate: Date, events: UserAnalyticsEvent[]): CalendarDaySummary[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const gridStart = new Date(year, month, 1 - startOffset);
  const eventsByDay = new Map<string, UserAnalyticsEvent[]>();

  for (const event of events) {
    const key = toDayKey(event.timestamp);
    const bucket = eventsByDay.get(key) ?? [];
    bucket.push(event);
    eventsByDay.set(key, bucket);
  }

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index);
    const key = toDayKey(date.getTime());
    const dayEvents = [...(eventsByDay.get(key) ?? [])].sort((left, right) => left.timestamp - right.timestamp);
    return {
      key,
      day: date.getDate(),
      month: date.getMonth(),
      year: date.getFullYear(),
      timestamp: date.getTime(),
      isCurrentMonth: date.getMonth() === month,
      events: dayEvents,
    };
  });
}

function formatDayHeader(timestamp: number) {
  return new Date(timestamp).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatEventTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function UserInsightsCalendar({ events }: UserInsightsCalendarProps) {
  const defaultMonth = useMemo(() => {
    if (events.length === 0) return startOfMonth(new Date());
    return startOfMonth(new Date(events[events.length - 1].timestamp));
  }, [events]);

  const [displayMonth, setDisplayMonth] = useState(defaultMonth);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  useEffect(() => {
    setDisplayMonth(defaultMonth);
    setSelectedDayKey(null);
  }, [defaultMonth]);

  const monthCells = useMemo(() => buildMonthCells(displayMonth, events), [displayMonth, events]);
  const monthLabel = useMemo(
    () => displayMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase(),
    [displayMonth],
  );

  const selectedDay = useMemo(() => {
    if (selectedDayKey) {
      return monthCells.find((cell) => cell.key === selectedDayKey) ?? null;
    }
    return monthCells.find((cell) => cell.events.length > 0 && cell.isCurrentMonth) ?? null;
  }, [monthCells, selectedDayKey]);

  return (
    <article className="bg-ui-card rounded-[24px] p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-[12px] uppercase tracking-wider font-bold text-ui-primary">Event Calendar</h3>
          <p className="text-[10px] text-ui-muted mt-1">Completed, pending, and future milestones in one timeline.</p>
        </div>
        <div className="flex items-center gap-4 text-[9px] uppercase font-bold text-ui-muted">
          <span className="inline-flex items-center gap-1.5"><i className="w-1.5 h-1.5 rounded-full" style={{ background: '#2CC295' }} />Completed</span>
          <span className="inline-flex items-center gap-1.5"><i className="w-1.5 h-1.5 rounded-full" style={{ background: '#F7DC7F' }} />Pending</span>
          <span className="inline-flex items-center gap-1.5"><i className="w-1.5 h-1.5 rounded-full" style={{ background: '#60A5FA' }} />Future</span>
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-ui-muted">{monthLabel}</div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setDisplayMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
            className="w-8 h-8 rounded-lg border border-ui-border-subtle bg-ui-input text-ui-muted hover:text-ui-primary hover:bg-ui-input-focus inline-flex items-center justify-center"
            aria-label="Previous month"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => setDisplayMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
            className="w-8 h-8 rounded-lg border border-ui-border-subtle bg-ui-input text-ui-muted hover:text-ui-primary hover:bg-ui-input-focus inline-flex items-center justify-center"
            aria-label="Next month"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label) => (
          <span key={label} className="h-[22px] text-[9px] font-bold uppercase text-[#52525B] flex items-center justify-center">
            {label}
          </span>
        ))}

        {monthCells.map((cell) => {
          const completedCount = cell.events.filter((event) => event.status === 'completed').length;
          const pendingCount = cell.events.filter((event) => event.status === 'pending').length;
          const futureCount = cell.events.filter((event) => event.status === 'future').length;
          const isSelected = selectedDay?.key === cell.key;
          return (
            <button
              key={cell.key}
              type="button"
              onMouseEnter={() => setSelectedDayKey(cell.key)}
              onFocus={() => setSelectedDayKey(cell.key)}
              onClick={() => setSelectedDayKey(cell.key)}
              className={`relative rounded-lg p-2 text-left min-h-[68px] transition-colors ${
                isSelected
                  ? 'bg-[rgba(44,194,149,0.09)] shadow-[0_0_16px_rgba(44,194,149,0.10)]'
                  : 'bg-[var(--t-surface-2)] hover:bg-[rgba(255,255,255,0.04)]'
              } ${!cell.isCurrentMonth ? 'opacity-40' : ''}`}
            >
              <p className={`text-[10px] font-bold ${cell.isCurrentMonth ? 'text-ui-primary' : 'text-ui-muted'}`}>
                {cell.day}
              </p>
              {cell.events.length > 0 && (
                <div className="mt-2 space-y-1">
                  {completedCount > 0 && (
                    <div className="h-1 rounded-full overflow-hidden bg-[var(--t-surface-10)]">
                      <span className="block h-full" style={{ width: `${Math.min(100, completedCount * 28)}%`, background: '#2CC295' }} />
                    </div>
                  )}
                  {pendingCount > 0 && (
                    <div className="h-1 rounded-full overflow-hidden bg-[var(--t-surface-10)]">
                      <span className="block h-full" style={{ width: `${Math.min(100, pendingCount * 28)}%`, background: '#F7DC7F' }} />
                    </div>
                  )}
                  {futureCount > 0 && (
                    <div className="h-1 rounded-full overflow-hidden bg-[var(--t-surface-10)]">
                      <span className="block h-full" style={{ width: `${Math.min(100, futureCount * 28)}%`, background: '#60A5FA' }} />
                    </div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-5 rounded-[18px] border border-ui-border-subtle bg-ui-input/60 px-4 py-4 min-h-[180px]">
        {selectedDay ? (
          <>
            <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-ui-muted">{formatDayHeader(selectedDay.timestamp)}</p>
            {selectedDay.events.length === 0 ? (
              <p className="text-sm text-ui-muted mt-4">No tracked event on this day.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {selectedDay.events.map((event) => (
                  <div key={event.id} className="rounded-[14px] border border-ui-border-subtle bg-ui-card/60 px-3 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: statusDotColor(event.status) }} />
                        <p className="text-sm font-bold text-ui-primary">{event.title}</p>
                      </div>
                      <span className="text-[10px] uppercase tracking-[0.12em] font-bold text-ui-muted">
                        {statusLabel(event.status)} · {formatEventTime(event.timestamp)}
                      </span>
                    </div>
                    <p className="text-[11px] text-ui-secondary mt-1">{event.detail}</p>
                    <div className="mt-2 flex items-center justify-between gap-4 text-[10px] text-ui-muted">
                      <span>Order #{event.orderId}</span>
                      <span>{event.source === 'projection' ? 'On-chain event' : 'Lifecycle milestone'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-ui-muted">No calendar event is available yet.</p>
        )}
      </div>
    </article>
  );
}
