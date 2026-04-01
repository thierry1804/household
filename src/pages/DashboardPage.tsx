import { Header } from '../components/layout/Header'
import { KpiCard } from '../components/dashboard/KpiCard'
import { BudgetVsReel } from '../components/dashboard/BudgetVsReel'
import { TrendChart } from '../components/dashboard/TrendChart'
import { AlertCard } from '../components/dashboard/AlertCard'
import { Card, CardContent, CardHeader } from '../components/ui/Card'
import { useDashboard } from '../hooks/useStats'
import { useCategories } from '../hooks/useCategories'
import { toAriary } from '../utils/formatters'
import { labelForCategoryCode } from '../utils/categories'

export function DashboardPage() {
  const { data, isLoading, isError, error } = useDashboard()
  const { data: categories } = useCategories()

  if (isLoading) {
    return (
      <>
        <Header title="Tableau de bord" />
        <div className="p-4 text-stone-600 md:px-8">Chargement…</div>
      </>
    )
  }

  if (isError || !data) {
    return (
      <>
        <Header title="Tableau de bord" />
        <div className="p-4 text-red-600 md:px-8">
          {error instanceof Error ? error.message : 'Impossible de charger le tableau de bord.'}
        </div>
      </>
    )
  }

  const progress =
    data.totalPrevuMois > 0
      ? Math.min(100, Math.round((data.totalReelMois / data.totalPrevuMois) * 100))
      : 0
  const topLabel = data.topCategorieCode
    ? labelForCategoryCode(data.topCategorieCode, categories)
    : '—'

  return (
    <>
      <Header title="Tableau de bord" />
      <div className="space-y-6 p-4 md:px-8 md:py-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Total prévu ce mois"
            value={toAriary(data.totalPrevuMois)}
          />
          <KpiCard
            label="Total dépensé"
            value={toAriary(data.totalReelMois)}
            variant="amber"
          />
          <KpiCard
            label="Écart"
            value={toAriary(data.ecartMois)}
            variant={data.ecartMois > 0 ? 'danger' : 'success'}
          />
          <KpiCard
            label="Jours restants (mois)"
            value={String(data.joursRestants)}
            hint="Fin de mois"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <h2 className="font-[family-name:var(--font-display)] text-lg text-[var(--color-ink)]">
                Dépenses du jour
              </h2>
            </CardHeader>
            <CardContent>
              <p className="font-[family-name:var(--font-display)] text-3xl text-[var(--color-ink)]">
                {toAriary(data.depensesAujourdhui)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="font-[family-name:var(--font-display)] text-lg text-[var(--color-ink)]">
                Progression du mois
              </h2>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between text-sm text-stone-600">
                <span>Réel / prévisionnel</span>
                <span>{progress}%</span>
              </div>
              <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-stone-200">
                <div
                  className="h-full rounded-full bg-[var(--color-amber)]"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-3 text-sm text-stone-600">
                Catégorie la plus dépensée ce mois :{' '}
                <span className="font-medium text-[var(--color-ink)]">{topLabel}</span>
                {data.topCategorieMontant > 0
                  ? ` (${toAriary(data.topCategorieMontant)})`
                  : null}
              </p>
            </CardContent>
          </Card>
        </div>

        <BudgetVsReel data={data.monthlyByCategory} />

        <div className="grid gap-4 lg:grid-cols-2">
          <TrendChart points={data.trendDaily} />
          <AlertCard alerts={data.alerts} />
        </div>
      </div>
    </>
  )
}
