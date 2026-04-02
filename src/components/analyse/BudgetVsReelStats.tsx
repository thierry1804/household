import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { BarRectangleItem, BarShapeProps } from 'recharts'
import type { BudgetPostStats, DepenseApi } from '../../types'
import { Card, CardContent, CardHeader } from '../ui/Card'
import { Button } from '../ui/Button'
import { formatYmdFrSlash, toAriary } from '../../utils/formatters'

const GRAY = '#d6d3d1'
const ORANGE = '#f59e0b'

function truncateLabel(s: string, max = 14): string {
  if (s.length <= max) return s
  return s.slice(0, Math.max(0, max - 1)) + '…'
}

function NestedBudgetBar(props: BarShapeProps) {
  const { x, y, width, height, payload } = props
  if (x == null || y == null || !payload || width <= 0 || height <= 0) {
    return null
  }

  const prevision = Number(payload.Prévision) || 0
  const reel = Number(payload.Réel) || 0
  const max = Math.max(prevision, reel)
  if (max <= 0) {
    return null
  }

  const grayH = height * (prevision / max)
  const orangeH = height * (reel / max)
  const inset = width * 0.16
  const innerW = Math.max(0, width - inset * 2)

  const baseY = y + height
  const grayY = baseY - grayH
  const orangeY = baseY - orangeH

  const rG = 4
  const rO = 3

  return (
    <g>
      {grayH > 0 && (
        <rect
          x={x}
          y={grayY}
          width={width}
          height={Math.max(grayH, prevision > 0 ? 1 : 0)}
          fill={GRAY}
          rx={rG}
          ry={rG}
        />
      )}
      {orangeH > 0 && innerW > 0 && (
        <rect
          x={x + inset}
          y={orangeY}
          width={innerW}
          height={Math.max(orangeH, reel > 0 ? 1 : 0)}
          fill={ORANGE}
          rx={rO}
          ry={rO}
        />
      )}
    </g>
  )
}

type ChartRow = {
  name: string
  Prévision: number
  Réel: number
  maxVal: number
  budgetItemId?: number
  categorieLibelle?: string
  fullLabel?: string
}

