import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

export function Table({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table
        className={cn('w-full border-collapse text-left text-sm', className)}
        {...props}
      >
        {children}
      </table>
    </div>
  )
}

export function Th({
  className,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'border-b border-[var(--color-border)] bg-stone-50/80 px-3 py-2 font-medium text-stone-700',
        className,
      )}
      {...props}
    />
  )
}

export function Td({
  className,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn(
        'border-b border-[var(--color-border)] px-3 py-2 align-middle text-[var(--color-ink)]',
        className,
      )}
      {...props}
    />
  )
}
