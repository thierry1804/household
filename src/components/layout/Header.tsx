import type { ReactNode } from 'react'

export function Header({
  title,
  action,
}: {
  title: string
  action?: ReactNode
}) {
  return (
    <header className="flex flex-row flex-nowrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-4 md:px-8">
      <h1 className="min-w-0 flex-1 truncate font-[family-name:var(--font-display)] text-2xl text-[var(--color-ink)]">
        {title}
      </h1>
      {action ? <div className="flex shrink-0 flex-nowrap items-center gap-2">{action}</div> : null}
    </header>
  )
}
