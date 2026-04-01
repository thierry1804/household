import { useCallback, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Header } from '../components/layout/Header'
import { BudgetAddPostOffcanvas } from '../components/budget/BudgetAddPostOffcanvas'
import { BudgetTable } from '../components/budget/BudgetTable'
import { CategoryCreateModal } from '../components/referentials/CategoryCreateModal'
import { Button } from '../components/ui/Button'
import { useBudgetItems } from '../hooks/useBudgetItems'
import { useCategories } from '../hooks/useCategories'
import type { BudgetItem, Categorie } from '../types'
import { budgetItemFromApiWithCategoryId } from '../types'
import type { BudgetItemUpdatePayload } from '../services/budget.service'
import { parseBudgetCsv } from '../utils/csv'
import { fetchCategories } from '../services/categories.service'
import { getViolations } from '../services/api'
import axios from 'axios'
import { Upload } from 'lucide-react'

function toPayload(patch: Partial<BudgetItem>): BudgetItemUpdatePayload {
  const p: BudgetItemUpdatePayload = {}
  if (patch.nom !== undefined) p.nom = patch.nom
  if (patch.categorieId !== undefined) p.categorieId = patch.categorieId
  if (patch.periodicite !== undefined) p.periodicite = patch.periodicite
  if (patch.quantite !== undefined) p.quantite = patch.quantite
  if (patch.prixUnitaire !== undefined) p.prixUnitaire = patch.prixUnitaire
  if (patch.actif !== undefined) p.actif = patch.actif
  if (patch.unite !== undefined) p.unite = patch.unite === '' ? null : patch.unite
  if (patch.frequence !== undefined) p.frequence = patch.frequence
  return p
}

