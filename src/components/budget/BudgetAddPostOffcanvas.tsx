import { useEffect, useRef, useState } from 'react'
import type { Categorie, Periodicite } from '../../types'
import type { BudgetItemCreatePayload } from '../../services/budget.service'
import { Offcanvas } from '../ui/Offcanvas'
import { Button } from '../ui/Button'
import { Input, Select } from '../ui/Input'
import { computeMontantMensuel } from '../../utils/periodicite'
import { toAriary } from '../../utils/formatters'
import { getViolations } from '../../services/api'
import axios from 'axios'
import { Tag } from 'lucide-react'

const PERIODICITES: Periodicite[] = [
  'MOIS',
  'SEMAINE',
  '2_SEMAINES',
  'TRIMESTRE',
  'ANNEE',
]

type FormState = {
  nom: string
  categorieId: number | ''
  periodicite: Periodicite
  frequence: number
  quantite: number
  unite: string
  prixUnitaire: number
}

function sortCats(categories: Categorie[]) {
  return [...categories].sort(
    (a, b) => a.ordre - b.ordre || a.code.localeCompare(b.code),
  )
}

function initialForm(
  defaultCategorieId: number | undefined,
  categories: Categorie[],
): FormState {
  const sorted = sortCats(categories)
  let categorieId: number | '' = ''
  if (
    defaultCategorieId != null &&
    sorted.some((c) => c.id === defaultCategorieId)
  ) {
    categorieId = defaultCategorieId
  } else if (sorted.length) {
    categorieId = sorted[0].id
  }
  return {
    nom: '',
    categorieId,
    periodicite: 'MOIS',
    frequence: 1,
    quantite: 1,
    unite: '',
    prixUnitaire: 0,
  }
}

function afterAnotherForm(prev: FormState): FormState {
  return {
    ...prev,
    nom: '',
    quantite: 1,
    unite: '',
    prixUnitaire: 0,
  }
}

