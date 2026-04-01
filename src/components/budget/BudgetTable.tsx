import { useMemo, useState } from 'react'
import type { BudgetItem, Categorie } from '../../types'
import { CategoryGroup } from './CategoryGroup'
import { BudgetItemRow } from './BudgetItemRow'
import { BudgetTableHead } from './BudgetTableHead'
import { toAriary } from '../../utils/formatters'
import { Card, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { computeMontantMensuel } from '../../utils/periodicite'
import { LayoutGrid, List } from 'lucide-react'

function mensuelLigne(i: BudgetItem): number {
  if (!i.actif) return 0
  return computeMontantMensuel(
    i.quantite,
    i.prixUnitaire,
    i.periodicite,
    i.frequence,
  )
}

export function BudgetTable({
  items,
  categories,
  onSaveRow,
  onDeleteRow,
  onAddItem,
  disabled,
}: {
  items: BudgetItem[]
  categories: Categorie[]
  onSaveRow: (id: number, patch: Partial<BudgetItem>) => void
  onDeleteRow: (id: number) => void
  /** Sans `categorieId`, la page crée si besoin une catégorie « Divers » puis le poste. */
  onAddItem: (categorieId?: number) => void
  disabled?: boolean
}) {
  const [view, setView] = useState<'grouped' | 'table'>('grouped')

  const byCode = new Map<string, BudgetItem[]>()
  for (const i of items) {
    const list = byCode.get(i.categorie) ?? []
    list.push(i)
    byCode.set(i.categorie, list)
  }
  /** Catégories API (ordre) + codes orphelins présents seulement sur des postes. */
  const fromApi = [...categories]
    .sort((a, b) => a.ordre - b.ordre || a.code.localeCompare(b.code))
    .map((c) => c.code)
  const orphanCodes = [...byCode.keys()].filter((code) => !fromApi.includes(code))
  const orderedCodes = [...fromApi, ...orphanCodes.sort((a, b) => a.localeCompare(b))]

  const grand = items.reduce((s, i) => s + i.quantite * i.prixUnitaire, 0)
  const grandMensuel = items.reduce((s, i) => s + mensuelLigne(i), 0)

  const flatSorted = useMemo(() => {
    return [...items].sort((a, b) => {
      const ca = a.categorie.localeCompare(b.categorie)
      if (ca !== 0) return ca
      return a.nom.localeCompare(b.nom, 'fr')
    })
  }, [items])

  const showEmptyGrouped =
    view === 'grouped' && orderedCodes.length === 0 && items.length === 0

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-sm text-stone-600">Affichage :</span>
        <div className="inline-flex rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-0.5">
          <Button
            type="button"
            variant={view === 'grouped' ? 'secondary' : 'ghost'}
            className="!gap-1.5 !text-xs"
            onClick={() => setView('grouped')}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Par catégorie
          </Button>
          <Button
            type="button"
            variant={view === 'table' ? 'secondary' : 'ghost'}
            className="!gap-1.5 !text-xs"
            onClick={() => setView('table')}
          >
            <List className="h-3.5 w-3.5" />
            Tableau
          </Button>
        </div>
      </div>

      {showEmptyGrouped ? (
        <div className="mb-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-6 text-center text-sm text-stone-600">
          <p className="mb-3">Aucun poste budgétaire pour l’instant.</p>
          <Button
            type="button"
            variant="secondary"
            disabled={disabled}
            onClick={() => onAddItem()}
          >
            Ajouter un poste
          </Button>
        </div>
      ) : null}

      {view === 'table' ? (
        <div className="mb-4 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] px-4 py-2">
            <span className="text-sm text-stone-600">{items.length} poste(s)</span>
            <Button
              type="button"
              variant="secondary"
              className="text-xs"
              disabled={disabled}
              onClick={() => onAddItem()}
            >
              Ajouter un poste
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] border-collapse text-sm">
              <BudgetTableHead />
              <tbody>
                {flatSorted.map((row) => (
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
            </table>
          </div>
        </div>
      ) : (
        orderedCodes.map((code) => {
          const list = byCode.get(code) ?? []
          const label = categories.find((c) => c.code === code)?.libelle ?? code
          return (
            <CategoryGroup
              key={code}
              code={code}
              label={label}
              items={list}
              categories={categories}
              onSaveRow={onSaveRow}
              onDeleteRow={onDeleteRow}
              onAddItem={onAddItem}
              disabled={disabled}
            />
          )
        })
      )}

      <Card>
        <CardContent className="!py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium text-[var(--color-ink)]">Total général</span>
            <div className="text-right">
              <div className="font-[family-name:var(--font-display)] text-xl">
                {toAriary(grand)}
              </div>
              <div className="text-xs text-stone-500">
                Équivalent mensuel (agrégé) : {toAriary(grandMensuel)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
