import type { BudgetItemApi, Categorie, DepenseApi } from '../types'
import {
  computeDashboard,
  depensesForToday,
  rangeLast30Days,
  type DashboardComputed,
} from './aggregate'
import { fetchDepensesInRange } from './depenses.service'

function formatYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Agrégation côté client (fallback tant que `/api/stats/*` peut être absent). */
export async function getDashboardComputed(
  budgetItems: BudgetItemApi[],
  categories: Categorie[],
  ref: Date = new Date(),
): Promise<DashboardComputed> {
  const y = ref.getFullYear()
  const m = ref.getMonth() + 1
  const start = `${y}-${String(m).padStart(2, '0')}-01`
  const last = new Date(y, m, 0).getDate()
  const end = `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`
  const { after, before } = rangeLast30Days(ref)
  const today = formatYmd(ref)

  const [depensesMonth, depensesTrend, depensesTodayRaw] = await Promise.all([
    fetchDepensesInRange(start, end),
    fetchDepensesInRange(after, before),
    fetchDepensesInRange(today, today),
  ])

  const depensesToday = depensesForToday(depensesTodayRaw)

  return computeDashboard(
    budgetItems,
    depensesMonth,
    depensesTrend,
    depensesToday,
    categories,
    ref,
  )
}

/** Charge les dépenses du mois pour analyses / recommandations */
export async function fetchDepensesForMonth(
  year: number,
  month: number,
): Promise<DepenseApi[]> {
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const last = new Date(year, month, 0).getDate()
  const end = `${year}-${String(month).padStart(2, '0')}-${String(last).padStart(2, '0')}`
  return fetchDepensesInRange(start, end)
}
