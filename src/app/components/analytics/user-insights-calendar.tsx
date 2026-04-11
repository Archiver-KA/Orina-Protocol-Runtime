import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { UserAnalyticsEvent, UserInsightsCalendarScope } from '@/hooks/useAnalytics';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/app/components/ui/hover-card';

interface UserInsightsCalendarProps {
  events: UserAnalyticsEvent[];
  onOpenOrder?: (event: UserAnalyticsEvent) => void;
}

interface CalendarDayPhaseGroup {
  phase: UserAnalyticsEvent['phase'];
  label: string;
  shortLabel: string;
  color: string;
  count: number;
  phasePriority: number;
  actionable: boolean;
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
  groups: CalendarDayPhaseGroup[];
  totalCount: number;
  actionableCount: number;
}

const CALENDAR_SCOPE_OPTIONS: Array<{ value: UserInsightsCalendarScope; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'needs_action', label: 'Need My Action' },
  { value: 'buyer', label: 'Buyer' },
  { value: 'seller', label: 'Seller' },
  { value: 'completed', label: 'Completed' },
  { value: 'disputed', label: 'Disputed' },
];

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function toDayKey(timestamp: number) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
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

function getEventStatusLabel(status: UserAnalyticsEvent['status']) {
  if (status === 'completed') return 'Completed';
  if (status === 'pending') return 'Pending';
  return 'Future';
}

function matchesScope(event: UserAnalyticsEvent, scope: UserInsightsCalendarScope) {
  if (scope === 'all') return true;
  if (scope === 'needs_action') return event.viewerCanAct && event.status !== 'completed';
  if (scope === 'buyer') return event.actionOwner === 'buyer';
  if (scope === 'seller') return event.actionOwner === 'seller';
  if (scope === 'completed') return event.phase === 'done' || event.phase === 'cancel';
  if (scope === 'disputed') return event.phase === 'dispute';
  return true;
}

function buildDayGroups(events: UserAnalyticsEvent[]) {
  const groups = new Map<UserAnalyticsEvent['phase'], CalendarDayPhaseGroup>();

  for (const event of events) {
    const current = groups.get(event.phase);
    if (current) {
      current.count += 1;
      current.events.push(event);
      current.actionable = current.actionable || (event.viewerCanAct && event.status !== 'completed');
      continue;
    }

    groups.set(event.phase, {
      phase: event.phase,
      label: event.phaseLabel,
      shortLabel: event.phaseShortLabel,
      color: event.phaseColor,
      count: 1,
      phasePriority: event.phasePriority,
      actionable: event.viewerCanAct && event.status !== 'completed',
      events: [event],
    });
  }

  return [...groups.values()].sort((left, right) => {
    const leftAction = left.actionable ? 0 : 1;
    const rightAction = right.actionable ? 0 : 1;
    if (leftAction !== rightAction) return leftAction - rightAction;
    if (left.phasePriority !== right.phasePriority) return left.phasePriority - right.phasePriority;
    return right.count - left.count;
  });
}

function buildMonthCells(monthDate: Date, events: UserAnalyticsEvent[], scope: UserInsightsCalendarScope): CalendarDaySummary[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const gridStart = new Date(year, month, 1 - startOffset);
  const filteredEvents = events.filter((event) => matchesScope(event, scope));
  const eventsByDay = new Map<string, UserAnalyticsEvent[]>();

  for (const event of filteredEvents) {
    const key = toDayKey(event.timestamp);
    const bucket = eventsByDay.get(key) ?? [];
    bucket.push(event);
    eventsByDay.set(key, bucket);
  }

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index);
    const key = toDayKey(date.getTime());
    const dayEvents = [...(eventsByDay.get(key) ?? [])].sort((left, right) => {
      const leftAction = left.viewerCanAct && left.status !== 'completed' ? 0 : 1;
      const rightAction = right.viewerCanAct && right.status !== 'completed' ? 0 : 1;
      if (leftAction !== rightAction) return leftAction - rightAction;
      if (left.phasePriority !== right.phasePriority) return left.phasePriority - right.phasePriority;
      return left.timestamp - right.timestamp;
    });
    const groups = buildDayGroups(dayEvents);
    return {
      key,
      day: date.getDate(),
      month: date.getMonth(),
      year: date.getFullYear(),
      timestamp: date.getTime(),
      isCurrentMonth: date.getMonth() === month,
      events: dayEvents,
      groups,
      totalCount: dayEvents.length,
      actionableCount: dayEvents.filter((event) => event.viewerCanAct && event.status !== 'completed').length,
    };
  });
}

