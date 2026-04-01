import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const variants: Record<Variant, string> = {
  primary:
    'bg-[var(--color-amber)] text-[var(--color-ink)] hover:opacity-90 border border-amber-600/20',
  secondary:
    'bg-[var(--color-surface)] text-[var(--color-ink)] border border-[var(--color-border)] hover:bg-stone-50',
  ghost: 'bg-transparent text-[var(--color-ink)] hover:bg-stone-100/80',
  danger:
    'bg-[var(--color-danger)] text-white hover:opacity-90 border border-red-700/20',
}

export function Button({
  className,
  variant = 'primary',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50',
        variants[variant],
        className,
      )}
      {...props}
    />
  )
}
