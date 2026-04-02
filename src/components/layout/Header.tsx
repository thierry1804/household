import type { ReactNode } from 'react'

export function Header({
  title,
  action,
}: {
  title: string
  action?: ReactNode
}) {
  return (
    <header className="flex flex-col gap-3 border-b border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-8">
      <h1 className="min-w-0 font-[family-name:var(--font-display)] text-2xl text-[var(--color-ink)]">
        {title}
      </h1>
      {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
    </header>
  )
}
