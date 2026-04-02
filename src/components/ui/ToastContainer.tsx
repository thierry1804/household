import { X } from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'
import { cn } from '../../utils/cn'

export function ToastContainer() {
  const { toasts, removeToast } = useToast()
  if (toasts.length === 0) return null
  return (
    <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="alert"
          className={cn(
            'pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg',
            t.variant === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-900',
            t.variant === 'error' && 'border-red-200 bg-red-50 text-red-900',
            t.variant === 'warning' && 'border-amber-200 bg-amber-50 text-amber-950',
            t.variant === 'info' && 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)]',
          )}
        >
          <span className="flex-1 leading-relaxed">{t.message}</span>
          {t.action && (
            <button
              type="button"
              className="shrink-0 font-medium underline underline-offset-2 hover:no-underline"
              onClick={() => { t.action!.onClick(); removeToast(t.id) }}
            >
              {t.action.label}
            </button>
          )}
          <button
            type="button"
            aria-label="Fermer"
            className="shrink-0 opacity-60 hover:opacity-100"
            onClick={() => removeToast(t.id)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
