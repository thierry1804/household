import type { Periodicite } from '../types'

/**
 * Nombre d’occurrences du poste par « mois budgétaire ».
 * `frequence` = une occurrence tous les N cycles de `periodicite`
 * (ex. SEMAINE + 2 → bihebdomadaire).
 *
 * Pour SEMAINE / 2_SEMAINES : on utilise **4 semaines par mois** (pas 52/12 ≈ 4,33),
 * pour coller au raisonnement courant « 4 semaines dans un mois » (ex. 1 × 1200 / semaine → 4800 / mois).
 */
export function occurrencesParMois(
  periodicite: Periodicite,
  frequence: number,
): number {
  const f = Math.max(1, Math.floor(frequence || 1))
  switch (periodicite) {
    case 'MOIS':
      return 1 / f
    case 'SEMAINE':
      return 4 / f
    case '2_SEMAINES':
      return 2 / f
    case 'TRIMESTRE':
      return (1 / 3) / f
    case 'ANNEE':
      return (1 / 12) / f
    default:
      return 1 / f
  }
}

export function computeMontantMensuel(
  quantite: number,
  prixUnitaire: number,
  periodicite: Periodicite,
  frequence: number,
): number {
  const base = quantite * prixUnitaire
  return Math.round(base * occurrencesParMois(periodicite, frequence))
}
