import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Wallet,
  Receipt,
  Library,
  LineChart,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '../../utils/cn'
import { Button } from '../ui/Button'

const links = [
  { to: '/', label: 'Tableau de bord', icon: LayoutDashboard },
  { to: '/budget', label: 'Budget prévisionnel', icon: Wallet },
  { to: '/depenses', label: 'Main courante', icon: Receipt },
  { to: '/referentiels', label: 'Référentiels', icon: Library },
  { to: '/analyse', label: 'Analyse', icon: LineChart },
]

export function Sidebar({
  collapsed,
  onToggleCollapsed,
}: {
  collapsed: boolean
  onToggleCollapsed: () => void
}) {
  return (
    <aside
      className={cn(
        'sticky top-0 z-10 flex w-full flex-col border-b border-[var(--color-border)] bg-[var(--color-surface)] md:h-svh md:shrink-0 md:self-start md:border-b-0 md:border-r md:transition-[width] md:duration-200 md:ease-out',
        collapsed ? 'md:w-[4.25rem]' : 'md:w-56',
      )}
    >
      <div
        className={cn(
          'flex border-b border-[var(--color-border)] px-2 py-3 md:border-0 md:px-2',
          collapsed ? 'md:flex-col md:items-center md:gap-2' : 'items-start justify-between gap-2',
        )}
      >
        <div
          className={cn(
            'min-w-0 flex-1 px-2 md:px-0',
            collapsed && 'md:hidden',
          )}
        >
          <div className="font-[family-name:var(--font-display)] text-lg leading-tight text-[var(--color-ink)]">
            Household
          </div>
          <p className="mt-0.5 text-xs text-stone-500">Suivi des dépenses</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          className={cn(
            'hidden shrink-0 !px-2 !py-2 text-stone-600 md:inline-flex',
            collapsed && 'md:mx-auto',
          )}
          aria-expanded={!collapsed}
          aria-label={
            collapsed ? 'Développer le menu latéral' : 'Réduire le menu latéral'
          }
          title={collapsed ? 'Développer' : 'Réduire'}
          onClick={onToggleCollapsed}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>
      <nav className="flex flex-row px-1 py-1.5 md:flex-col md:px-2 md:py-3">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            title={label}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center gap-1 rounded-lg px-1 py-2 text-stone-600 transition-colors md:flex-none md:flex-row md:gap-2 md:px-3 md:py-2 md:text-sm md:font-medium md:text-stone-700',
                isActive
                  ? 'bg-amber-500/15 text-[var(--color-ink)]'
                  : 'hover:bg-stone-100',
                collapsed && 'md:justify-center md:px-2',
              )
            }
          >
            <Icon className="h-5 w-5 shrink-0 md:h-4 md:w-4 md:opacity-80" aria-hidden />
            <span className={cn('sr-only md:not-sr-only md:text-sm', collapsed && 'md:sr-only')}>
              {label}
            </span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
