import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)] outline-none ring-amber-500/30 placeholder:text-stone-400 focus:border-amber-500/50 focus:ring-2',
        className,
      )}
      {...props}
    />
  )
})

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)] outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/30',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
}
