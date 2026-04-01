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
import type { MonthlyStats } from '../../types'
import { Card, CardContent, CardHeader } from '../ui/Card'
import { toAriary } from '../../utils/formatters'

export function BudgetVsReel({
  data,
  title = 'Budget vs réel (mois en cours)',
}: {
  data: MonthlyStats[]
  title?: string
}) {
  const chart = data.map((d) => ({
    name: d.categorie.length > 14 ? d.categorie.slice(0, 12) + '…' : d.categorie,
    Prévision: d.prevision,
    Réel: d.reel,
  }))
  return (
    <Card>
      <CardHeader>
        <h2 className="font-[family-name:var(--font-display)] text-lg text-[var(--color-ink)]">
          {title}
        </h2>
      </CardHeader>
      <CardContent>
        <div className="h-72 w-full min-h-72 min-w-0">
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={0}
            initialDimension={{ width: 800, height: 288 }}
          >
            <BarChart data={chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e1" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={70} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <Tooltip
                formatter={(value) =>
                  toAriary(typeof value === 'number' ? value : Number(value))
                }
                contentStyle={{ borderRadius: 8, border: '1px solid #e7e5e1' }}
              />
              <Legend />
              <Bar dataKey="Prévision" fill="#d6d3d1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Réel" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
