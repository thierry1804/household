import { endOfMonth, endOfToday, format, subDays } from 'date-fns'
import type {
  BudgetItemApi,
  BudgetPostStats,
  Categorie,
  DepenseApi,
  MonthlyStats,
} from '../types'
import { computeMontantMensuel } from '../utils/periodicite'

function montantMensuelEffectif(b: BudgetItemApi): number {
  const f =
    b.frequence != null && Number.isFinite(b.frequence) && b.frequence >= 1
      ? Math.floor(b.frequence)
      : 1
  return computeMontantMensuel(
    b.quantite,
    b.prixUnitaire,
    b.periodicite,
    f,
  )
}

export type AlertLevel = 'over' | 'near' | 'ok'

export interface CategoryAlert {
  categorie: string
  prevision: number
  reel: number
  ratio: number
  level: AlertLevel
}

export interface DashboardComputed {
  year: number
  month: number
  monthlyByCategory: MonthlyStats[]
  totalPrevuMois: number
  totalReelMois: number
  ecartMois: number
  depensesAujourdhui: number
  topCategorieCode: string | null
  topCategorieMontant: number
  trendDaily: { date: string; montant: number }[]
  alerts: CategoryAlert[]
  joursRestants: number
}

export interface Recommendation {
  id: string
  texte: string
  variant: 'warning' | 'success' | 'danger' | 'neutral'
}

function previsionCategory(
  items: BudgetItemApi[],
  code: string,
): number {
  return items
    .filter((b) => b.actif && b.categorie.code === code)
    .reduce((s, b) => s + montantMensuelEffectif(b), 0)
}

function reelCategory(depenses: DepenseApi[], code: string): number {
  return depenses
    .filter((d) => d.categorieCode === code)
    .reduce((s, d) => s + d.montant, 0)
}

/** Réalisé du mois pour un poste : lien explicite `budgetItem`, sinon même produit que le nom du poste. */
function reelForBudgetItem(b: BudgetItemApi, depenses: DepenseApi[]): number {
  const id = b.id
  const nameKey = b.nom.trim().toLowerCase()
  return depenses.reduce((s, d) => {
    if (d.budgetItem?.id === id) return s + d.montant
    if (!d.budgetItem && d.produit.trim().toLowerCase() === nameKey) {
      return s + d.montant
    }
    return s
  }, 0)
}

export function aggregateMonthlyStatsByBudgetItem(
  budgetItems: BudgetItemApi[],
  depensesMonth: DepenseApi[],
  categories: Categorie[],
): BudgetPostStats[] {
  const actifs = budgetItems.filter((b) => b.actif)
  return actifs
    .map((b) => {
      const prevision = montantMensuelEffectif(b)
      const reel = reelForBudgetItem(b, depensesMonth)
      const ecart = reel - prevision
      const pourcentage =
        prevision > 0
          ? Math.round((reel / prevision) * 1000) / 10
          : reel > 0
            ? 100
            : 0
      const categorieLibelle =
        categories.find((c) => c.code === b.categorie.code)?.libelle ??
        b.categorie.code
      return {
        budgetItemId: b.id,
        nom: b.nom,
        categorieCode: b.categorie.code,
        categorieLibelle,
        prevision,
        reel,
        ecart,
        pourcentage,
      }
    })
    .filter((row) => row.prevision > 0 || row.reel > 0)
    .sort(
      (a, b) =>
        Math.max(b.prevision, b.reel) - Math.max(a.prevision, a.reel),
    )
}

/** Dépenses du mois affectées à chaque poste (lien API ou correspondance nom produit). */
export function groupDepensesByBudgetItemId(
  budgetItems: BudgetItemApi[],
  depensesMonth: DepenseApi[],
): Record<number, DepenseApi[]> {
  const actifs = budgetItems.filter((b) => b.actif)
  const out: Record<number, DepenseApi[]> = {}
  for (const b of actifs) {
    out[b.id] = []
  }
  for (const d of depensesMonth) {
    if (d.budgetItem?.id != null) {
      const id = d.budgetItem.id
      if (!out[id]) out[id] = []
      out[id].push(d)
      continue
    }
    const key = d.produit.trim().toLowerCase()
    const bi = actifs.find((x) => x.nom.trim().toLowerCase() === key)
    if (bi) {
      out[bi.id].push(d)
    }
  }
  return out
}

export function aggregateMonthlyStats(
  budgetItems: BudgetItemApi[],
  depensesMonth: DepenseApi[],
  categories: Categorie[],
): MonthlyStats[] {
  const codes = new Set<string>()
  budgetItems.filter((b) => b.actif).forEach((b) => codes.add(b.categorie.code))
  depensesMonth.forEach((d) => codes.add(d.categorieCode))
  categories.forEach((c) => codes.add(c.code))

  return Array.from(codes).map((code) => {
    const prevision = previsionCategory(budgetItems, code)
    const reel = reelCategory(depensesMonth, code)
    const ecart = reel - prevision
    const pourcentage =
      prevision > 0 ? Math.round((reel / prevision) * 1000) / 10 : reel > 0 ? 100 : 0
    const lib =
      categories.find((c) => c.code === code)?.libelle ?? code
    return {
      categorie: lib,
      prevision,
      reel,
      ecart,
      pourcentage,
    }
  })
}

function alertLevel(ratio: number): AlertLevel {
  if (ratio > 1) return 'over'
  if (ratio >= 0.85) return 'near'
  return 'ok'
}

