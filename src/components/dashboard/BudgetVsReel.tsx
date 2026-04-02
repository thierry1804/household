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
import type { BarShapeProps } from 'recharts'
import type { MonthlyStats } from '../../types'
import { Card, CardContent, CardHeader } from '../ui/Card'
import { toAriary } from '../../utils/formatters'

const GRAY = '#d6d3d1'
const ORANGE = '#f59e0b'

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
    maxVal: Math.max(d.prevision, d.reel),
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
                  const p = tipPayload[0].payload as {
                    name: string
                    Prévision: number
                    Réel: number
                  }
                  return (
                    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-sm shadow-sm">
                      <p className="font-medium text-[var(--color-ink)]">{p.name}</p>
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
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
