import { useEffect, useRef, useState } from 'react'
import type { BudgetItem, DepenseApi } from '../../types'
import { toAriary } from '../../utils/formatters'
import { DateFrField } from '../ui/DateFrField'
import { BudgetPostSearchField } from './BudgetPostSearchField'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { Trash2 } from 'lucide-react'
import type { DepenseEditPayload } from './DepenseForm'

function toDraft(r: DepenseApi): DepenseEditPayload {
  return {
    date: r.date,
    produit: r.produit,
    categorieCode: r.categorieCode,
    quantite: r.quantite,
    unite: r.unite ?? '',
    prixUnitaire: r.prixUnitaire,
    budgetItemId: r.budgetItem?.id ?? null,
  }
}

function draftsEqual(a: DepenseEditPayload, b: DepenseEditPayload): boolean {
  return (
    a.date === b.date &&
    a.produit === b.produit &&
    a.categorieCode === b.categorieCode &&
    a.quantite === b.quantite &&
    a.unite === b.unite &&
    a.prixUnitaire === b.prixUnitaire &&
    a.budgetItemId === b.budgetItemId
  )
}

export function DepenseEditableRow({
  row,
  budgetItems,
  onUpdate,
  onDelete,
  disabled,
}: {
  row: DepenseApi
  budgetItems: BudgetItem[]
  onUpdate: (id: number, payload: DepenseEditPayload) => void
  onDelete: (id: number) => void
  disabled?: boolean
}) {
  const [draft, setDraft] = useState(() => toDraft(row))
  const draftRef = useRef(toDraft(row))
  const lastSaved = useRef(toDraft(row))

  function setDraftBoth(next: DepenseEditPayload) {
    draftRef.current = next
    setDraft(next)
  }

  useEffect(() => {
    const n = toDraft(row)
    setDraftBoth(n)
    lastSaved.current = n
  }, [
    row.id,
    row.date,
    row.produit,
    row.categorieCode,
    row.quantite,
    row.unite,
    row.prixUnitaire,
    row.montant,
    row.budgetItem?.id,
  ])

  function commitIfDirty() {
    if (disabled) return
    const cur = draftRef.current
    if (draftsEqual(cur, lastSaved.current)) return
    lastSaved.current = cur
    onUpdate(row.id, cur)
  }

  const montantPreview = Math.round(draft.quantite * draft.prixUnitaire)
  const sortedPosts = [...budgetItems].sort((a, b) =>
    a.nom.localeCompare(b.nom, 'fr'),
  )

  return (
    <tr className="border-b border-[var(--color-border)]">
      <td className="overflow-visible px-2 py-1.5 align-top">
        <DateFrField
          valueYmd={draft.date}
          onChangeYmd={(ymd) =>
            setDraftBoth({ ...draftRef.current, date: ymd })
          }
          onCommit={commitIfDirty}
          disabled={disabled}
          aria-label="Date de la dépense (jj/mm/aaaa)"
          inputClassName="min-w-[7.5rem] py-1.5 text-sm"
        />
      </td>
      <td className="px-2 py-1.5 align-top">
        <Input
          value={draft.produit}
          disabled={disabled}
          className="min-w-[8rem] py-1.5 text-sm"
          onChange={(e) =>
            setDraftBoth({ ...draftRef.current, produit: e.target.value })
          }
          onBlur={commitIfDirty}
        />
      </td>
      <td className="px-2 py-1.5 align-top">
        <Input
          type="number"
          step="any"
          className="max-w-[5.5rem] py-1.5 text-sm"
          value={draft.quantite}
          disabled={disabled}
          onChange={(e) =>
            setDraftBoth({
              ...draftRef.current,
              quantite: Number(e.target.value),
            })
          }
          onBlur={commitIfDirty}
        />
      </td>
      <td className="px-2 py-1.5 align-top">
        <Input
          className="max-w-[5rem] py-1.5 text-sm"
          value={draft.unite}
          disabled={disabled}
          onChange={(e) =>
            setDraftBoth({ ...draftRef.current, unite: e.target.value })
          }
          onBlur={commitIfDirty}
        />
      </td>
      <td className="px-2 py-1.5 align-top">
        <Input
          type="number"
          step={1}
          className="max-w-[6.5rem] py-1.5 text-sm"
          value={draft.prixUnitaire}
          disabled={disabled}
          onChange={(e) =>
            setDraftBoth({
              ...draftRef.current,
              prixUnitaire: Number(e.target.value),
            })
          }
          onBlur={commitIfDirty}
        />
      </td>
      <td className="px-2 py-1.5 align-top text-sm font-medium tabular-nums">
        {toAriary(montantPreview)}
      </td>
      <td className="overflow-visible px-2 py-1.5 align-top">
        <BudgetPostSearchField
          className="min-w-[9rem]"
          inputClassName="py-1.5 text-sm"
          posts={sortedPosts}
          value={draft.budgetItemId != null ? String(draft.budgetItemId) : ''}
          disabled={disabled}
          onChange={(posteId) => {
            const v = posteId.trim()
            if (v === '') {
              const next = { ...draftRef.current, budgetItemId: null }
              setDraftBoth(next)
              if (!draftsEqual(next, lastSaved.current)) {
                lastSaved.current = next
                onUpdate(row.id, next)
              }
              return
            }
            const id = Number(v)
            const b = budgetItems.find((x) => x.id === id)
            if (!b) return
            const next = {
              ...draftRef.current,
              budgetItemId: id,
              categorieCode: b.categorie,
            }
            setDraftBoth(next)
            if (!draftsEqual(next, lastSaved.current)) {
              lastSaved.current = next
              onUpdate(row.id, next)
            }
          }}
        />
      </td>
      <td className="px-2 py-1.5 align-top">
        <Button
          type="button"
          variant="ghost"
          className="!p-2 text-red-600"
          disabled={disabled}
          onClick={() => {
            if (window.confirm('Supprimer cette dépense ?')) onDelete(row.id)
          }}
          aria-label="Supprimer"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </td>
    </tr>
  )
}
