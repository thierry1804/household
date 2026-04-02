import { useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format, subDays } from 'date-fns'
import { Header } from '../components/layout/Header'
import { DepenseAddOffcanvas } from '../components/depenses/DepenseAddOffcanvas'
import { DepenseList } from '../components/depenses/DepenseList'
import { DepenseCsvPreviewModal } from '../components/depenses/DepenseCsvPreviewModal'
import type { DepenseEditPayload } from '../components/depenses/DepenseForm'
import { Button } from '../components/ui/Button'
import { DateFrField } from '../components/ui/DateFrField'
import { Input, Select } from '../components/ui/Input'
import { useBudgetItems } from '../hooks/useBudgetItems'
import { useCategories } from '../hooks/useCategories'
import { useDepenseMutations } from '../hooks/useDepenses'
import { fetchDepensesAllFiltered } from '../services/depenses.service'
import { depensesToCsv, parseDepensesCsvWithMeta, type ParsedDepenseCsvRow } from '../utils/csv'
import { getApiErrorMessage, getViolations } from '../services/api'
import { slugifyReferentialCode } from '../utils/slug'
import type { Categorie } from '../types'
import { Download, Plus, Upload, X } from 'lucide-react'
import { cn } from '../utils/cn'
import { formatYmdFrSlash } from '../utils/formatters'
import { useToast } from '../contexts/ToastContext'

function resolveCategorieCode(
  raw: string,
  categories: Categorie[],
): string | null {
  const t = raw.trim()
  if (!t) return null
  const lower = t.toLowerCase()
  const byCode = categories.find((c) => c.code.toLowerCase() === lower)
  if (byCode) return byCode.code
  const byLib = categories.find((c) => c.libelle.toLowerCase() === lower)
  if (byLib) return byLib.code
  const slug = slugifyReferentialCode(t)
  const bySlug = categories.find((c) => c.code.toLowerCase() === slug)
  return bySlug?.code ?? null
}

/** Quand le CSV n'a pas de catégorie / poste ou des cellules vides. */
function defaultCategorieCode(categories: Categorie[]): string | null {
  if (categories.length === 0) return null
  const divers = categories.find((c) => c.code.toLowerCase() === 'divers')
  if (divers) return divers.code
  const sorted = [...categories].sort(
    (a, b) => a.ordre - b.ordre || a.code.localeCompare(b.code),
  )
  return sorted[0]?.code ?? null
}

