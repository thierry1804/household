import type { ReactNode } from 'react'
import { useEffect, useId } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../utils/cn'
import { Button } from './Button'

export function Modal({
  open,
  title,
  children,
  onClose,
  className,
  disableClose = false,
  /** Pour `aria-describedby` (texte explicatif sous le titre). */
  descriptionId,
}: {
  open: boolean
  title?: string
  children: ReactNode
  onClose: () => void
  className?: string
  /** Bloque fermeture (Échap, fond, croix) — ex. pendant une soumission. */
  disableClose?: boolean
  descriptionId?: string
}) {
  const titleDomId = useId()
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleDomId : undefined}
      aria-describedby={descriptionId}
    >
      <button
        type="button"
        className={cn(
          'absolute inset-0 bg-black/40',
          disableClose && 'cursor-wait',
        )}
        aria-label="Fermer"
        onClick={() => {
          if (!disableClose) onClose()
        }}
      />
      <div
        className={cn(
          'relative z-10 max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg',
          className,
        )}
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          {title ? (
            <h2
              id={titleDomId}
              className="font-[family-name:var(--font-display)] text-lg text-[var(--color-ink)]"
            >
              {title}
            </h2>
          ) : (
            <span />
          )}
          <Button
            type="button"
            variant="ghost"
            className="!p-1"
            disabled={disableClose}
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}
