import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Card, CardContent, CardHeader } from '../ui/Card'
import { toAriary } from '../../utils/formatters'

export function TrendChart({
  points,
}: {
  points: { date: string; montant: number }[]
}) {
  const data = points.map((p) => ({
    ...p,
    label: format(parseISO(p.date + 'T12:00:00'), 'd MMM', { locale: fr }),
  }))
  return (
    <Card>
      <CardHeader>
        <h2 className="font-[family-name:var(--font-display)] text-lg text-[var(--color-ink)]">
          Tendance (30 jours)
        </h2>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full min-h-64 min-w-0">
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={0}
            initialDimension={{ width: 800, height: 256 }}
          >
            <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e1" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <Tooltip
                formatter={(value) =>
                  toAriary(typeof value === 'number' ? value : Number(value))
                }
                labelFormatter={(_, payload) =>
                  payload?.[0]?.payload?.date
                    ? format(
                        parseISO(payload[0].payload.date + 'T12:00:00'),
                        'd MMMM yyyy',
                        { locale: fr },
                      )
                    : ''
                }
                contentStyle={{ borderRadius: 8, border: '1px solid #e7e5e1' }}
              />
              <Line
                type="monotone"
                dataKey="montant"
                stroke="#1c1c1e"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
