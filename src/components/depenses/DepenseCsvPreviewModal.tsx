import { useMemo } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { toAriary, formatYmdFrSlash } from '../../utils/formatters'
import type { DepenseApi } from '../../types'
import type { ParsedDepenseCsvRow } from '../../utils/csv'
import { cn } from '../../utils/cn'

interface PreviewRow {
  row: ParsedDepenseCsvRow
  isDuplicate: boolean
}

function isDuplicateRow(row: ParsedDepenseCsvRow, existingItems: DepenseApi[]): boolean {
  const montant = Math.round(row.quantite * row.prixUnitaire)
  const produitLower = row.produit.trim().toLowerCase()
  return existingItems.some(
    (d) =>
      d.date === row.dateIso &&
      d.produit.trim().toLowerCase() === produitLower &&
      d.montant === montant,
  )
}

export function DepenseCsvPreviewModal({
  open,
  onClose,
  rows,
  existingItems,
  onConfirm,
  isPending,
}: {
  open: boolean
  onClose: () => void
  rows: ParsedDepenseCsvRow[]
  existingItems: DepenseApi[]
  onConfirm: (rowsToImport: ParsedDepenseCsvRow[]) => void
  isPending: boolean
}) {
  const preview = useMemo<PreviewRow[]>(() => {
    return rows.map((row) => ({
      row,
      isDuplicate: isDuplicateRow(row, existingItems),
    }))
  }, [rows, existingItems])

  const newCount = preview.filter((p) => !p.isDuplicate).length
  const dupCount = preview.filter((p) => p.isDuplicate).length

  function handleConfirm() {
    const rowsToImport = preview.filter((p) => !p.isDuplicate).map((p) => p.row)
    onConfirm(rowsToImport)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Pr\u00e9visualisation import — ${rows.length} ligne(s)`}
      className="max-w-4xl"
      disableClose={isPending}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-emerald-800 border border-emerald-200">
            <span className="font-medium">{newCount}</span> nouvelle(s)
          </span>
          {dupCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-red-800 border border-red-200">
              <span className="font-medium">{dupCount}</span> doublon(s) d\u00e9tect\u00e9(s) (seront ignor\u00e9s)
            </span>
          )}
        </div>

        <div className="max-h-[50vh] overflow-auto rounded-xl border border-[var(--color-border)]">
          <table className="w-full min-w-[700px] border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-stone-50">
              <tr className="border-b border-[var(--color-border)] text-left text-xs font-medium text-stone-600">
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Produit</th>
                <th className="px-3 py-2 text-right">Qt\u00e9</th>
                <th className="px-3 py-2 text-right">PU</th>
                <th className="px-3 py-2 text-right">Montant</th>
                <th className="px-3 py-2">Statut</th>
              </tr>
            </thead>
            <tbody>
              {preview.map(({ row, isDuplicate }, idx) => (
                <tr
                  key={idx}
                  className={cn(
                    'border-b border-[var(--color-border)] last:border-0',
                    isDuplicate && 'bg-red-50 opacity-70',
                  )}
                >
                  <td className="px-3 py-2 tabular-nums text-stone-600">
                    {formatYmdFrSlash(row.dateIso)}
                  </td>
                  <td className="px-3 py-2 font-medium text-[var(--color-ink)]">
                    {row.produit}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {row.quantite}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {toAriary(row.prixUnitaire)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium">
                    {toAriary(Math.round(row.quantite * row.prixUnitaire))}
                  </td>
                  <td className="px-3 py-2">
                    {isDuplicate ? (
                      <Badge className="border-red-200 bg-red-100 text-red-800">
                        Doublon
                      </Badge>
                    ) : (
                      <Badge className="border-emerald-200 bg-emerald-100 text-emerald-800">
                        Nouvelle
                      </Badge>
                    )}
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
            disabled={isPending || newCount === 0}
            onClick={handleConfirm}
          >
            Confirmer l\u2019import ({newCount} ligne{newCount > 1 ? 's' : ''})
          </Button>
        </div>
      </div>
    </Modal>
  )
}
