import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { BudgetItem, Categorie } from '../../types'
import { BudgetItemRow } from './BudgetItemRow'
import { BudgetTableHead } from './BudgetTableHead'
import { computeMontantMensuel } from '../../utils/periodicite'
import { toAriary } from '../../utils/formatters'
import { colorForCategoryCode } from '../../utils/categories'
import { Button } from '../ui/Button'

export function CategoryGroup({
  code,
  label,
  items,
  categories,
  onSaveRow,
  onDeleteRow,
  onAddItem,
  disabled,
}: {
  code: string
  label: string
  items: BudgetItem[]
  categories: Categorie[]
  onSaveRow: (id: number, patch: Partial<BudgetItem>) => void
  onDeleteRow: (id: number) => void
  onAddItem: (categorieId?: number) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(true)
  const subtotal = items.reduce((s, i) => s + i.quantite * i.prixUnitaire, 0)
  const mensuel = items.reduce(
    (s, i) =>
      s +
      (i.actif
        ? computeMontantMensuel(
            i.quantite,
            i.prixUnitaire,
            i.periodicite,
            i.frequence,
          )
        : 0),
    0,
  )
  const color = colorForCategoryCode(code, categories)

  return (
    <div className="mb-4 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
      {/* Pas de <button> parent : un bouton ne peut pas en contenir un autre (HTML invalide). */}
      <div className="flex w-full items-center justify-between gap-2 border-b border-[var(--color-border)] px-4 py-3">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          onClick={() => setOpen(!open)}
        >
          {open ? (
            <ChevronDown className="h-4 w-4 shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0" />
          )}
          <span
            className="font-[family-name:var(--font-display)] text-lg text-[var(--color-ink)]"
            style={{ borderLeft: `4px solid ${color}`, paddingLeft: 8 }}
          >
            {label}
          </span>
          <span className="text-sm text-stone-500">({items.length})</span>
        </button>
        <Button
          type="button"
          variant="secondary"
          className="shrink-0 text-xs"
          disabled={disabled}
          onClick={() => {
            const cat = categories.find((c) => c.code === code)
            if (cat) onAddItem(cat.id)
            else if (items[0]) onAddItem(items[0].categorieId)
            else onAddItem()
          }}
        >
          Ajouter un poste
        </Button>
      </div>
      {open ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse text-sm">
            <BudgetTableHead />
            <tbody>
              {items.map((row) => (
                <BudgetItemRow
                  key={row.id}
                  item={row}
                  categories={categories}
                  onSave={onSaveRow}
                  onDelete={onDeleteRow}
                  disabled={disabled}
                />
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-stone-50/60 font-medium">
                <td colSpan={6} className="px-2 py-2 text-right text-stone-700">
                  Sous-total catégorie (ligne)
                </td>
                <td className="px-2 py-2">{toAriary(subtotal)}</td>
                <td colSpan={2} className="px-2 py-2 text-xs text-stone-500">
                  Équivalent mensuel cumulé : {toAriary(mensuel)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : null}
    </div>
  )
}
