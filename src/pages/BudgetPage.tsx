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
import { parseBudgetCsv, type ParsedBudgetRow } from '../utils/csv'
import { fetchCategories } from '../services/categories.service'
import { getViolations } from '../services/api'
import { useToast } from '../contexts/ToastContext'
import { BudgetCsvPreviewModal } from '../components/budget/BudgetCsvPreviewModal'
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
  const { addToast } = useToast()
  const {
    data: categories = [],
    isLoading: catLoading,
    createCategory: createCategoryMutation,
  } = useCategories()
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  /** Modale « Nouvelle catégorie » ouverte depuis le panneau d'ajout de poste. */
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
  const [csvPreviewOpen, setCsvPreviewOpen] = useState(false)
  const [csvPreviewRows, setCsvPreviewRows] = useState<ParsedBudgetRow[]>([])
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<number>>(new Set())
  const deleteTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())
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

  async function handleSave(id: number, patch: Partial<BudgetItem>): Promise<void> {
    if (patch.nom !== undefined) {
      const key = patch.nom.trim().toLowerCase()
      const conflict = items.find(
        (i) => i.id !== id && i.nom.trim().toLowerCase() === key,
      )
      if (conflict) {
        addToast({
          variant: 'error',
          message: `Le nom \u00ab\u00a0${patch.nom.trim()}\u00a0\u00bb est d\u00e9j\u00e0 utilis\u00e9 par un autre poste. Chaque poste doit avoir un nom unique.`,
        })
        return
      }
    }
    const payload = toPayload(patch)
    if (Object.keys(payload).length === 0) return
    await update.mutateAsync({ id, payload })
  }

  function handleDelete(id: number) {
    setPendingDeleteIds((prev) => new Set([...prev, id]))
    addToast({
      message: 'Poste supprim\u00e9',
      variant: 'info',
      duration: 5000,
      action: {
        label: 'Annuler',
        onClick: () => cancelDelete(id),
      },
    })
    const timer = setTimeout(() => {
      remove.mutate(id)
      setPendingDeleteIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      deleteTimers.current.delete(id)
    }, 5000)
    deleteTimers.current.set(id, timer)
  }

  function cancelDelete(id: number) {
    const timer = deleteTimers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      deleteTimers.current.delete(id)
    }
    setPendingDeleteIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
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
        'Impossible de cr\u00e9er une cat\u00e9gorie par d\u00e9faut. V\u00e9rifiez l\u2019API /api/categories.',
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
    let parsed: ParsedBudgetRow[]
    try {
      parsed = parseBudgetCsv(text)
    } catch (err) {
      addToast({ variant: 'error', message: err instanceof Error ? err.message : 'CSV invalide' })
      return
    }
    if (parsed.length === 0) {
      addToast({ variant: 'warning', message: 'Aucune ligne importable dans ce fichier.' })
      return
    }
    // Ouvrir la modale de prévisualisation
    setCsvPreviewRows(parsed)
    setCsvPreviewOpen(true)
  }

  async function executeCsvImport() {
    const parsed = csvPreviewRows
    setCsvPreviewOpen(false)

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
                addToast({
                  variant: 'error',
                  message: v.map((x) => `${x.field}: ${x.message}`).join(' — '),
                })
              } else if (axios.isAxiosError(err)) {
                const data = err.response?.data as { error?: string } | undefined
                addToast({ variant: 'error', message: data?.error ?? err.message })
              } else {
                addToast({
                  variant: 'error',
                  message: err instanceof Error ? err.message : 'Cat\u00e9gorie introuvable',
                })
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
      addToast({ variant: 'success', message: `${parsed.length} poste(s) import\u00e9(s).` })
    } catch (err) {
      addToast({
        variant: 'error',
        message: err instanceof Error
          ? err.message
          : 'Erreur pendant l\u2019import du fichier.',
      })
    } finally {
      setCsvImportProgress(null)
    }
  }

  if (catLoading || isLoading) {
    return (
      <>
        <Header title="Budget pr\u00e9visionnel" />
        <div className="p-4 md:px-8">Chargement\u2026</div>
      </>
    )
  }

  if (isError) {
    return (
      <>
        <Header title="Budget pr\u00e9visionnel" />
        <div className="p-4 text-red-600 md:px-8">
          {error instanceof Error ? error.message : 'Erreur'}
        </div>
      </>
    )
  }

  return (
    <>
      <Header
        title="Budget pr\u00e9visionnel"
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
                <>d\u00e9marrage\u2026 ({csvImportProgress.total} ligne{csvImportProgress.total > 1 ? 's' : ''})</>
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
      <BudgetCsvPreviewModal
        open={csvPreviewOpen}
        onClose={() => setCsvPreviewOpen(false)}
        rows={csvPreviewRows}
        existingItems={items}
        onConfirm={executeCsvImport}
        isPending={busy}
      />
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
          pendingDeleteIds={pendingDeleteIds}
        />
      </div>
    </>
  )
}