export function BudgetAddPostOffcanvas({
  open,
  onClose,
  defaultCategorieId,
  categories,
  isPending,
  onCreate,
  onOpenCategoryModal,
  ensureDefaultCategoryId,
  preselectCategoryId,
  onPreselectCategoryConsumed,
  existingNomKeysLower,
}: {
  open: boolean
  onClose: () => void
  defaultCategorieId?: number
  categories: Categorie[]
  isPending: boolean
  onCreate: (payload: BudgetItemCreatePayload) => Promise<unknown>
  onOpenCategoryModal: () => void
  ensureDefaultCategoryId: () => Promise<number>
  /** Après création depuis la modale catégorie : sélectionner cette catégorie dans le formulaire. */
  preselectCategoryId?: number | null
  onPreselectCategoryConsumed?: () => void
  /** Noms déjà pris (trim + minuscules) — unicité des postes. */
  existingNomKeysLower?: ReadonlySet<string>
}) {
  const [form, setForm] = useState<FormState>(() =>
    initialForm(defaultCategorieId, categories),
  )
  const nomRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => nomRef.current?.focus(), 50)
    return () => window.clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (preselectCategoryId == null) return
    if (!categories.some((c) => c.id === preselectCategoryId)) return
    setForm((p) => ({ ...p, categorieId: preselectCategoryId }))
    onPreselectCategoryConsumed?.()
  }, [preselectCategoryId, categories, onPreselectCategoryConsumed])

  const montant =
    Math.max(0, form.quantite) * Math.max(0, Math.round(form.prixUnitaire))
  const mensuel =
    form.categorieId !== '' && form.periodicite
      ? computeMontantMensuel(
          Math.max(0.0001, form.quantite),
          Math.max(0, Math.round(form.prixUnitaire)),
          form.periodicite,
          Math.max(1, Math.floor(form.frequence) || 1),
        )
      : 0

  async function submit(closeAfter: boolean) {
    const nom = form.nom.trim()
    if (!nom) {
      window.alert('Indiquez un nom pour le poste.')
      nomRef.current?.focus()
      return
    }
    const nomKey = nom.toLowerCase()
    if (existingNomKeysLower?.has(nomKey)) {
      window.alert(
        `Un poste nommé « ${nom} » existe déjà. Chaque poste doit avoir un nom unique.`,
      )
      nomRef.current?.focus()
      return
    }
    let categorieId = form.categorieId
    if (categorieId === '') {
      try {
        categorieId = await ensureDefaultCategoryId()
      } catch (e) {
        window.alert(e instanceof Error ? e.message : 'Erreur catégorie')
        return
      }
    }
    const payload: BudgetItemCreatePayload = {
      nom,
      categorieId: Number(categorieId),
      periodicite: form.periodicite,
      frequence: Math.max(1, Math.floor(form.frequence) || 1),
      quantite: Math.max(0.0001, Number(form.quantite) || 1),
      unite: form.unite.trim() ? form.unite.trim() : null,
      prixUnitaire: Math.max(0, Math.round(Number(form.prixUnitaire)) || 0),
      actif: true,
    }
    try {
      await onCreate(payload)
      if (closeAfter) onClose()
      else {
        setForm((p) => afterAnotherForm(p))
        window.setTimeout(() => nomRef.current?.focus(), 0)
      }
    } catch (err) {
      const v = getViolations(err)
      if (v.length) {
        window.alert(v.map((x) => `${x.field}: ${x.message}`).join('\n'))
      } else if (axios.isAxiosError(err)) {
        const data = err.response?.data as { error?: string } | undefined
        window.alert(data?.error ?? err.message)
      } else {
        window.alert(err instanceof Error ? err.message : 'Erreur')
      }
    }
  }

  return (
    <Offcanvas
      open={open}
      onClose={onClose}
      title="Nouveau poste budgétaire"
      disableClose={isPending}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <div>
            <label className="mb-1 block text-xs text-stone-600" htmlFor="add-post-nom">
              Nom
            </label>
            <Input
              id="add-post-nom"
              ref={nomRef}
              value={form.nom}
              disabled={isPending}
              placeholder="Ex. Électricité"
              onChange={(e) => setForm((p) => ({ ...p, nom: e.target.value }))}
            />
          </div>
          <div>
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs text-stone-600" htmlFor="add-post-cat">
                Catégorie
              </label>
              <Button
                type="button"
                variant="ghost"
                className="!h-auto !py-1 !text-xs"
                disabled={isPending}
                onClick={onOpenCategoryModal}
              >
                <Tag className="h-3.5 w-3.5" />
                Nouvelle catégorie
              </Button>
            </div>
            <Select
              id="add-post-cat"
              value={form.categorieId === '' ? '' : String(form.categorieId)}
              disabled={isPending || categories.length === 0}
              onChange={(e) => {
                const v = e.target.value
                setForm((p) => ({
                  ...p,
                  categorieId: v === '' ? '' : Number(v),
                }))
              }}
            >
              {categories.length === 0 ? (
                <option value="">— Aucune catégorie —</option>
              ) : null}
              {sortCats(categories).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.libelle}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className="mb-1 block text-xs text-stone-600"
                htmlFor="add-post-per"
              >
                Périodicité
              </label>
              <Select
                id="add-post-per"
                value={form.periodicite}
                disabled={isPending}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    periodicite: e.target.value as Periodicite,
                  }))
                }
              >
                {PERIODICITES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label
                className="mb-1 block text-xs text-stone-600"
                htmlFor="add-post-freq"
              >
                Fréquence
              </label>
              <Input
                id="add-post-freq"
                type="number"
                min={1}
                step={1}
                value={form.frequence}
                disabled={isPending}
                title="1 = chaque cycle ; 2 = un cycle sur deux"
                onChange={(e) =>
                  setForm((p) => ({ ...p, frequence: Number(e.target.value) }))
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className="mb-1 block text-xs text-stone-600"
                htmlFor="add-post-qte"
              >
                Quantité
              </label>
              <Input
                id="add-post-qte"
                type="number"
                min={0.0001}
                step="any"
                value={form.quantite}
                disabled={isPending}
                onChange={(e) =>
                  setForm((p) => ({ ...p, quantite: Number(e.target.value) }))
                }
              />
            </div>
            <div>
              <label
                className="mb-1 block text-xs text-stone-600"
                htmlFor="add-post-unite"
              >
                Unité
              </label>
              <Input
                id="add-post-unite"
                value={form.unite}
                disabled={isPending}
                placeholder="kWh, L…"
                onChange={(e) =>
                  setForm((p) => ({ ...p, unite: e.target.value }))
                }
              />
            </div>
          </div>
          <div>
            <label
              className="mb-1 block text-xs text-stone-600"
              htmlFor="add-post-pu"
            >
              Prix unitaire (Ar)
            </label>
            <Input
              id="add-post-pu"
              type="number"
              min={0}
              step={1}
              value={form.prixUnitaire}
              disabled={isPending}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  prixUnitaire: Number(e.target.value),
                }))
              }
            />
          </div>
          <div className="rounded-lg border border-[var(--color-border)] bg-stone-50/80 px-3 py-2 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-stone-600">Montant (ligne)</span>
              <span className="font-medium">{toAriary(montant)}</span>
            </div>
            <div className="mt-1 flex justify-between gap-2 text-xs text-stone-500">
              <span>Équivalent mensuel</span>
              <span>{toAriary(mensuel)}</span>
            </div>
          </div>
        </div>
        <div className="shrink-0 space-y-2 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              type="button"
              className="sm:flex-1"
              disabled={isPending}
              onClick={() => submit(true)}
            >
              {isPending ? 'Enregistrement…' : 'Ajouter et fermer'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="sm:flex-1"
              disabled={isPending}
              onClick={() => submit(false)}
            >
              {isPending ? 'Enregistrement…' : 'Ajouter et créer un autre'}
            </Button>
          </div>
        </div>
      </div>
    </Offcanvas>
  )
}
