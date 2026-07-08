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
        'border-b border-ui-border-subtle bg-[var(--t-surface-2)] text-[10px] uppercase tracking-widest text-ui-muted',
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
    <th className={cn('px-6 py-4 font-semibold', className)} {...props}>
      {children}
    </th>
  );
}

export function StudioDataTableFooter({ children, className }: WithChildren) {
  return (
    <div className={cn('flex items-center justify-between border-t border-ui-border-subtle bg-[var(--t-surface-2)] p-4', className)}>
      {children}
    </div>
  );
}

