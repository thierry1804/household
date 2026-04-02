import { useQuery } from '@tanstack/react-query'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts'
import { fetchBudgetItems } from '../../services/budget.service'
import { fetchCategories } from '../../services/categories.service'
import { fetchDepensesForMonth } from '../../services/stats.service'
import { aggregateMonthlyStats } from '../../services/aggregate'
import { toAriary } from '../../utils/formatters'
import { Card, CardContent, CardHeader } from '../ui/Card'

interface MonthPoint {
  label: string
  totalReel: number
  totalPrevu: number
}

function getMonths(year: number, month: number, count: number): { year: number; month: number }[] {
  const result: { year: number; month: number }[] = []
  let y = year
  let m = month
  for (let i = 0; i < count; i++) {
    result.unshift({ year: y, month: m })
    m -= 1
    if (m === 0) {
      m = 12
      y -= 1
    }
  }
  return result
}

export function MultiMonthTrend({
  year,
  month,
}: {
  year: number
  month: number
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['multi-month-trend', year, month],
    queryFn: async (): Promise<MonthPoint[]> => {
      const months = getMonths(year, month, 6)
      const [budgetItems, categories] = await Promise.all([
        fetchBudgetItems(),
        fetchCategories(),
      ])

      const points: MonthPoint[] = []
      for (const { year: y, month: m } of months) {
        const depenses = await fetchDepensesForMonth(y, m)
        const stats = aggregateMonthlyStats(budgetItems, depenses, categories)
        const totalReel = stats.reduce((s, row) => s + row.reel, 0)
        const totalPrevu = stats.reduce((s, row) => s + row.prevision, 0)
        const label = `${String(m).padStart(2, '0')}/${y}`
        points.push({ label, totalReel, totalPrevu })
      }
      return points
    },
  })

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <p className="text-sm text-stone-600">Chargement tendance\u2026</p>
        </CardContent>
      </Card>
    )
  }

  if (isError || !data) {
    return (
      <Card>
        <CardContent>
          <p className="text-sm text-red-600">Impossible de charger la tendance.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="font-[family-name:var(--font-display)] text-lg text-[var(--color-ink)]">
          Tendance 6 mois
        </h2>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 4, right: 12, bottom: 4, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#78716c' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#78716c' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => toAriary(v)}
              width={80}
            />
            <Tooltip
              formatter={(value, name) => [
                toAriary(typeof value === 'number' ? value : Number(value)),
                name === 'totalReel' ? 'R\u00e9el' : 'Pr\u00e9visionnel',
              ]}
              labelStyle={{ fontSize: 12 }}
              contentStyle={{ fontSize: 12 }}
            />
            <Legend
              formatter={(value: string) =>
                value === 'totalReel' ? 'R\u00e9el' : 'Pr\u00e9visionnel'
              }
            />
            <Line
              type="monotone"
              dataKey="totalReel"
              name="totalReel"
              stroke="var(--color-amber)"
              strokeWidth={2}
              dot={{ r: 4, fill: 'var(--color-amber)' }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="totalPrevu"
              name="totalPrevu"
              stroke="#a8a29e"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ r: 4, fill: '#a8a29e' }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
