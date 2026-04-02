import { useEffect, useRef, useState } from 'react'
import type { BudgetItem, DepenseApi } from '../../types'
import { toAriary } from '../../utils/formatters'
import { DateFrField } from '../ui/DateFrField'
import { BudgetPostSearchField } from './BudgetPostSearchField'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { AlertCircle, Check, Loader2, Trash2 } from 'lucide-react'
import type { DepenseEditPayload } from './DepenseForm'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

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
  pendingDelete,
}: {
  row: DepenseApi
  budgetItems: BudgetItem[]
  onUpdate: (id: number, payload: DepenseEditPayload) => Promise<void>
  onDelete: (id: number) => void
  disabled?: boolean
  pendingDelete?: boolean
}) {
  const [draft, setDraft] = useState(() => toDraft(row))
  const draftRef = useRef(toDraft(row))
  const lastSaved = useRef(toDraft(row))
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  async function commitIfDirty() {
    if (disabled) return
    const cur = draftRef.current
    if (draftsEqual(cur, lastSaved.current)) return
    lastSaved.current = cur
    setSaveStatus('saving')
    try {
      await onUpdate(row.id, cur)
      setSaveStatus('saved')
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000)
    } catch {
      setSaveStatus('error')
    }
  }

  const montantPreview = Math.round(draft.quantite * draft.prixUnitaire)
  const sortedPosts = [...budgetItems].sort((a, b) =>
    a.nom.localeCompare(b.nom, 'fr'),
  )

  const rowStyle = pendingDelete ? 'opacity-40 pointer-events-none' : ''

  return (
    <tr className={`border-b border-[var(--color-border)] ${rowStyle}`}>
      <td className="overflow-visible px-2 py-1.5 align-top">
        <DateFrField
          valueYmd={draft.date}
          onChangeYmd={(ymd) =>
            setDraftBoth({ ...draftRef.current, date: ymd })
          }
          onCommit={commitIfDirty}
          disabled={disabled}
          aria-label="Date de la d\u00e9pense (jj/mm/aaaa)"
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
                setSaveStatus('saving')
                onUpdate(row.id, next)
                  .then(() => {
                    setSaveStatus('saved')
                    if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
                    savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000)
                  })
                  .catch(() => setSaveStatus('error'))
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
              setSaveStatus('saving')
              onUpdate(row.id, next)
                .then(() => {
                  setSaveStatus('saved')
                  if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
                  savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000)
                })
                .catch(() => setSaveStatus('error'))
            }
          }}
        />
      </td>
      <td className="px-2 py-1.5 align-top">
        <div className="flex items-center gap-1">
          {saveStatus === 'saving' && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-stone-400" aria-label="Sauvegarde\u2026" />
          )}
          {saveStatus === 'saved' && (
            <Check className="h-3.5 w-3.5 text-emerald-500" aria-label="Sauvegardd\u00e9" />
          )}
          {saveStatus === 'error' && (
            <AlertCircle className="h-3.5 w-3.5 text-red-500" aria-label="Erreur de sauvegarde" />
          )}
          <Button
            type="button"
            variant="ghost"
            className="!p-2 text-red-600"
            disabled={disabled}
            onClick={() => onDelete(row.id)}
            aria-label="Supprimer"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  )
}
