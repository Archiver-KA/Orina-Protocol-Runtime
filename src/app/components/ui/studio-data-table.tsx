import type { HTMLAttributes, ReactNode, TableHTMLAttributes, ThHTMLAttributes } from 'react';
import { cn } from '@/app/components/ui/utils';
import { StudioPanel } from '@/app/components/ui/studio-panel';

interface WithChildren {
  children: ReactNode;
  className?: string;
}

export function StudioDataTableShell({ children, className }: WithChildren) {
  return <StudioPanel className={cn('rounded-2xl overflow-hidden', className)}>{children}</StudioPanel>;
}

export function StudioDataTable({
  children,
  className,
  ...props
}: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <table className={cn('w-full text-left border-collapse', className)} {...props}>
      {children}
    </table>
  );
}

export function StudioDataTableHeadRow({ children, className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        'text-[10px] text-zinc-500 uppercase tracking-widest border-b border-[#27272a]/50 bg-white/[0.01]',
        className
      )}
      {...props}
    >
      {children}
    </tr>
  );
}

export function StudioDataTableHeadCell({
  children,
  className,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={cn('px-6 py-4 font-bold', className)} {...props}>
      {children}
    </th>
  );
}

export function StudioDataTableFooter({ children, className }: WithChildren) {
  return (
    <div className={cn('p-4 border-t border-[#27272a]/30 bg-white/[0.01] flex items-center justify-between', className)}>
      {children}
    </div>
  );
}

