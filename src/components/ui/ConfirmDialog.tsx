import type { ReactNode } from 'react'
import { useId } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'

type ConfirmVariant = 'danger' | 'primary'

export function ConfirmDialog({
  open,
  onClose,
  title,
  children,
  confirmLabel,
  cancelLabel = 'Annuler',
  onConfirm,
  isPending = false,
  confirmVariant = 'danger',
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  confirmLabel: string
  cancelLabel?: string
  onConfirm: () => void | Promise<void>
  isPending?: boolean
  confirmVariant?: ConfirmVariant
}) {
  const descriptionId = useId()

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      disableClose={isPending}
      descriptionId={descriptionId}
      className="max-w-md"
    >
      <div className="space-y-5">
        <div id={descriptionId} className="text-sm leading-relaxed text-stone-600">
          {children}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--color-border)] pt-4">
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={onClose}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={confirmVariant}
            disabled={isPending}
            onClick={() => void onConfirm()}
          >
            {isPending ? 'Veuillez patienter…' : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