function CalendarDayHoverPreview({
  day,
  onOpenOrder,
}: {
  day: CalendarDaySummary;
  onOpenOrder?: (event: UserAnalyticsEvent) => void;
}) {
  return (
    <div className="w-[280px] overflow-hidden rounded-[20px] border border-[var(--t-border-subtle)] bg-[var(--t-dropdown-glass-bg)] backdrop-blur-[18px]">
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ui-muted">
              {formatDayHeader(day.timestamp)}
            </p>
            <p className="mt-1 text-sm font-semibold text-ui-primary">
              {day.totalCount} update{day.totalCount === 1 ? '' : 's'}
            </p>
          </div>
          {day.actionableCount > 0 ? (
            <span className="shrink-0 rounded-full bg-[#F7DC7F]/15 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#F7DC7F]">
              {day.actionableCount} action
            </span>
          ) : null}
        </div>
      </div>

      <div
        className="hidden-scrollbar max-h-[240px] space-y-2 overflow-y-auto px-3 py-3"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {day.events.map((event) => (
          <button
            key={event.id}
            type="button"
            onClick={() => onOpenOrder?.(event)}
            disabled={!onOpenOrder}
            className={`w-full rounded-[16px] bg-[rgba(255,255,255,0.03)] p-3 text-left transition-colors ${
              onOpenOrder
                ? 'cursor-pointer hover:bg-[rgba(255,255,255,0.06)]'
                : 'cursor-default'
            }`}
            aria-label={`Open order ${event.orderId}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: event.phaseColor }}
                  />
                  <span
                    className="text-[10px] font-semibold uppercase tracking-[0.14em]"
                    style={{ color: event.phaseColor }}
                  >
                    {event.phaseShortLabel}
                  </span>
                  {event.viewerCanAct && event.status !== 'completed' ? (
                    <span className="rounded-full bg-[#F7DC7F]/15 px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-[#F7DC7F]">
                      My Action
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-[12px] font-semibold leading-5 text-ui-primary">{event.title}</p>
                <p className="mt-1 text-[10px] text-ui-muted">Order #{event.orderId}</p>
              </div>
              <span className="shrink-0 text-[10px] font-semibold text-ui-muted">
                {formatEventTime(event.timestamp)}
              </span>
            </div>
          </button>
        ))}
      </div>

      <div className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ui-muted">
        Select a day to review details
      </div>
    </div>
  );
}

export function UserInsightsCalendar({ events, onOpenOrder }: UserInsightsCalendarProps) {
  const defaultMonthTimestamp = useMemo(() => {
    if (events.length === 0) return startOfMonth(new Date()).getTime();
    return startOfMonth(new Date(events[events.length - 1].timestamp)).getTime();
  }, [events]);
  const defaultMonth = useMemo(() => new Date(defaultMonthTimestamp), [defaultMonthTimestamp]);

  const [displayMonth, setDisplayMonth] = useState(defaultMonth);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [scope, setScope] = useState<UserInsightsCalendarScope>('all');

  useEffect(() => {
    setDisplayMonth((current) => {
      const currentKey = `${current.getFullYear()}-${current.getMonth()}`;
      const next = new Date(defaultMonthTimestamp);
      const nextKey = `${next.getFullYear()}-${next.getMonth()}`;
      return currentKey === nextKey ? current : next;
    });
  }, [defaultMonthTimestamp]);

  const monthCells = useMemo(() => buildMonthCells(displayMonth, events, scope), [displayMonth, events, scope]);
  const monthLabel = useMemo(
    () => displayMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase(),
    [displayMonth],
  );

  const selectedDay = useMemo(() => {
    if (!selectedDayKey) return null;
    return monthCells.find((cell) => cell.key === selectedDayKey && cell.totalCount > 0) ?? null;
  }, [monthCells, selectedDayKey]);

  useEffect(() => {
    if (!selectedDayKey) return;
    const stillExists = monthCells.some((cell) => cell.key === selectedDayKey && cell.totalCount > 0);
    if (!stillExists) {
      setSelectedDayKey(null);
    }
  }, [monthCells, selectedDayKey]);

  useEffect(() => {
    if (typeof document === 'undefined' || !selectedDay) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedDay]);

  const filteredCount = useMemo(
    () => events.filter((event) => matchesScope(event, scope)).length,
    [events, scope],
  );

  return (
    <article className="bg-ui-card rounded-[24px] p-6 relative overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <h3 className="text-[12px] uppercase tracking-wider font-semibold text-ui-primary">Order Calendar</h3>
          <p className="text-[11px] text-ui-muted mt-1 max-w-[520px]">
            Each day groups order updates by status. Select a day to inspect the timeline and jump into Orders.
          </p>
        </div>
        <div className="rounded-full border border-ui-border-subtle bg-ui-input/70 px-3 py-2 text-[10px] uppercase tracking-[0.16em] font-semibold text-ui-muted">
          {filteredCount} recorded update{filteredCount === 1 ? '' : 's'}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {CALENDAR_SCOPE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              setScope(option.value);
              setSelectedDayKey(null);
            }}
            className={`rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors ${
              scope === option.value
                ? 'border-[#2CC295]/40 bg-[#2CC295]/12 text-[#2CC295]'
                : 'border-ui-border-subtle bg-ui-input/70 text-ui-muted hover:text-ui-primary'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex items-center justify-between">
        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ui-muted">{monthLabel}</div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setDisplayMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
              setSelectedDayKey(null);
            }}
            className="w-8 h-8 rounded-lg border border-ui-border-subtle bg-ui-input text-ui-muted hover:text-ui-primary hover:bg-ui-input-focus inline-flex items-center justify-center"
            aria-label="Previous month"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => {
              setDisplayMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
              setSelectedDayKey(null);
            }}
            className="w-8 h-8 rounded-lg border border-ui-border-subtle bg-ui-input text-ui-muted hover:text-ui-primary hover:bg-ui-input-focus inline-flex items-center justify-center"
            aria-label="Next month"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label) => (
          <span key={label} className="h-[22px] text-[9px] font-semibold uppercase text-[#52525B] flex items-center justify-center">
            {label}
          </span>
        ))}

        {monthCells.map((cell) => {
          const isSelected = selectedDay?.key === cell.key;
          const visibleGroups = cell.groups.slice(0, 9);
          const dayCell = (
            <button
              key={cell.key}
              type="button"
              onClick={() => {
                if (cell.totalCount === 0) return;
                setSelectedDayKey(cell.key);
              }}
              className={`relative flex h-[124px] flex-col overflow-hidden rounded-[16px] px-3 py-3 text-left transition-colors ${
                isSelected
                  ? 'bg-[rgba(44,194,149,0.10)] shadow-[0_0_18px_rgba(44,194,149,0.12)]'
                  : 'bg-[var(--t-surface-2)] hover:bg-[rgba(255,255,255,0.04)]'
              } ${!cell.isCurrentMonth ? 'opacity-40' : ''}`}
            >
              <p className={`absolute left-3 top-3 text-[11px] font-semibold ${cell.isCurrentMonth ? 'text-ui-primary' : 'text-ui-muted'}`}>
                {cell.day}
              </p>

              {cell.totalCount > 0 ? (
                <span className="absolute right-3 top-3 rounded-full bg-ui-input/90 px-2 py-0.5 text-[10px] font-semibold text-ui-primary">
                  {cell.totalCount}
                </span>
              ) : null}

              <div className="mt-7 flex min-h-0 flex-1 items-end">
                <div className="flex min-h-0 w-full flex-1 items-end overflow-hidden">
                  {cell.totalCount > 0 ? (
                    <div className="grid h-[58px] w-full grid-cols-3 grid-rows-3 gap-1.5">
                      {visibleGroups.map((group) => (
                        <div
                          key={`${cell.key}-${group.phase}`}
                          className="flex min-w-0 items-center justify-center rounded-[8px] text-[9px] font-semibold leading-none"
                          style={{
                            backgroundColor: `${group.color}24`,
                            boxShadow: `inset 0 0 0 1px ${group.color}33`,
                            color: group.color,
                          }}
                          aria-label={`${group.count} ${group.label} updates`}
                        >
                          {group.count}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex-1" />
                  )}
                </div>
              </div>
            </button>
          );

          if (cell.totalCount === 0) {
            return dayCell;
          }

          return (
            <HoverCard key={`${cell.key}-hover`} openDelay={80} closeDelay={120}>
              <HoverCardTrigger asChild>{dayCell}</HoverCardTrigger>
              <HoverCardContent
                side="top"
                align="start"
                sideOffset={10}
                className="w-auto border-0 bg-transparent p-0 shadow-none"
              >
                <CalendarDayHoverPreview day={cell} onOpenOrder={onOpenOrder} />
              </HoverCardContent>
            </HoverCard>
          );
        })}
      </div>

      {selectedDay ? (
        <>
          <div
            className="fixed inset-0 z-[70] bg-black/55 backdrop-blur-[4px]"
            onClick={() => setSelectedDayKey(null)}
            aria-hidden="true"
          />
          <div className="fixed inset-x-0 bottom-0 z-[71] max-h-[82vh] pointer-events-none md:inset-y-0 md:right-0 md:left-auto md:h-[100dvh] md:w-[344px] md:max-h-none md:p-[10px]">
            <aside
              className="pointer-events-auto flex max-h-[82vh] h-auto flex-col overflow-hidden rounded-t-[28px] border border-ui-border-subtle bg-ui-card shadow-[0_-18px_40px_rgba(0,0,0,0.35)] md:h-full md:max-h-none md:rounded-[24px] md:bg-[var(--t-card-bg)] md:backdrop-blur-[12px] md:shadow-2xl"
            >
              <div className="flex items-center gap-2.5 border-b border-[var(--t-border-subtle)] p-5 shrink-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ui-primary uppercase tracking-wider">Day Timeline</p>
                  <p className="text-xs text-ui-muted truncate">{formatDayHeader(selectedDay.timestamp)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDayKey(null)}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--t-surface-10)] hover:bg-[var(--t-surface-20)] text-ui-primary transition-colors border border-[var(--t-border-subtle)] shrink-0"
                  aria-label="Close drawer"
                >
                  <X size={14} />
                </button>
              </div>

              <div
                className="flex-1 overflow-y-auto hidden-scrollbar px-3 py-3 md:h-[calc(100%-73px)]"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', overscrollBehavior: 'contain' }}
              >
                <div className="rounded-[24px] bg-[rgba(255,255,255,0.02)] border border-[var(--t-border-subtle)] backdrop-blur-[10px] p-5">
                  <p className="text-[11px] text-ui-muted leading-5">
                    {selectedDay.totalCount} update{selectedDay.totalCount === 1 ? '' : 's'} across {selectedDay.groups.length} order stage{selectedDay.groups.length === 1 ? '' : 's'}.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {selectedDay.groups.map((group) => (
                      <span
                        key={`summary-${group.phase}`}
                        className="rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
                        style={{
                          color: group.color,
                          backgroundColor: `${group.color}1A`,
                        }}
                      >
                        {group.shortLabel} {group.count}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-3 space-y-3">
                  {selectedDay.events.map((event) => (
                    <div key={event.id} className="rounded-[24px] border border-[var(--t-border-subtle)] bg-[rgba(255,255,255,0.02)] backdrop-blur-[10px] p-5">
                      <div className="flex items-start gap-3">
                        {event.assetImage ? (
                          <img
                            src={event.assetImage}
                            alt={event.assetName}
                            className="w-11 h-11 rounded-[12px] object-cover bg-ui-card border border-ui-border-subtle shrink-0"
                          />
                        ) : null}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span
                              className="rounded-full px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.14em]"
                              style={{
                                color: event.phaseColor,
                                backgroundColor: `${event.phaseColor}1A`,
                              }}
                            >
                              {event.phaseShortLabel}
                            </span>
                            <span className="rounded-full bg-ui-card px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-ui-muted">
                              {getEventStatusLabel(event.status)}
                            </span>
                            {event.viewerCanAct && event.status !== 'completed' ? (
                              <span className="rounded-full bg-[#F7DC7F]/15 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#F7DC7F]">
                                My Action
                              </span>
                            ) : null}
                          </div>

                          <p className="text-sm font-semibold text-ui-primary">{event.title}</p>
                          <p className="text-[11px] text-ui-secondary mt-1 leading-5">{event.detail}</p>
                          <div className="mt-2 text-[10px] text-ui-muted">
                            Order #{event.orderId} • {formatEventTime(event.timestamp)}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3">
                        <span className="text-[10px] uppercase tracking-[0.14em] font-semibold text-ui-muted">
                          {event.source === 'projection' ? 'Recorded update' : 'Upcoming step'}
                        </span>
                        <button
                          type="button"
                          onClick={() => onOpenOrder?.(event)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#2CC295]/30 bg-[#2CC295]/10 text-[#2CC295] transition-colors hover:bg-[#2CC295]/16"
                          aria-label={`Open order ${event.orderId} in Orders`}
                        >
                          <ArrowUpRight size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </>
      ) : null}
    </article>
  );
}
