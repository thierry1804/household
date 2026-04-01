import { Card, CardContent, CardHeader } from '../ui/Card'
import type { Recommendation } from '../../services/aggregate'
import { cn } from '../../utils/cn'

export function RecommendationCard({ items }: { items: Recommendation[] }) {
  return (
    <Card>
      <CardHeader>
        <h2 className="font-[family-name:var(--font-display)] text-lg text-[var(--color-ink)]">
          Recommandations
        </h2>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {items.length === 0 ? (
            <li className="text-sm text-stone-500">Aucune recommandation pour l’instant.</li>
          ) : (
            items.map((r) => (
              <li
                key={r.id}
                className={cn(
                  'rounded-xl border px-3 py-2 text-sm',
                  r.variant === 'danger' && 'border-red-200 bg-red-50 text-red-900',
                  r.variant === 'warning' && 'border-amber-200 bg-amber-50 text-amber-950',
                  r.variant === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-900',
                  r.variant === 'neutral' && 'border-[var(--color-border)] bg-stone-50 text-stone-800',
                )}
              >
                {r.texte}
              </li>
            ))
          )}
        </ul>
      </CardContent>
    </Card>
  )
}
