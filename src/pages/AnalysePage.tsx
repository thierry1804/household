import { useMemo, useState } from 'react'
import { Header } from '../components/layout/Header'
import { BudgetVsReelStats } from '../components/analyse/BudgetVsReelStats'
import { MonthlyTable } from '../components/analyse/MonthlyTable'
import { MultiMonthTrend } from '../components/analyse/MultiMonthTrend'
import { RecommendationCard } from '../components/analyse/RecommendationCard'
import { Card, CardContent, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Select } from '../components/ui/Input'
import { useQuery } from '@tanstack/react-query'
import { fetchBudgetItems } from '../services/budget.service'
import { fetchCategories } from '../services/categories.service'
import { fetchDepensesForMonth } from '../services/stats.service'
import {
  aggregateMonthlyStats,
  aggregateMonthlyStatsByBudgetItem,
  buildRecommendations,
  groupDepensesByBudgetItemId,
  topOverBudgetItems,
} from '../services/aggregate'
import { toAriary } from '../utils/formatters'
import { labelForCategoryCode } from '../utils/categories'
import { Download } from 'lucide-react'

export function AnalysePage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [drillCode, setDrillCode] = useState<string>('')

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['analyse', year, month],
    queryFn: async () => {
      const [budgetItems, depenses, categories] = await Promise.all([
        fetchBudgetItems(),
        fetchDepensesForMonth(year, month),
        fetchCategories(),
      ])
      const monthly = aggregateMonthlyStats(budgetItems, depenses, categories)
      const monthlyByBudgetItem = aggregateMonthlyStatsByBudgetItem(
        budgetItems,
        depenses,
        categories,
      )
      const depensesByBudgetItemId = groupDepensesByBudgetItemId(
        budgetItems,
        depenses,
      )
      const reco = buildRecommendations(budgetItems, depenses, categories)
      const topItems = topOverBudgetItems(budgetItems, depenses, 5)
      return {
        budgetItems,
        depenses,
        categories,
        monthly,
        monthlyByBudgetItem,
        depensesByBudgetItemId,
        reco,
        topItems,
      }
    },
  })

  const drill = useMemo(() => {
    if (!data || !drillCode) return null
    const d = data.depenses.filter((x) => x.categorieCode === drillCode)
    const sum = d.reduce((s, x) => s + x.montant, 0)
    return { rows: d, sum }
  }, [data, drillCode])

  if (isLoading) {
    return (
      <>
        <Header title="Analyse" />
        <div className="p-4 md:px-8">Chargement…</div>
      </>
    )
  }

  if (isError || !data) {
    return (
      <>
        <Header title="Analyse" />
        <div className="p-4 text-red-600 md:px-8">
          {error instanceof Error ? error.message : 'Erreur'}
        </div>
      </>
    )
  }

  return (
    <>
      <Header title="Analyse" />
      <div className="space-y-6 p-4 md:px-8 md:py-6">
        <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-end">
          <div>
            <label className="mb-1 block text-xs text-stone-600">Année</label>
            <Select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {[year - 1, year, year + 1].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-stone-600">Mois</label>
            <Select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {String(m).padStart(2, '0')}
                </option>
              ))}
            </Select>
          </div>
          <div className="col-span-2 sm:min-w-[min(100%,20rem)]">
            <label className="mb-1 block text-xs text-stone-600">Catégorie</label>
            <Select
              value={drillCode}
              onChange={(e) => setDrillCode(e.target.value)}
            >
              <option value="">—</option>
              {data.categories.map((c) => (
                <option key={c.id} value={c.code}>
                  {c.libelle}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <BudgetVsReelStats
          monthlyByBudgetItem={data.monthlyByBudgetItem}
          depensesByBudgetItemId={data.depensesByBudgetItemId}
          selectedCategoryCode={drillCode || null}
          selectedCategoryLabel={
            drillCode ? labelForCategoryCode(drillCode, data.categories) : null
          }
          title={`Prévisionnel vs réalisé — ${String(month).padStart(2, '0')}/${year}`}
        />

        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-[family-name:var(--font-display)] text-lg text-[var(--color-ink)]">
              Comparaison mensuelle
            </h2>
            <Button
              type="button"
              variant="secondary"
              className="text-xs"
              disabled={data.monthly.length === 0}
              onClick={() => {
                const header = 'Catégorie,Prévision,Réel,Écart,%'
                const body = data.monthly
                  .map((row) =>
                    [
                      `"${row.categorie.replace(/"/g, '""')}"`,
                      row.prevision,
                      row.reel,
                      row.ecart,
                      row.pourcentage,
                    ].join(','),
                  )
                  .join('\n')
                const csv = `${header}\n${body}`
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `analyse-${String(month).padStart(2, '0')}-${year}.csv`
                a.click()
                URL.revokeObjectURL(url)
              }}
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
          </div>
          <MonthlyTable rows={data.monthly} />
        </div>

        <MultiMonthTrend year={year} month={month} />

        <div>
          <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg text-[var(--color-ink)]">
            Dépenses du mois (catégorie sélectionnée)
          </h2>
          {drill ? (
            <Card>
              <CardContent>
                <p className="text-sm text-stone-600">
                  {labelForCategoryCode(drillCode, data.categories)} — total{' '}
                  <span className="font-medium text-[var(--color-ink)]">
                    {toAriary(drill.sum)}
                  </span>{' '}
                  ({drill.rows.length} ligne(s))
                </p>
                <ul className="mt-3 max-h-64 space-y-1 overflow-auto text-sm">
                  {drill.rows.map((r) => (
                    <li key={r.id} className="flex justify-between gap-2">
                      <span>{r.produit}</span>
                      <span className="tabular-nums">{toAriary(r.montant)}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : (
            <p className="text-sm text-stone-500">
              Sélectionnez une catégorie dans les filtres en haut de page pour lister les dépenses.
            </p>
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <RecommendationCard items={data.reco} />
          <Card>
            <CardHeader>
              <h2 className="font-[family-name:var(--font-display)] text-lg text-[var(--color-ink)]">
                Top 5 postes au-dessus du budget
              </h2>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal space-y-2 pl-5 text-sm">
                {data.topItems.length === 0 ? (
                  <li className="text-stone-500">Aucun dépassement par poste.</li>
                ) : (
                  data.topItems.map((t) => (
                    <li key={t.nom}>
                      <span className="font-medium">{t.nom}</span> — réel{' '}
                      {toAriary(t.reel)} vs prévu {toAriary(t.budget)} (
                      +{Math.round(t.ecartPct)}%)
                    </li>
                  ))
                )}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
