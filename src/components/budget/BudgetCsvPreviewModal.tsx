import { useMemo } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { toAriary } from '../../utils/formatters'
import type { BudgetItem } from '../../types'
import type { ParsedBudgetRow } from '../../utils/csv'
import { cn } from '../../utils/cn'

function ActionBadge({ action }: { action: 'create' | 'update' }) {
  if (action === 'create') {
    return (
      <Badge className="border-emerald-200 bg-emerald-100 text-emerald-800">
        Cr\u00e9er
      </Badge>
    )
  }
  return (
    <Badge className="border-amber-200 bg-amber-100 text-amber-800">
      Mettre \u00e0 jour
    </Badge>
  )
}

type RowAction = 'create' | 'update'

interface PreviewRow {
  row: ParsedBudgetRow
  action: RowAction
}

export function BudgetCsvPreviewModal({
  open,
  onClose,
  rows,
  existingItems,
  onConfirm,
  isPending,
}: {
  open: boolean
  onClose: () => void
  rows: ParsedBudgetRow[]
  existingItems: BudgetItem[]
  onConfirm: () => void
  isPending: boolean
}) {
  const preview = useMemo<PreviewRow[]>(() => {
    const existingKeys = new Map(
      existingItems.map((i) => [i.nom.trim().toLowerCase(), i]),
    )
    return rows.map((row) => ({
      row,
      action: existingKeys.has(row.nom.trim().toLowerCase()) ? 'update' : 'create',
    }))
  }, [rows, existingItems])

  const createCount = preview.filter((p) => p.action === 'create').length
  const updateCount = preview.filter((p) => p.action === 'update').length

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Pr\u00e9visualisation import — ${rows.length} ligne(s)`}
      className="max-w-3xl"
      disableClose={isPending}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-emerald-800 border border-emerald-200">
            <span className="font-medium">{createCount}</span> \u00e0 cr\u00e9er
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-amber-800 border border-amber-200">
            <span className="font-medium">{updateCount}</span> \u00e0 mettre \u00e0 jour
          </span>
        </div>

        <div className="max-h-[50vh] overflow-auto rounded-xl border border-[var(--color-border)]">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-stone-50">
              <tr className="border-b border-[var(--color-border)] text-left text-xs font-medium text-stone-600">
                <th className="px-3 py-2">Nom</th>
                <th className="px-3 py-2">Cat\u00e9gorie</th>
                <th className="px-3 py-2">P\u00e9riodicit\u00e9</th>
                <th className="px-3 py-2 text-right">Qt\u00e9</th>
                <th className="px-3 py-2 text-right">PU</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {preview.map(({ row, action }, idx) => (
                <tr
                  key={idx}
                  className={cn(
                    'border-b border-[var(--color-border)] last:border-0',
                    action === 'update' && 'bg-amber-50',
                    action === 'create' && 'bg-emerald-50/60',
                  )}
                >
                  <td className="px-3 py-2 font-medium text-[var(--color-ink)]">
                    {row.nom}
                  </td>
                  <td className="px-3 py-2 text-stone-600">
                    {row.categorieLibelle}
                  </td>
                  <td className="px-3 py-2 text-stone-600">
                    {row.periodicite}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {row.quantite}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {toAriary(row.prixUnitaire)}
                  </td>
                  <td className="px-3 py-2">
                    <ActionBadge action={action} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isPending}
          >
            Annuler
          </Button>
          <Button
            type="button"
            disabled={isPending || rows.length === 0}
            onClick={onConfirm}
          >
            Confirmer l\u2019import
          </Button>
        </div>
      </div>
    </Modal>
  )
}