export function computeDashboard(
  budgetItems: BudgetItemApi[],
  depensesMonth: DepenseApi[],
  depensesTrend: DepenseApi[],
  depensesToday: DepenseApi[],
  categories: Categorie[],
  ref: Date,
): DashboardComputed {
  const year = ref.getFullYear()
  const month = ref.getMonth() + 1
  const monthlyByCategory = aggregateMonthlyStats(
    budgetItems,
    depensesMonth,
    categories,
  )
  const totalPrevuMois = budgetItems
    .filter((b) => b.actif)
    .reduce((s, b) => s + montantMensuelEffectif(b), 0)
  const totalReelMois = depensesMonth.reduce((s, d) => s + d.montant, 0)
  const ecartMois = totalReelMois - totalPrevuMois
  const depensesAujourdhui = depensesToday.reduce((s, d) => s + d.montant, 0)

  let topCategorieCode: string | null = null
  let topCategorieMontant = 0
  const byCode = new Map<string, number>()
  depensesMonth.forEach((d) => {
    const v = (byCode.get(d.categorieCode) ?? 0) + d.montant
    byCode.set(d.categorieCode, v)
    if (v > topCategorieMontant) {
      topCategorieMontant = v
      topCategorieCode = d.categorieCode
    }
  })

  const dayMap = new Map<string, number>()
  depensesTrend.forEach((d) => {
    dayMap.set(d.date, (dayMap.get(d.date) ?? 0) + d.montant)
  })
  const trendDaily = Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, montant]) => ({ date, montant }))

  const alerts: CategoryAlert[] = monthlyByCategory
    .filter((row) => row.prevision > 0 || row.reel > 0)
    .map((row) => {
      const prevision = row.prevision
      const reel = row.reel
      const ratio =
        prevision > 0 ? reel / prevision : reel > 0 ? 2 : 0
      return {
        categorie: row.categorie,
        prevision,
        reel,
        ratio,
        level: alertLevel(ratio),
      }
    })

  const endM = endOfMonth(ref)
  const joursRestants = Math.max(
    0,
    Math.ceil((endM.getTime() - endOfToday().getTime()) / 86400000),
  )

  return {
    year,
    month,
    monthlyByCategory,
    totalPrevuMois,
    totalReelMois,
    ecartMois,
    depensesAujourdhui,
    topCategorieCode,
    topCategorieMontant,
    trendDaily,
    alerts,
    joursRestants,
  }
}

export function buildRecommendations(
  budgetItems: BudgetItemApi[],
  depensesMonth: DepenseApi[],
  categories: Categorie[],
): Recommendation[] {
  const out: Recommendation[] = []
  const stats = aggregateMonthlyStats(budgetItems, depensesMonth, categories)
  const byNamePurchased = new Set(
    depensesMonth.map((d) => d.produit.trim().toLowerCase()),
  )

  for (const row of stats) {
    if (row.prevision <= 0) continue
    const pct = ((row.reel - row.prevision) / row.prevision) * 100
    if (pct > 5) {
      out.push({
        id: `over-${row.categorie}`,
        texte: `${row.categorie} dépasse le budget de ${Math.round(Math.abs(pct))}% ce mois`,
        variant: 'danger',
      })
    } else if (pct < -10 && row.reel < row.prevision) {
      out.push({
        id: `under-${row.categorie}`,
        texte: `${row.categorie} est en dessous des achats prévus ce mois`,
        variant: 'success',
      })
    }
  }

  const actifs = budgetItems.filter((b) => b.actif)
  let notBought = 0
  for (const b of actifs) {
    const key = b.nom.trim().toLowerCase()
    if (!byNamePurchased.has(key)) notBought += 1
  }
  if (notBought > 0) {
    out.push({
      id: 'not-bought',
      texte: `${notBought} poste(s) non acheté(s) ce mois alors que prévu`,
      variant: 'warning',
    })
  }

  return out.slice(0, 12)
}

export function topOverBudget(
  monthly: MonthlyStats[],
  n = 5,
): MonthlyStats[] {
  return [...monthly]
    .filter((m) => m.ecart > 0 && m.prevision > 0)
    .sort((a, b) => b.ecart - a.ecart)
    .slice(0, n)
}

export interface ItemOverBudget {
  nom: string
  budget: number
  reel: number
  ecartPct: number
}

/** Top postes (par nom budgétaire) où le réel mensuel dépasse la prévision */
export function topOverBudgetItems(
  budgetItems: BudgetItemApi[],
  depensesMonth: DepenseApi[],
  n = 5,
): ItemOverBudget[] {
  const rows: ItemOverBudget[] = []
  for (const b of budgetItems.filter((x) => x.actif)) {
    const key = b.nom.trim().toLowerCase()
    const spent = depensesMonth
      .filter((d) => d.produit.trim().toLowerCase() === key)
      .reduce((s, d) => s + d.montant, 0)
    const prev = montantMensuelEffectif(b)
    if (prev <= 0) continue
    if (spent > prev) {
      rows.push({
        nom: b.nom,
        budget: prev,
        reel: spent,
        ecartPct: ((spent - prev) / prev) * 100,
      })
    }
  }
  return rows.sort((a, b) => b.ecartPct - a.ecartPct).slice(0, n)
}

export function depensesForToday(allToday: DepenseApi[]): DepenseApi[] {
  const today = format(new Date(), 'yyyy-MM-dd')
  return allToday.filter((d) => d.date === today)
}

/** Dépenses des 30 derniers jours (inclus aujourd’hui) pour tendance */
export function rangeLast30Days(ref: Date): { after: string; before: string } {
  const before = format(ref, 'yyyy-MM-dd')
  const after = format(subDays(ref, 29), 'yyyy-MM-dd')
  return { after, before }
}
