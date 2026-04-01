import type { HTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

export function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_2px_8px_rgba(0,0,0,0.06)]',
        className,
      )}
      {...props}
    />
  )
}

export function CardHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('border-b border-[var(--color-border)] px-5 py-4', className)} {...props} />
  )
}

export function CardContent({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5', className)} {...props} />
}