function ChartSection({
  chart,
  depensesByBudgetItemId,
  monthlyByBudgetItem,
  selectedPostId,
  setSelectedPostId,
}: {
  chart: ChartRow[]
  depensesByBudgetItemId: Record<number, DepenseApi[]>
  monthlyByBudgetItem: BudgetPostStats[]
  selectedPostId: number | null
  setSelectedPostId: Dispatch<SetStateAction<number | null>>
}) {
  const chartHeight = Math.min(520, Math.max(288, chart.length * 36))

  const detailDepenses =
    selectedPostId != null
      ? (depensesByBudgetItemId[selectedPostId] ?? []).slice().sort((a, b) => b.date.localeCompare(a.date))
      : []

  const selectedPostMeta =
    selectedPostId != null
      ? monthlyByBudgetItem.find((p) => p.budgetItemId === selectedPostId)
      : undefined

  return (
    <>
      <div className="w-full min-w-0" style={{ height: chartHeight }}>
        <ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={0}
          initialDimension={{ width: 800, height: chartHeight }}
        >
          <BarChart data={chart} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e1" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11 }}
              interval={0}
              angle={-90}
              textAnchor="end"
              height={120}
            />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
            <Tooltip
              content={({ active, payload: tipPayload }) => {
                if (!active || !tipPayload?.length) return null
                const p = tipPayload[0].payload as ChartRow
                return (
                  <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-sm shadow-sm">
                    <p className="font-medium text-[var(--color-ink)]">
                      {p.fullLabel ?? p.name}
                    </p>
                    {p.categorieLibelle ? (
                      <p className="text-xs text-stone-500">{p.categorieLibelle}</p>
                    ) : null}
                    <p className="mt-1 text-stone-600">
                      Prévisionnel :{' '}
                      <span className="font-medium text-[var(--color-ink)]">{toAriary(p.Prévision)}</span>
                    </p>
                    <p className="text-stone-600">
                      Réalisé :{' '}
                      <span className="font-medium text-[var(--color-ink)]">{toAriary(p.Réel)}</span>
                    </p>
                  </div>
                )
              }}
            />
            <Legend
              content={() => (
                <ul className="flex flex-wrap items-center justify-center gap-6 pt-2 text-sm text-stone-600">
                  <li className="flex items-center gap-2">
                    <span className="inline-block h-3 w-4 rounded-sm" style={{ background: GRAY }} />
                    Prévisionnel
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="inline-block h-3 w-4 rounded-sm" style={{ background: ORANGE }} />
                    Réalisé
                  </li>
                </ul>
              )}
            />
            <Bar
              dataKey="maxVal"
              name="Comparaison"
              fill={GRAY}
              shape={NestedBudgetBar}
              legendType="none"
              cursor="pointer"
              onClick={(item: BarRectangleItem) => {
                const id = item.payload?.budgetItemId
                if (typeof id === 'number') {
                  setSelectedPostId((prev) => (prev === id ? null : id))
                }
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {selectedPostId != null && selectedPostMeta ? (
        <div className="mt-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="font-medium text-[var(--color-ink)]">{selectedPostMeta.nom}</h3>
              <p className="text-sm text-stone-600">{selectedPostMeta.categorieLibelle}</p>
            </div>
            <Button type="button" variant="ghost" className="!py-1 text-xs" onClick={() => setSelectedPostId(null)}>
              Fermer le détail
            </Button>
          </div>
          {detailDepenses.length === 0 ? (
            <p className="mt-3 text-sm text-stone-600">
              Aucune dépense liée à ce poste pour ce mois (les dépenses sans lien budget apparaissent si le produit correspond au nom du poste).
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[320px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-stone-600">
                    <th className="py-2 pr-3 font-medium">Date</th>
                    <th className="py-2 pr-3 font-medium">Produit</th>
                    <th className="py-2 text-right font-medium">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {detailDepenses.map((d) => (
                    <tr key={d.id} className="border-b border-[var(--color-border)]/80">
                      <td className="py-2 pr-3 text-stone-700">{formatYmdFrSlash(d.date)}</td>
                      <td className="py-2 pr-3 text-[var(--color-ink)]">{d.produit}</td>
                      <td className="py-2 text-right tabular-nums">{toAriary(d.montant)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}
    </>
  )
}

export function BudgetVsReelStats({
  monthlyByBudgetItem,
  depensesByBudgetItemId,
  selectedCategoryCode,
  selectedCategoryLabel = null,
  title = 'Prévisionnel vs réalisé',
}: {
  monthlyByBudgetItem: BudgetPostStats[]
  depensesByBudgetItemId: Record<number, DepenseApi[]>
  selectedCategoryCode: string | null
  selectedCategoryLabel?: string | null
  title?: string
}) {
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null)

  useEffect(() => {
    setSelectedPostId(null)
  }, [selectedCategoryCode])

  const postsForCategory = useMemo(() => {
    if (!selectedCategoryCode) return []
    return monthlyByBudgetItem.filter((p) => p.categorieCode === selectedCategoryCode)
  }, [monthlyByBudgetItem, selectedCategoryCode])

  const postChart = useMemo(
    () =>
      postsForCategory.map((d) => ({
        name: truncateLabel(d.nom),
        Prévision: d.prevision,
        Réel: d.reel,
        maxVal: Math.max(d.prevision, d.reel),
        budgetItemId: d.budgetItemId,
        categorieLibelle: d.categorieLibelle,
        fullLabel: d.nom,
      })),
    [postsForCategory],
  )

  const categoryLabel =
    selectedCategoryLabel ?? postsForCategory[0]?.categorieLibelle ?? selectedCategoryCode ?? ''

  if (!selectedCategoryCode) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="font-[family-name:var(--font-display)] text-lg text-[var(--color-ink)]">
          {title}
        </h2>
        <p className="mt-1 text-sm text-stone-600">
          {categoryLabel ? (
            <>
              Par poste — <span className="font-medium text-[var(--color-ink)]">{categoryLabel}</span>
            </>
          ) : null}
        </p>
        <p className="mt-2 text-sm text-stone-600">
          Cliquez sur une barre pour le détail des dépenses du mois pour ce poste.
        </p>
      </CardHeader>
      <CardContent>
        {postChart.length === 0 ? (
          <p className="text-sm text-stone-600">
            Aucun poste budgétaire actif avec prévision ou dépenses pour cette catégorie sur la période.
          </p>
        ) : (
          <ChartSection
            chart={postChart}
            depensesByBudgetItemId={depensesByBudgetItemId}
            monthlyByBudgetItem={monthlyByBudgetItem}
            selectedPostId={selectedPostId}
            setSelectedPostId={setSelectedPostId}
          />
        )}
      </CardContent>
    </Card>
  )
}
