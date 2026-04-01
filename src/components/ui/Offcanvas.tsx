import type { ReactNode } from 'react'
import { useEffect, useId } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../utils/cn'
import { Button } from './Button'

export function Offcanvas({
  open,
  title,
  children,
  onClose,
  disableClose = false,
}: {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
  disableClose?: boolean
}) {
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const html = document.documentElement
    const body = document.body
    const prevHtmlOverflow = html.style.overflow
    const prevBodyOverflow = body.style.overflow
    const prevBodyPaddingRight = body.style.paddingRight
    const scrollbarW = window.innerWidth - html.clientWidth
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    if (scrollbarW > 0) {
      body.style.paddingRight = `${scrollbarW}px`
    }
    return () => {
      html.style.overflow = prevHtmlOverflow
      body.style.overflow = prevBodyOverflow
      body.style.paddingRight = prevBodyPaddingRight
    }
  }, [open])

  useEffect(() => {
    if (!open || disableClose) return
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose, disableClose])

  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className={cn(
          'absolute inset-0 bg-black/40',
          disableClose && 'cursor-wait',
        )}
        aria-label="Fermer le panneau"
        onClick={() => {
          if (!disableClose) onClose()
        }}
      />
      <div
        className={cn(
          'absolute right-0 top-0 z-10 flex h-full max-h-dvh w-full max-w-md flex-col border-l border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_2px_12px_rgba(0,0,0,0.12)]',
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <h2
            id={titleId}
            className="font-[family-name:var(--font-display)] text-lg text-[var(--color-ink)]"
          >
            {title}
          </h2>
          <Button
            type="button"
            variant="ghost"
            className="!p-1"
            disabled={disableClose}
            aria-label="Fermer"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  )
}
