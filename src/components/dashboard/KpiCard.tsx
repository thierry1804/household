import { Card, CardContent } from '../ui/Card'
import { cn } from '../../utils/cn'

export function KpiCard({
  label,
  value,
  hint,
  variant = 'default',
}: {
  label: string
  value: string
  hint?: string
  variant?: 'default' | 'success' | 'danger' | 'amber'
}) {
  const border =
    variant === 'success'
      ? 'border-emerald-200'
      : variant === 'danger'
        ? 'border-red-200'
        : variant === 'amber'
          ? 'border-amber-200'
          : 'border-[var(--color-border)]'
  return (
    <Card className={cn(border)}>
      <CardContent className="!p-4">
        <div className="text-xs font-medium text-stone-500">{label}</div>
        <div className="mt-1 font-[family-name:var(--font-display)] text-xl text-[var(--color-ink)]">
          {value}
        </div>
        {hint ? <p className="mt-1 text-xs text-stone-500">{hint}</p> : null}
      </CardContent>
    </Card>
  )
}