export function DepensesPage() {
  const { data: categories = [] } = useCategories()
  const { data: budgetItems = [] } = useBudgetItems()
  const { create, update, remove } = useDepenseMutations()
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  /** Par défaut : « Du » et « Au » = date du jour. */
  const defaultToday = useMemo(() => format(new Date(), 'yyyy-MM-dd'), [])

  const [after, setAfter] = useState(defaultToday)
  const [before, setBefore] = useState(defaultToday)
  const [categorieCode, setCategorieCode] = useState('')
  const [searchText, setSearchText] = useState('')
  const [csvImportProgress, setCsvImportProgress] = useState<{
    current: number
    total: number
    nom: string
  } | null>(null)
  const depenseCsvInputRef = useRef<HTMLInputElement>(null)
  /** Messages d'import */
  const [csvImportFeedback, setCsvImportFeedback] = useState<{
    variant: 'error' | 'success' | 'warning'
    summary: string
    details?: string[]
  } | null>(null)
  const [addDepenseOpen, setAddDepenseOpen] = useState(false)
  const [addDepenseNonce, setAddDepenseNonce] = useState(0)
  const [csvPreviewOpen, setCsvPreviewOpen] = useState(false)
  const [csvPreviewRows, setCsvPreviewRows] = useState<ParsedDepenseCsvRow[]>([])
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<number>>(new Set())
  const deleteTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  function dismissCsvFeedback() {
    setCsvImportFeedback(null)
  }

  function openAddDepense() {
    setAddDepenseNonce((n) => n + 1)
    setAddDepenseOpen(true)
  }

  function reportCsvResult(
    variant: 'success' | 'warning' | 'error',
    summary: string,
    details?: string[],
  ) {
    const detailStr = details?.length ? details : ''
    if (variant === 'error') {
      console.error('[Import CSV]', summary, detailStr)
    } else if (variant === 'warning') {
      console.warn('[Import CSV]', summary, detailStr)
    } else {
      console.info('[Import CSV]', summary, detailStr)
    }
    setCsvImportFeedback({ variant, summary, details })
  }

  /** Si Du > Au, l'API renvoie souvent vide — on interprète comme min/max. */
  const { queryAfter, queryBefore, datesInverted } = useMemo(() => {
    if (after <= before) {
      return { queryAfter: after, queryBefore: before, datesInverted: false }
    }
    return { queryAfter: before, queryBefore: after, datesInverted: true }
  }, [after, before])

  const { data: items = [], isLoading, isError, error } = useQuery({
    queryKey: [
      'depenses',
      'filtered',
      queryAfter,
      queryBefore,
      categorieCode,
    ],
    queryFn: () =>
      fetchDepensesAllFiltered({
        'date[after]': queryAfter,
        'date[before]': queryBefore,
        ...(categorieCode ? { categorieCode } : {}),
        'order[date]': 'desc',
      }),
  })

  /** Garantit que la liste colle à la plage affichée (jj/mm/aaaa → AAAA-MM-JJ). */
  const itemsInRange = useMemo(
    () =>
      items.filter(
        (d) => d.date >= queryAfter && d.date <= queryBefore,
      ),
    [items, queryAfter, queryBefore],
  )

  /** Filtrage texte côté client */
  const filteredItems = useMemo(() => {
    if (!searchText.trim()) return itemsInRange
    const lower = searchText.toLowerCase()
    return itemsInRange.filter((d) => d.produit.toLowerCase().includes(lower))
  }, [itemsInRange, searchText])

  const isFiltered = searchText.trim().length > 0 || categorieCode !== ''

  const busy =
    create.isPending ||
    update.isPending ||
    remove.isPending ||
    csvImportProgress != null

  function handleExport() {
    const blob = new Blob(
      [
        depensesToCsv(
          itemsInRange.map((d) => ({
            date: d.date,
            produit: d.produit,
            categorieCode: d.categorieCode,
            posteBudgetaire: d.budgetItem?.nom ?? '',
            quantite: d.quantite,
            unite: d.unite ?? '',
            prixUnitaire: d.prixUnitaire,
            montant: d.montant,
          })),
        ),
      ],
      { type: 'text/csv;charset=utf-8' },
    )
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `depenses-${queryAfter}-${queryBefore}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleDepensesCsvChange(
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    dismissCsvFeedback()
    const text = await file.text()
    let parsed: ReturnType<typeof parseDepensesCsvWithMeta>['rows']
    let dataLineCount = 0
    let delimLabel = 'virgule'
    try {
      const meta = parseDepensesCsvWithMeta(text, {
        /** Toujours JJ/MM/AAAA pour les dates à barres obliques. */
        slashDateOrder: 'DMY',
      })
      parsed = meta.rows
      dataLineCount = meta.dataLineCount
      delimLabel =
        meta.delimiter === ';'
          ? 'point-virgule (souvent Excel)'
          : meta.delimiter === '\t'
            ? 'tabulation'
            : 'virgule'
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Fichier CSV invalide ou incomplet.'
      console.error('[Import CSV]', msg)
      setCsvImportFeedback({ variant: 'error', summary: msg })
      return
    }
    if (parsed.length === 0) {
      reportCsvResult(
        'warning',
        dataLineCount > 0
          ? `Aucune ligne valide sur ${dataLineCount} ligne(s) de données. Vérifiez le format des dates (JJ/MM/AAAA…), des quantités (colonne QT, QUANTITE…) et des montants. Séparateur détecté : ${delimLabel}.`
          : 'Aucune ligne importable dans ce fichier (fichier vide ou uniquement des en-têtes).',
      )
      return
    }

    // Ouvrir la modale de prévisualisation
    setCsvPreviewRows(parsed)
    setCsvPreviewOpen(true)
  }

  async function executeCsvImport(rowsToImport: ParsedDepenseCsvRow[]) {
    setCsvPreviewOpen(false)

    const total = rowsToImport.length
    function bumpRow(index: number, nom: string) {
      flushSync(() => {
        setCsvImportProgress({ current: index + 1, total, nom })
      })
    }

    flushSync(() => {
      setCsvImportProgress({ current: 0, total, nom: '' })
    })

    let imported = 0
    let failed = 0
    let skipped = 0
    const errorLines: string[] = []
    /** Dates des lignes réellement créées (pour élargir Du / Au si besoin). */
    const importedDates: string[] = []
    try {
      for (let i = 0; i < rowsToImport.length; i++) {
        const row = rowsToImport[i]
        let categorieResolved: string | null = null
        let budgetItemId: number | null = null
        if (row.posteBudgetaireRaw) {
          const key = row.posteBudgetaireRaw.trim().toLowerCase()
          const item = budgetItems.find(
            (b) => b.nom.trim().toLowerCase() === key,
          )
          if (item) {
            budgetItemId = item.id
            categorieResolved = item.categorie
          }
        }
        if (!categorieResolved && row.categorieCodeRaw) {
          categorieResolved = resolveCategorieCode(
            row.categorieCodeRaw,
            categories,
          )
        }
        if (!categorieResolved) {
          categorieResolved = defaultCategorieCode(categories)
        }
        if (!categorieResolved) {
          failed++
          errorLines.push(
            `${row.produit} : aucune catégorie par défaut possible (référentiel vide).`,
          )
          bumpRow(i, row.produit)
          continue
        }

        // Vérification doublon parmi items existants
        const montantCalc = Math.round(row.quantite * row.prixUnitaire)
        const produitLower = row.produit.trim().toLowerCase()
        const isDuplicate = itemsInRange.some(
          (d) =>
            d.date === row.dateIso &&
            d.produit.trim().toLowerCase() === produitLower &&
            d.montant === montantCalc,
        )
        if (isDuplicate) {
          skipped++
          bumpRow(i, row.produit)
          continue
        }

        try {
          await create.mutateAsync({
            date: row.dateIso,
            produit: row.produit,
            budgetItemId,
            categorieCode: categorieResolved,
            quantite: row.quantite,
            unite: row.unite || null,
            prixUnitaire: row.prixUnitaire,
            note: null,
          })
          imported++
          importedDates.push(row.dateIso)
        } catch (err) {
          failed++
          const v = getViolations(err)
          const msg =
            v.length > 0
              ? v.map((x) => `${x.field}: ${x.message}`).join(' ; ')
              : getApiErrorMessage(err)
          errorLines.push(`${row.produit} : ${msg}`)
        }
        bumpRow(i, row.produit)
      }
      let summary =
        `${imported} ligne(s) importée(s).` +
        (skipped ? ` ${skipped} doublon(s) ignoré(s).` : '') +
        (failed ? ` ${failed} ligne(s) ignorée(s) ou en échec.` : '')
      if (importedDates.length > 0) {
        const sorted = [...importedDates].sort()
        const minD = sorted[0]
        const maxD = sorted[sorted.length - 1]
        const widen = minD < queryAfter || maxD > queryBefore
        if (widen) {
          flushSync(() => {
            setAfter((a) => (minD < a ? minD : a))
            setBefore((b) => (maxD > b ? maxD : b))
          })
          summary +=
            ' La plage « Du / Au » a été élargie pour inclure les dates du fichier.'
        }
      }
      await queryClient.invalidateQueries({ queryKey: ['depenses'] })
      reportCsvResult(
        failed > 0 ? (imported > 0 ? 'warning' : 'error') : 'success',
        summary,
        errorLines.length > 0 ? errorLines.slice(0, 20) : undefined,
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur pendant l\u2019import CSV.'
      console.error('[Import CSV]', msg)
      setCsvImportFeedback({ variant: 'error', summary: msg })
    } finally {
      setCsvImportProgress(null)
    }
  }

  function handleDelete(id: number) {
    setPendingDeleteIds((prev) => new Set([...prev, id]))
    addToast({
      message: 'Dépense supprimée',
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

  async function handleUpdate(id: number, payload: DepenseEditPayload): Promise<void> {
    await update.mutateAsync({
      id,
      payload: {
        date: payload.date,
        produit: payload.produit,
        categorieCode: payload.categorieCode,
        quantite: payload.quantite,
        unite: payload.unite || null,
        prixUnitaire: payload.prixUnitaire,
        budgetItemId: payload.budgetItemId,
        note: null,
      },
    })
  }

  return (
    <>
      <Header
        title="Main courante"
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={busy}
              onClick={openAddDepense}
            >
              <Plus className="h-4 w-4" />
              Ajouter une dépense
            </Button>
            <input
              ref={depenseCsvInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleDepensesCsvChange}
            />
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => depenseCsvInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              Importer CSV
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={busy || itemsInRange.length === 0}
              onClick={handleExport}
            >
              <Download className="h-4 w-4" />
              Export CSV
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
                <>
                  démarrage… ({csvImportProgress.total} ligne
                  {csvImportProgress.total > 1 ? 's' : ''})
                </>
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
      {csvImportFeedback ? (
        <div
          role="alert"
          aria-live="assertive"
          className={cn(
            'border-b px-4 py-3 md:px-8',
            csvImportFeedback.variant === 'error' &&
              'border-red-300 bg-red-50 text-red-950',
            csvImportFeedback.variant === 'warning' &&
              'border-amber-300 bg-amber-50 text-amber-950',
            csvImportFeedback.variant === 'success' &&
              'border-stone-200 bg-stone-100 text-stone-900',
          )}
        >
          <div className="mx-auto flex max-w-4xl gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-snug">
                {csvImportFeedback.summary}
              </p>
              {csvImportFeedback.details?.length ? (
                <ul className="mt-2 max-h-52 list-disc space-y-1 overflow-y-auto pl-5 text-xs leading-relaxed opacity-95">
                  {csvImportFeedback.details.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              ) : null}
            </div>
            <Button
              type="button"
              variant="ghost"
              className="shrink-0 !p-1"
              aria-label="Fermer le message"
              onClick={dismissCsvFeedback}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      ) : null}
      <DepenseCsvPreviewModal
        open={csvPreviewOpen}
        onClose={() => setCsvPreviewOpen(false)}
        rows={csvPreviewRows}
        existingItems={itemsInRange}
        onConfirm={executeCsvImport}
        isPending={busy}
      />
      <DepenseAddOffcanvas
        key={addDepenseNonce}
        open={addDepenseOpen}
        onClose={() => setAddDepenseOpen(false)}
        budgetItems={budgetItems}
        categoryCodes={categories.map((c) => ({
          code: c.code,
          libelle: c.libelle,
        }))}
        disabled={busy}
        isPending={create.isPending}
        onSubmit={async (v) => {
          await create.mutateAsync({
            date: v.date,
            produit: v.produit,
            budgetItemId: v.budgetItemId,
            categorieCode: v.categorieCode,
            quantite: v.quantite,
            unite: v.unite ?? null,
            prixUnitaire: v.prixUnitaire,
            note: null,
          })
        }}
      />
      <div className="space-y-6 p-4 md:px-8 md:py-6">
        <div className="grid grid-cols-1 gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)] sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs text-stone-600">Du</label>
            <DateFrField
              valueYmd={after}
              onChangeYmd={setAfter}
              aria-label="Date de début (jj/mm/aaaa)"
              inputClassName="w-full py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-stone-600">Au</label>
            <DateFrField
              valueYmd={before}
              onChangeYmd={setBefore}
              aria-label="Date de fin (jj/mm/aaaa)"
              inputClassName="w-full py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-stone-600">Catégorie</label>
            <Select
              value={categorieCode}
              onChange={(e) => setCategorieCode(e.target.value)}
            >
              <option value="">Toutes</option>
              {categories.map((c) => (
                <option key={c.id} value={c.code}>
                  {c.libelle}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-stone-600">Rechercher</label>
            <Input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Rechercher un produit…"
              className="py-2"
            />
          </div>
        </div>
        <p className="text-xs text-stone-500">
          « Du » et « Au » : saisie ou calendrier (icône), format{' '}
          <span className="font-medium">jj/mm/aaaa</span>, premier et dernier jour{' '}
          <span className="font-medium">inclus</span>. Ex. Du 02/04/2025 et Au
          02/04/2026 incluent le <span className="font-medium">01/04/2026</span>. Pour
          une seule journée, même date en Du et Au. Import CSV : JJ/MM/AAAA ;
          AAAA-MM-JJ inchangé.
        </p>

        {datesInverted ? (
          <p className="text-sm text-amber-800" role="status">
            La date « Du » est après « Au » : la recherche utilise la période du{' '}
            {formatYmdFrSlash(queryAfter)} au {formatYmdFrSlash(queryBefore)}.
            Ajustez les champs pour clarifier.
          </p>
        ) : null}

        {isLoading ? (
          <p className="text-stone-600">Chargement…</p>
        ) : isError ? (
          <p className="text-red-600">
            {error instanceof Error ? error.message : 'Erreur'}
          </p>
        ) : itemsInRange.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50/80 px-4 py-10 text-center">
            <p className="text-sm text-stone-700">
              Aucune dépense sur la période affichée (
              {formatYmdFrSlash(queryAfter)} – {formatYmdFrSlash(queryBefore)}
              {categorieCode ? `, catégorie filtrée` : ''}).
            </p>
            <p className="mt-2 text-xs text-stone-600">
              Élargissez « Du » et « Au », choisissez « Toutes » pour la catégorie,
              ou utilisez le raccourci ci-dessous si vous venez d'importer un
              fichier (les lignes peuvent être sur d'autres dates).
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  const end = format(new Date(), 'yyyy-MM-dd')
                  const start = format(subDays(new Date(), 365), 'yyyy-MM-dd')
                  setBefore(end)
                  setAfter(start)
                }}
              >
                Afficher un an jusqu'à aujourd'hui
              </Button>
            </div>
          </div>
        ) : (
          <>
            {isFiltered && (
              <p className="text-sm text-stone-600">
                {filteredItems.length} résultat{filteredItems.length !== 1 ? 's' : ''} sur {itemsInRange.length} dépense{itemsInRange.length !== 1 ? 's' : ''}
              </p>
            )}
            <DepenseList
              items={filteredItems}
              budgetItems={budgetItems}
              disabled={busy}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              pendingDeleteIds={pendingDeleteIds}
            />
          </>
        )}
      </div>
    </>
  )
}
