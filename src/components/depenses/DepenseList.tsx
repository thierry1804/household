import { useMemo } from 'react'
import type { BudgetItem, DepenseApi } from '../../types'
import { formatDayLabel } from '../../utils/formatters'
import type { DepenseEditPayload } from './DepenseForm'
import { DepenseEditableRow } from './DepenseEditableRow'

export function DepenseList({
  items,
  budgetItems,
  onUpdate,
  onDelete,
  disabled,
  pendingDeleteIds,
}: {
  items: DepenseApi[]
  budgetItems: BudgetItem[]
  onUpdate: (id: number, payload: DepenseEditPayload) => Promise<void>
  onDelete: (id: number) => void
  disabled?: boolean
  pendingDeleteIds?: Set<number>
}) {
  const byDate = useMemo(() => {
    const map = new Map<string, DepenseApi[]>()
    const sorted = [...items].sort((a, b) => b.date.localeCompare(a.date))
    for (const d of sorted) {
      const list = map.get(d.date) ?? []
      list.push(d)
      map.set(d.date, list)
    }
    return map
  }, [items])

  return (
    <div className="space-y-8">
      {[...byDate.keys()].map((dateKey) => {
        const rows = byDate.get(dateKey) ?? []
        const label = formatDayLabel(dateKey)
        return (
          <section key={dateKey}>
            <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg text-[var(--color-ink)]">
              {label}
            </h2>
            <div className="overflow-x-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
              <table className="w-full min-w-[860px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-stone-50/80 text-left text-xs font-medium text-stone-600">
                    <th className="px-2 py-2">Date</th>
                    <th className="px-2 py-2">Produit</th>
                    <th className="px-2 py-2">Qté</th>
                    <th className="px-2 py-2">Unité</th>
                    <th className="px-2 py-2">PU</th>
                    <th className="px-2 py-2">Montant</th>
                    <th className="px-2 py-2">Poste budgétaire</th>
                    <th className="w-12 px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <DepenseEditableRow
                      key={row.id}
                      row={row}
                      budgetItems={budgetItems}
                      onUpdate={onUpdate}
                      onDelete={onDelete}
                      disabled={disabled}
                      pendingDelete={pendingDeleteIds?.has(row.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )
      })}
    </div>
  )
}
