import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, TrendingUp } from 'lucide-react';

type TxRow = {
  event: string;
  asset: string;
  type: string;
  amount: string;
  when: string;
  status: 'Done' | 'Pending';
};

type ProductRow = {
  name: string;
  qty: string;
  value: string;
  img: string;
};

const TRANSACTIONS_PER_PAGE = 10;

const topProducts: ProductRow[] = [
  { name: 'Villa #A12', qty: '24 sold', value: '$520K', img: 'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=80&h=80&fit=crop' },
  { name: 'Office #B08', qty: '18 sold', value: '$412K', img: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=80&h=80&fit=crop' },
  { name: 'Studio #C04', qty: '12 sold', value: '$280K', img: 'https://images.unsplash.com/photo-1494526585095-c41746248156?w=80&h=80&fit=crop' },
];

const transactions: TxRow[] = [
  { event: '#TX-92311', asset: 'Villa Fraction #A12', type: 'Sale', amount: '$42,880', when: '2 mins ago', status: 'Done' },
  { event: '#TX-92308', asset: 'Office Token #B08', type: 'Mint', amount: '$18,350', when: '14 mins ago', status: 'Done' },
  { event: '#TX-92290', asset: 'Studio Unit #C04', type: 'Transfer', amount: '$8,920', when: '32 mins ago', status: 'Pending' },
  { event: '#TX-92274', asset: 'Warehouse Share #D02', type: 'Sale', amount: '$24,600', when: '1 hour ago', status: 'Done' },
  { event: '#TX-92261', asset: 'Retail Unit #E11', type: 'Mint', amount: '$11,250', when: '2 hours ago', status: 'Done' },
  { event: '#TX-92243', asset: 'Logistics Hub #F03', type: 'Transfer', amount: '$13,740', when: '3 hours ago', status: 'Pending' },
  { event: '#TX-92221', asset: 'Resort Share #G09', type: 'Sale', amount: '$57,420', when: '5 hours ago', status: 'Done' },
  { event: '#TX-92198', asset: 'Data Center #H07', type: 'Mint', amount: '$29,880', when: '7 hours ago', status: 'Done' },
  { event: '#TX-92177', asset: 'Apartment Fraction #J15', type: 'Transfer', amount: '$9,320', when: '9 hours ago', status: 'Pending' },
  { event: '#TX-92159', asset: 'Hotel Unit #K21', type: 'Sale', amount: '$33,100', when: '11 hours ago', status: 'Done' },
  { event: '#TX-92136', asset: 'Medical Office #L05', type: 'Mint', amount: '$16,480', when: '13 hours ago', status: 'Done' },
  { event: '#TX-92104', asset: 'Industrial Lot #M18', type: 'Transfer', amount: '$21,960', when: '16 hours ago', status: 'Pending' },
];

const calendarColumns = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const activeDays = [3, 10, 16, 24];

const sourceRows = [
  { name: 'Direct', value: '75%', width: '75%', color: '#2CC295' },
  { name: 'Returning', value: '45%', width: '45%', color: '#6A4C93' },
  { name: 'Referral', value: '15%', width: '15%', color: '#F7DC7F' },
];

export function MarketInsights() {
  const [displayMonth, setDisplayMonth] = useState(new Date(2026, 2, 1));
  const [transactionPage, setTransactionPage] = useState(0);

  const monthCells = useMemo(() => {
    const year = displayMonth.getFullYear();
    const month = displayMonth.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();

    return Array.from({ length: 35 }, (_, index) => {
      const dayOffset = index - firstDayOfMonth + 1;
      const cellDate = new Date(year, month, dayOffset);
      const day = cellDate.getDate();
      const isCurrentMonth = cellDate.getMonth() === month;
      const seed = year * 1000 + month * 100 + day * 7 + index;
      const shipping = 24 + (seed % 64);
      const confirm = 18 + ((seed * 3) % 58);

      return {
        key: `${cellDate.getFullYear()}-${cellDate.getMonth()}-${day}-${index}`,
        day,
        isCurrentMonth,
        shipping,
        confirm,
        isActive: isCurrentMonth && activeDays.includes(day),
      };
    });
  }, [displayMonth]);

  const monthLabel = useMemo(
    () =>
      displayMonth
        .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        .toUpperCase(),
    [displayMonth],
  );

  const totalTransactionPages = Math.max(1, Math.ceil(transactions.length / TRANSACTIONS_PER_PAGE));
  const visibleTransactions = useMemo(
    () =>
      transactions.slice(
        transactionPage * TRANSACTIONS_PER_PAGE,
        transactionPage * TRANSACTIONS_PER_PAGE + TRANSACTIONS_PER_PAGE,
      ),
    [transactionPage],
  );

  const goToPreviousMonth = () =>
    setDisplayMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));

  const goToNextMonth = () =>
    setDisplayMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

  const goToPreviousTransactions = () =>
    setTransactionPage((prev) => Math.max(0, prev - 1));

  const goToNextTransactions = () =>
    setTransactionPage((prev) => Math.min(totalTransactionPages - 1, prev + 1));

  return (
    <section className="bg-ui-page h-full overflow-y-auto hidden-scrollbar">
      <style>{`
        .hidden-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      <div className="w-full max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-6 sm:py-8 space-y-4 sm:space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
          <h1 className="text-xl sm:text-2xl font-bold text-ui-primary">Market Intelligence</h1>
          <button
            type="button"
            className="h-[34px] px-4 inline-flex items-center gap-2 rounded-lg bg-ui-card border border-[var(--t-border-subtle)] text-ui-secondary hover:bg-[var(--t-surface-5)] transition-colors"
          >
            <Download size={13} />
            <span className="text-xs font-semibold">Export CSV</span>
          </button>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-4 sm:gap-6">
          <article className="bg-ui-card rounded-[24px] p-6 min-h-[220px] flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <p className="text-[12px] uppercase tracking-wider font-bold text-ui-muted">Total Revenue</p>
                <span className="h-[19px] px-2 rounded-full bg-[rgba(44,194,149,0.1)] text-[#2CC295] text-[10px] font-bold inline-flex items-center gap-1">
                  +12%
                  <TrendingUp size={10} />
                </span>
              </div>
              <div>
                <p className="text-[30px] leading-[36px] font-extrabold text-ui-primary">$1,253,235</p>
                <p className="text-[10px] text-ui-muted mt-1">Gained +$345.45 this month</p>
              </div>
            </div>

            <div className="pt-8 space-y-3">
              <p className="text-[10px] uppercase font-bold tracking-wider text-ui-muted">Revenue Sources</p>
              <div className="h-1 rounded-full overflow-hidden flex gap-1">
                <span className="bg-[#2CC295] w-[40%]" />
                <span className="bg-[#6A4C93] w-[24%]" />
                <span className="bg-[#F7DC7F] w-[20%]" />
                <span className="bg-[#3B82F6] w-[16%]" />
              </div>
              <div className="flex items-center gap-4 text-[10px] text-ui-secondary">
                <span className="inline-flex items-center gap-1.5"><i className="w-2 h-2 rounded-full bg-[#2CC295]" />Sales</span>
                <span className="inline-flex items-center gap-1.5"><i className="w-2 h-2 rounded-full bg-[#6A4C93]" />Mint</span>
                <span className="inline-flex items-center gap-1.5"><i className="w-2 h-2 rounded-full bg-[#F7DC7F]" />Fees</span>
              </div>
            </div>
          </article>

          <article className="bg-ui-card rounded-[24px] p-6 min-h-[220px]">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[12px] uppercase font-bold tracking-wider text-ui-muted">Order Trends</p>
              <span className="text-[10px] text-ui-secondary font-bold">Last 7 Days</span>
            </div>

            <div className="grid grid-cols-4 gap-3 mb-5">
              <div>
                <p className="text-[10px] text-ui-muted">Open</p>
                <p className="text-[14px] font-bold text-ui-primary">42</p>
              </div>
              <div>
                <p className="text-[10px] text-ui-muted">Done</p>
                <p className="text-[14px] font-bold text-ui-primary">128</p>
              </div>
              <div>
                <p className="text-[10px] text-ui-muted">Late</p>
                <p className="text-[14px] font-bold text-ui-primary">9</p>
              </div>
              <div>
                <p className="text-[10px] text-ui-muted">Fail</p>
                <p className="text-[14px] font-bold text-ui-primary">4</p>
              </div>
            </div>

            <div className="h-[126px] pt-2">
              <svg viewBox="0 0 343 96" className="w-full h-full">
                <defs>
                  <linearGradient id="orderLineFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#2CC295" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#2CC295" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,72 C40,50 86,18 128,26 C168,34 202,66 246,52 C284,40 314,24 343,30 L343,96 L0,96 Z"
                  fill="url(#orderLineFill)"
                />
                <path
                  d="M0,72 C40,50 86,18 128,26 C168,34 202,66 246,52 C284,40 314,24 343,30"
                  fill="none"
                  stroke="#2CC295"
                  strokeWidth="3"
                />
              </svg>
            </div>
          </article>

          <article className="bg-ui-card rounded-[24px] p-6 min-h-[220px] sm:col-span-2 2xl:col-span-1">
            <p className="text-[12px] uppercase tracking-wider font-bold text-ui-muted">Weekly Volume</p>
            <p className="text-[24px] font-black text-ui-primary mt-1">842.5 ETH</p>
            <p className="text-[9px] text-ui-muted mt-1">7-day settlement volume</p>
            <div className="mt-6 h-[88px] flex items-end gap-2">
              {[32, 48, 72, 40, 56, 36, 24].map((v, i) => (
                <span
                  key={i}
                  className={`flex-1 rounded-sm ${i === 2 ? 'bg-[#2CC295] shadow-[0_0_10px_rgba(44,194,149,0.25)]' : 'bg-[var(--t-surface-10)]'}`}
                  style={{ height: `${v}px` }}
                />
              ))}
            </div>
          </article>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-4 sm:gap-6 items-start">
          <div className="space-y-4 sm:space-y-6">
            <article className="bg-ui-card rounded-[24px] p-6 min-h-[210px]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[12px] font-bold text-ui-primary">Traffic Analytics</h3>
                <button className="h-[25px] px-2 rounded bg-ui-card border border-[var(--t-border-subtle)] text-[10px] font-bold text-ui-secondary">
                  Live
                </button>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="opacity-40">
                  <svg viewBox="0 0 118 70" className="w-full h-[62px]">
                    <polyline points="8,52 24,44 38,32 57,35 70,24 84,14 102,8 110,20" fill="none" stroke="#FFFFFF" strokeWidth="2.4" />
                    <polyline points="8,58 24,55 38,48 57,44 70,40 84,28 102,22 110,25" fill="none" stroke="#FFFFFF" strokeWidth="2" opacity="0.6" />
                  </svg>
                  <div className="mt-3">
                    <p className="text-[10px] uppercase font-bold text-ui-muted">Total Visitor</p>
                    <p className="text-[18px] leading-7 font-extrabold text-ui-primary">124,235</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {sourceRows.map((row) => (
                    <div key={row.name} className="space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-bold text-ui-primary">{row.name}</span>
                        <span className="font-bold text-ui-muted">{row.value}</span>
                      </div>
                      <div className="h-1 rounded-full bg-[var(--t-surface-10)] overflow-hidden">
                        <span className="block h-full" style={{ width: row.width, background: row.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </article>

            <article className="bg-ui-card rounded-[24px] p-6 min-h-[240px]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[12px] font-bold text-ui-primary">Top Products</h3>
                <button className="h-[25px] px-2 rounded bg-ui-card border border-[var(--t-border-subtle)] text-[10px] font-bold text-ui-secondary">
                  Live
                </button>
              </div>

              <div className="space-y-4">
                {topProducts.map((product) => (
                  <div key={product.name} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img src={product.img} alt={product.name} className="w-9 h-9 rounded-[8px] object-cover opacity-70" />
                      <div className="min-w-0">
                        <p className="text-[12px] font-bold text-ui-primary truncate">{product.name}</p>
                        <p className="text-[10px] text-ui-muted">{product.qty}</p>
                      </div>
                    </div>
                    <span className="text-[12px] font-bold text-[#2CC295] shrink-0">{product.value}</span>
                  </div>
                ))}
              </div>
            </article>
          </div>

          <article className="bg-ui-card rounded-[24px] p-6 min-h-[474px]">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-[12px] uppercase tracking-wider font-bold text-ui-primary">Sales Performance</h3>
                <p className="text-[10px] text-ui-muted mt-1">Real-time shipping and confirmation conversion</p>
              </div>
              <div className="flex items-center gap-4 text-[9px] uppercase font-bold text-ui-muted">
                <span className="inline-flex items-center gap-1.5"><i className="w-1.5 h-1.5 rounded-full bg-[#2CC295] shadow-[0_0_4px_#2CC295]" />Shipping</span>
                <span className="inline-flex items-center gap-1.5"><i className="w-1.5 h-1.5 rounded-full bg-[#F7DC7F] shadow-[0_0_4px_#F7DC7F]" />Confirm</span>
              </div>
            </div>

            <div className="mb-3 flex items-center justify-between">
              <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-ui-muted">
                {monthLabel}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={goToPreviousMonth}
                  className="w-8 h-8 rounded-lg border border-ui-border-subtle bg-ui-input text-ui-muted hover:text-ui-primary hover:bg-ui-input-focus inline-flex items-center justify-center"
                  aria-label="Previous month"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={goToNextMonth}
                  className="w-8 h-8 rounded-lg border border-ui-border-subtle bg-ui-input text-ui-muted hover:text-ui-primary hover:bg-ui-input-focus inline-flex items-center justify-center"
                  aria-label="Next month"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {calendarColumns.map((d) => (
                <span key={d} className="h-[22px] text-[9px] font-bold uppercase text-[#52525B] flex items-center justify-center">
                  {d}
                </span>
              ))}

              {monthCells.map((cell) => (
                <div
                  key={cell.key}
                  className={`relative rounded-lg p-1.5 bg-[var(--t-surface-2)] ${
                    cell.isActive ? 'bg-[rgba(44,194,149,0.09)] shadow-[0_0_16px_rgba(44,194,149,0.10)]' : ''
                  }`}
                >
                  {cell.isActive && (
                    <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#2CC295] shadow-[0_0_6px_#2CC295]" />
                  )}
                  <p className={`text-[10px] font-bold ${cell.isCurrentMonth ? (cell.isActive ? 'text-[#2CC295]' : 'text-ui-primary') : 'text-ui-muted'}`}>
                    {cell.day}
                  </p>
                  <div className="h-1 rounded-full bg-[var(--t-surface-10)] mt-1.5 overflow-hidden">
                    <span className="block h-full bg-[#2CC295]" style={{ width: `${cell.shipping}%` }} />
                  </div>
                  <div className="h-1 rounded-full bg-[var(--t-surface-10)] mt-1 overflow-hidden">
                    <span className="block h-full bg-[#F7DC7F]" style={{ width: `${cell.confirm}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>

        <section className="bg-ui-card rounded-[24px] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-[12px] uppercase tracking-wider font-bold text-ui-primary">Recent Transactions</h3>
              <p className="text-[10px] text-ui-muted mt-1">Latest marketplace settlement events</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goToPreviousTransactions}
                disabled={transactionPage === 0}
                className="w-8 h-8 rounded-lg border border-ui-border-subtle bg-ui-input text-ui-muted hover:text-ui-primary hover:bg-ui-input-focus inline-flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Previous transactions page"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={goToNextTransactions}
                disabled={transactionPage >= totalTransactionPages - 1}
                className="w-8 h-8 rounded-lg border border-ui-border-subtle bg-ui-input text-ui-muted hover:text-ui-primary hover:bg-ui-input-focus inline-flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Next transactions page"
              >
                <ChevronRight size={16} />
              </button>
              <button
                type="button"
                className="h-[25px] px-3 rounded border border-[rgba(44,194,149,0.3)] text-[#2CC295] text-[10px] font-bold hover:bg-[rgba(44,194,149,0.08)] transition-colors"
              >
                Export CSV
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="border-b border-ui-border-subtle">
                  <th className="text-left py-2 px-2 text-[10px] uppercase text-ui-muted font-bold">Event</th>
                  <th className="text-left py-2 px-2 text-[10px] uppercase text-ui-muted font-bold">Asset</th>
                  <th className="text-left py-2 px-2 text-[10px] uppercase text-ui-muted font-bold">Type</th>
                  <th className="text-left py-2 px-2 text-[10px] uppercase text-ui-muted font-bold">Amount</th>
                  <th className="text-left py-2 px-2 text-[10px] uppercase text-ui-muted font-bold">Time</th>
                  <th className="text-left py-2 px-2 text-[10px] uppercase text-ui-muted font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                {visibleTransactions.map((row, idx) => (
                  <tr key={row.event} className={idx > 0 ? 'border-t border-ui-border-subtle' : ''}>
                    <td className="py-4 px-2 text-[11px] font-mono text-ui-secondary">{row.event}</td>
                    <td className="py-4 px-2 text-[11px] font-bold text-ui-primary">{row.asset}</td>
                    <td className="py-4 px-2">
                      <span className="inline-flex h-[16px] px-2 items-center rounded bg-[var(--t-surface-10)] text-[9px] font-bold uppercase text-ui-muted">
                        {row.type}
                      </span>
                    </td>
                    <td className="py-4 px-2 text-[11px] font-bold text-ui-primary">{row.amount}</td>
                    <td className="py-4 px-2 text-[11px] text-ui-muted">{row.when}</td>
                    <td className="py-4 px-2">
                      <span
                        className={`inline-flex h-[16px] px-2 items-center rounded-full text-[10px] font-bold ${
                          row.status === 'Done'
                            ? 'bg-[rgba(44,194,149,0.1)] text-[#2CC295]'
                            : 'bg-[rgba(247,220,127,0.1)] text-[#F7DC7F]'
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </section>
  );
}
