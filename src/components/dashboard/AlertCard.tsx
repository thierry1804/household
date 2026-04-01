import { Card, CardContent, CardHeader } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { toAriary } from '../../utils/formatters'
import type { CategoryAlert } from '../../services/aggregate'
import { cn } from '../../utils/cn'

function levelStyle(level: CategoryAlert['level']) {
  if (level === 'over')
    return {
      badge: 'border-red-200 bg-red-50 text-red-800',
      bar: 'bg-[var(--color-danger)]',
    }
  if (level === 'near')
    return {
      badge: 'border-amber-200 bg-amber-50 text-amber-900',
      bar: 'bg-[var(--color-amber)]',
    }
  return {
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    bar: 'bg-[var(--color-success)]',
  }
}

export function AlertCard({ alerts }: { alerts: CategoryAlert[] }) {
  return (
    <Card>
      <CardHeader>
        <h2 className="font-[family-name:var(--font-display)] text-lg text-[var(--color-ink)]">
          Alertes par catégorie
        </h2>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {alerts.length === 0 ? (
            <li className="text-sm text-stone-500">Aucune donnée pour ce mois.</li>
          ) : (
            alerts.map((a) => {
              const st = levelStyle(a.level)
              const pct =
                a.prevision > 0 ? Math.min(150, Math.round(a.ratio * 100)) : 0
              return (
                <li
                  key={a.categorie}
                  className="rounded-xl border border-[var(--color-border)] bg-stone-50/50 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-[var(--color-ink)]">
                      {a.categorie}
                    </span>
                    <Badge className={cn('border', st.badge)}>
                      {a.level === 'over'
                        ? 'Dépassement'
                        : a.level === 'near'
                          ? 'Proche de la limite'
                          : 'Sous le budget'}
                    </Badge>
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-stone-600">
                    <span>Prévu {toAriary(a.prevision)}</span>
                    <span>Réel {toAriary(a.reel)}</span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-stone-200">
                    <div
                      className={cn('h-full rounded-full transition-all', st.bar)}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              )
            })
          )}
        </ul>
      </CardContent>
    </Card>
  )
}
