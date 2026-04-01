import type { Categorie } from '../types'

/** Couleurs de secours si l’API ne renvoie pas de couleur */
export const FALLBACK_CATEGORY_COLORS: Record<string, string> = {
  charge: '#78716c',
  chien: '#b45309',
  epice: '#ca8a04',
  food: '#059669',
  hygiene: '#2563eb',
  default: '#6b7280',
}

export function colorForCategoryCode(
  code: string,
  categoriesFromApi?: Categorie[],
): string {
  const found = categoriesFromApi?.find((c) => c.code === code)
  if (found?.couleur) return found.couleur
  const key = code.toLowerCase()
  return FALLBACK_CATEGORY_COLORS[key] ?? FALLBACK_CATEGORY_COLORS.default
}

export function labelForCategoryCode(
  code: string,
  categoriesFromApi?: Categorie[],
): string {
  const found = categoriesFromApi?.find((c) => c.code === code)
  return found?.libelle ?? code
}
