import { useEffect, useRef, useState } from 'react'
import type { BudgetItem, Categorie, Periodicite } from '../../types'
import { Input, Select } from '../ui/Input'
import { Button } from '../ui/Button'
import { toAriary } from '../../utils/formatters'
import { computeMontantMensuel } from '../../utils/periodicite'
import { AlertCircle, Check, Loader2, Trash2 } from 'lucide-react'
import { cn } from '../../utils/cn'

const PERIODICITES: Periodicite[] = [
  'MOIS',
  'SEMAINE',
  '2_SEMAINES',
  'TRIMESTRE',
  'ANNEE',
]

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export function BudgetItemRow({
  item,
  categories,
  onSave,
  onDelete,
  disabled,
  pendingDelete,
}: {
  item: BudgetItem
  categories: Categorie[]
  onSave: (id: number, patch: Partial<BudgetItem>) => Promise<void>
  onDelete: (id: number) => void
  disabled?: boolean
  pendingDelete?: boolean
}) {
  const [local, setLocal] = useState(item)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setLocal(item)
  }, [item])

  const montant = local.quantite * local.prixUnitaire
  const mensuelCalc = computeMontantMensuel(
    local.quantite,
    local.prixUnitaire,
    local.periodicite,
    local.frequence,
  )

  async function commit(field: keyof BudgetItem, value: string | number | boolean) {
    const next = { ...local, [field]: value }
    setLocal(next as BudgetItem)
    setSaveStatus('saving')
    try {
      await onSave(item.id, { [field]: value } as Partial<BudgetItem>)
      setSaveStatus('saved')
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000)
    } catch {
      setSaveStatus('error')
    }
  }

  async function setFrequence(v: number) {
    const n = Math.max(1, Math.floor(Number.isFinite(v) ? v : 1))
    setLocal({ ...local, frequence: n })
    if (n !== item.frequence) {
      setSaveStatus('saving')
      try {
        await onSave(item.id, { frequence: n })
        setSaveStatus('saved')
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
        savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000)
      } catch {
        setSaveStatus('error')
      }
    }
  }

  return (
    <tr className={cn('border-b border-[var(--color-border)]', pendingDelete && 'opacity-40 pointer-events-none')}>
      <td className="px-2 py-2 align-middle">
        <Input
          value={local.nom}
          disabled={disabled}
          onChange={(e) => setLocal({ ...local, nom: e.target.value })}
          onBlur={() => {
            if (local.nom !== item.nom) commit('nom', local.nom)
          }}
        />
      </td>
      <td className="px-2 py-2 align-middle">
        <Select
          value={local.periodicite}
          disabled={disabled}
          onChange={(e) => {
            const v = e.target.value as Periodicite
            setLocal({ ...local, periodicite: v })
            commit('periodicite', v)
          }}
        >
          {PERIODICITES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Select>
      </td>
      <td className="px-2 py-2 align-middle">
        <Input
          type="number"
          min={1}
          step={1}
          value={local.frequence}
          title="1 = chaque cycle ; 2 = un cycle sur deux (ex. semaine → 1 toutes les 2 semaines)"
          disabled={disabled}
          onChange={(e) =>
            setLocal({ ...local, frequence: Number(e.target.value) })
          }
          onBlur={() => setFrequence(local.frequence)}
        />
      </td>
      <td className="px-2 py-2 align-middle">
        <Input
          type="number"
          min={0.0001}
          step="any"
          value={local.quantite}
          disabled={disabled}
          onChange={(e) =>
            setLocal({ ...local, quantite: Number(e.target.value) })
          }
          onBlur={() => {
            if (local.quantite !== item.quantite) commit('quantite', local.quantite)
          }}
        />
      </td>
      <td className="px-2 py-2 align-middle">
        <Input
          value={local.unite ?? ''}
          placeholder="—"
          disabled={disabled}
          onChange={(e) => setLocal({ ...local, unite: e.target.value })}
          onBlur={() => {
            const u = local.unite || undefined
            if (u !== item.unite) commit('unite', u ?? '')
          }}
        />
      </td>
      <td className="px-2 py-2 align-middle">
        <Input
          type="number"
          min={0}
          step={1}
          value={local.prixUnitaire}
          disabled={disabled}
          onChange={(e) =>
            setLocal({ ...local, prixUnitaire: Number(e.target.value) })
          }
          onBlur={() => {
            if (local.prixUnitaire !== item.prixUnitaire)
              commit('prixUnitaire', local.prixUnitaire)
          }}
        />
      </td>
      <td className="px-2 py-2 align-middle text-sm font-medium">
        {toAriary(montant)}
        <div className="mt-1 text-xs text-stone-500">
          Équivalent mensuel : {toAriary(mensuelCalc)}
        </div>
      </td>
      <td className="px-2 py-2 align-middle">
        <Select
          className="min-w-[8rem]"
          value={String(local.categorieId)}
          disabled={disabled}
          onChange={(e) => {
            const id = Number(e.target.value)
            const cat = categories.find((c) => c.id === id)
            if (!cat) return
            setLocal({
              ...local,
              categorieId: id,
              categorie: cat.code,
            })
            onSave(item.id, { categorieId: id })
          }}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.libelle}
            </option>
          ))}
        </Select>
      </td>
      <td className="px-2 py-2 align-middle">
        <div className="flex items-center gap-1">
          {saveStatus === 'saving' && (
            <Loader2 className="h-4 w-4 animate-spin text-stone-400" aria-label="Sauvegarde…" />
          )}
          {saveStatus === 'saved' && (
            <Check className="h-4 w-4 text-emerald-500" aria-label="Sauvegardé" />
          )}
          {saveStatus === 'error' && (
            <AlertCircle className="h-4 w-4 text-red-500" aria-label="Erreur de sauvegarde" />
          )}
          <Button
            type="button"
            variant="ghost"
            className="!p-2 text-red-600"
            disabled={disabled}
            onClick={() => onDelete(item.id)}
            aria-label="Supprimer"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  )
}
