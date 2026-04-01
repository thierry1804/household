import type { HTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

export function Badge({
  className,
  style,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center rounded-md border px-2 py-0.5 text-xs font-medium',
        className,
      )}
      style={style}
      {...props}
    />
  )
}