export function BudgetPage() {
  const qc = useQueryClient()
  const {
    data: categories = [],
    isLoading: catLoading,
    createCategory: createCategoryMutation,
  } = useCategories()
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  /** Modale « Nouvelle catégorie » ouverte depuis le panneau d’ajout de poste. */
  const [categoryModalFromAddPost, setCategoryModalFromAddPost] =
    useState(false)
  const [addPostPreselectCategoryId, setAddPostPreselectCategoryId] = useState<
    number | null
  >(null)
  const [addPostOpen, setAddPostOpen] = useState(false)
  const [addPostDefaultCatId, setAddPostDefaultCatId] = useState<
    number | undefined
  >(undefined)
  /** Remonte le panneau à chaque ouverture pour réinitialiser le formulaire proprement. */
  const [addPostNonce, setAddPostNonce] = useState(0)
  const [csvImportProgress, setCsvImportProgress] = useState<{
    current: number
    total: number
    nom: string
  } | null>(null)
  const {
    data: items = [],
    isLoading,
    isError,
    error,
    create,
    update,
    remove,
  } = useBudgetItems()
  const fileRef = useRef<HTMLInputElement>(null)
  const addPostWasOpenRef = useRef(false)

  const clearAddPostPreselectCategory = useCallback(
    () => setAddPostPreselectCategoryId(null),
    [],
  )

  const existingNomKeysLower = useMemo(
    () => new Set(items.map((i) => i.nom.trim().toLowerCase())),
    [items],
  )

  const busy =
    create.isPending ||
    update.isPending ||
    remove.isPending ||
    createCategoryMutation.isPending ||
    csvImportProgress != null

  function handleSave(id: number, patch: Partial<BudgetItem>) {
    if (patch.nom !== undefined) {
      const key = patch.nom.trim().toLowerCase()
      const conflict = items.find(
        (i) => i.id !== id && i.nom.trim().toLowerCase() === key,
      )
      if (conflict) {
        window.alert(
          `Le nom « ${patch.nom.trim()} » est déjà utilisé par un autre poste. Chaque poste doit avoir un nom unique.`,
        )
        return
      }
    }
    const payload = toPayload(patch)
    if (Object.keys(payload).length === 0) return
    update.mutate({ id, payload })
  }

  function handleDelete(id: number) {
    if (window.confirm('Supprimer ce poste budgétaire ?')) remove.mutate(id)
  }

  /** Première catégorie existante, ou création de « Divers » si la liste est vide. */
  async function ensureDefaultCategoryId(): Promise<number> {
    const cached = qc.getQueryData<Categorie[]>(['categories']) ?? categories
    if (cached.length > 0) {
      const sorted = [...cached].sort(
        (a, b) => a.ordre - b.ordre || a.code.localeCompare(b.code),
      )
      return sorted[0].id
    }
    try {
      const c = await createCategoryMutation.mutateAsync({
        code: 'divers',
        libelle: 'Divers',
        couleur: '#57534e',
        icone: null,
        ordre: 0,
      })
      return c.id
    } catch {
      const fresh = await qc.fetchQuery({
        queryKey: ['categories'],
        queryFn: fetchCategories,
      })
      const sorted = [...fresh].sort(
        (a, b) => a.ordre - b.ordre || a.code.localeCompare(b.code),
      )
      if (sorted.length) return sorted[0].id
      throw new Error(
        'Impossible de créer une catégorie par défaut. Vérifiez l’API /api/categories.',
      )
    }
  }

  function openAddPost(categorieId?: number) {
    setAddPostDefaultCatId(categorieId)
    if (!addPostWasOpenRef.current) {
      setAddPostNonce((n) => n + 1)
    }
    addPostWasOpenRef.current = true
    setAddPostOpen(true)
  }

  async function onCsvFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const text = await file.text()
    let parsed
    try {
      parsed = parseBudgetCsv(text)
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'CSV invalide')
      return
    }
    if (parsed.length === 0) {
      window.alert('Aucune ligne importable dans ce fichier.')
      return
    }

    const catMap = new Map(
      categories.map((c) => [c.code.toLowerCase(), c] as const),
    )
    const byNom = new Map<string, BudgetItem>()
    for (const i of items) {
      const k = i.nom.trim().toLowerCase()
      if (!byNom.has(k)) byNom.set(k, i)
    }
    let ordreCursor =
      categories.length === 0
        ? 0
        : Math.max(...categories.map((c) => c.ordre)) + 1

    const total = parsed.length
    function bumpRow(index: number, nom: string) {
      flushSync(() => {
        setCsvImportProgress({ current: index + 1, total, nom })
      })
    }

    flushSync(() => {
      setCsvImportProgress({ current: 0, total, nom: '' })
    })

    try {
      for (let i = 0; i < parsed.length; i++) {
        const row = parsed[i]
        const nomDisplay = row.nom.trim()
        const key = row.categorieCode.toLowerCase()
        let cat = catMap.get(key)
        if (!cat) {
          try {
            cat = await createCategoryMutation.mutateAsync({
              code: row.categorieCode,
              libelle: row.categorieLibelle,
              couleur: '#78716c',
              icone: null,
              ordre: ordreCursor++,
            })
          } catch (err) {
            await qc.fetchQuery({
              queryKey: ['categories'],
              queryFn: fetchCategories,
            })
            const fresh = qc.getQueryData<Categorie[]>(['categories']) ?? []
            cat =
              fresh.find((c) => c.code.toLowerCase() === key) ??
              fresh.find(
                (c) =>
                  c.libelle.toLowerCase() === row.categorieLibelle.toLowerCase(),
              )
            if (!cat) {
              const v = getViolations(err)
              if (v.length) {
                window.alert(
                  v.map((x) => `${x.field}: ${x.message}`).join('\n'),
                )
              } else if (axios.isAxiosError(err)) {
                const data = err.response?.data as { error?: string } | undefined
                window.alert(data?.error ?? err.message)
              } else {
                window.alert(
                  err instanceof Error ? err.message : 'Catégorie introuvable',
                )
              }
              bumpRow(i, nomDisplay)
              continue
            }
          }
          catMap.set(key, cat)
        }

        const nomKey = nomDisplay.toLowerCase()
        const payload = {
          nom: nomDisplay,
          categorieId: cat.id,
          periodicite: row.periodicite,
          frequence: row.frequence,
          quantite: row.quantite,
          unite: row.unite ?? null,
          prixUnitaire: row.prixUnitaire,
          actif: true,
        }
        const catsForMap =
          qc.getQueryData<Categorie[]>(['categories']) ?? categories
        const existing = byNom.get(nomKey)
        if (existing) {
          const updated = await update.mutateAsync({
            id: existing.id,
            payload,
          })
          byNom.set(
            nomKey,
            budgetItemFromApiWithCategoryId(updated, catsForMap),
          )
        } else {
          const created = await create.mutateAsync(payload)
          byNom.set(
            nomKey,
            budgetItemFromApiWithCategoryId(created, catsForMap),
          )
        }
        bumpRow(i, nomDisplay)
      }
    } catch (err) {
      window.alert(
        err instanceof Error
          ? err.message
          : 'Erreur pendant l’import du fichier.',
      )
    } finally {
      setCsvImportProgress(null)
    }
  }

  if (catLoading || isLoading) {
    return (
      <>
        <Header title="Budget prévisionnel" />
        <div className="p-4 md:px-8">Chargement…</div>
      </>
    )
  }

  if (isError) {
    return (
      <>
        <Header title="Budget prévisionnel" />
        <div className="p-4 text-red-600 md:px-8">
          {error instanceof Error ? error.message : 'Erreur'}
        </div>
      </>
    )
  }

  return (
    <>
      <Header
        title="Budget prévisionnel"
        action={
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={onCsvFile}
            />
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              Importer CSV
            </Button>
            <Button
              type="button"
              disabled={busy}
              onClick={() => openAddPost()}
            >
              Ajouter un poste
            </Button>
          </div>
        }
      />
      {csvImportProgress ? (
        <div
          role="status"
          aria-live="polite"
          aria-valuenow={csvImportProgress.current}
          aria-valuemin={0}
          aria-valuemax={csvImportProgress.total}
          className="border-b border-[var(--color-border)] bg-stone-100 px-4 py-2 md:px-8"
        >
          <div className="flex max-w-4xl flex-wrap items-center justify-between gap-2 text-sm text-stone-800">
            <span>
              Import CSV —{' '}
              {csvImportProgress.current === 0 ? (
                <>démarrage… ({csvImportProgress.total} ligne{csvImportProgress.total > 1 ? 's' : ''})</>
              ) : (
                <>
                  ligne {csvImportProgress.current} / {csvImportProgress.total}
                  {csvImportProgress.nom ? (
                    <span className="text-stone-600">
                      {' '}
                      ({csvImportProgress.nom})
                    </span>
                  ) : null}
                </>
              )}
            </span>
            <span className="tabular-nums text-stone-500">
              {csvImportProgress.total > 0
                ? Math.min(
                    100,
                    Math.round(
                      (csvImportProgress.current / csvImportProgress.total) *
                        100,
                    ),
                  )
                : 0}
              %
            </span>
          </div>
          <div className="mt-2 h-1.5 max-w-4xl overflow-hidden rounded bg-stone-200">
            <div
              className="h-full rounded bg-[var(--color-amber)] transition-[width] duration-150 ease-out"
              style={{
                width:
                  csvImportProgress.total > 0
                    ? `${(csvImportProgress.current / csvImportProgress.total) * 100}%`
                    : '0%',
              }}
            />
          </div>
        </div>
      ) : null}
      <BudgetAddPostOffcanvas
        key={addPostNonce}
        open={addPostOpen}
        onClose={() => {
          addPostWasOpenRef.current = false
          setAddPostOpen(false)
        }}
        defaultCategorieId={addPostDefaultCatId}
        categories={categories}
        isPending={create.isPending}
        onCreate={(p) => create.mutateAsync(p)}
        preselectCategoryId={addPostPreselectCategoryId}
        onPreselectCategoryConsumed={clearAddPostPreselectCategory}
        onOpenCategoryModal={() => {
          setCategoryModalFromAddPost(true)
          setCategoryModalOpen(true)
        }}
        ensureDefaultCategoryId={ensureDefaultCategoryId}
        existingNomKeysLower={existingNomKeysLower}
      />
      <CategoryCreateModal
        open={categoryModalOpen}
        onClose={() => {
          setCategoryModalOpen(false)
          setCategoryModalFromAddPost(false)
        }}
        categories={categories}
        createCategory={(p) => createCategoryMutation.mutateAsync(p)}
        isPending={createCategoryMutation.isPending}
        onCreated={(c: Categorie) => {
          if (categoryModalFromAddPost) {
            setAddPostPreselectCategoryId(c.id)
          }
        }}
      />
      <div className="p-4 md:px-8 md:py-6">
        <BudgetTable
          items={items}
          categories={categories}
          onSaveRow={handleSave}
          onDeleteRow={handleDelete}
          onAddItem={openAddPost}
          disabled={busy}
        />
      </div>
    </>
  )
}
