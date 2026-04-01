/** Libellé affiché : première lettre en majuscule (ex. food → Food, épice → Épice). */
export function capitalizeCategoryLibelle(raw: string): string {
  const t = raw.trim().replace(/\s+/g, ' ')
  if (!t) return t
  const lower = t.toLocaleLowerCase('fr-FR')
  return lower.charAt(0).toLocaleUpperCase('fr-FR') + lower.slice(1)
}

/** Code technique pour catégories / référentiels (lettres, chiffres, _). */
export function slugifyReferentialCode(input: string): string {
  const s = input
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return s.slice(0, 64) || 'item'
}
