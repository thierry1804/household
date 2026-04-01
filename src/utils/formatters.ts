import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

/** AAAA-MM-JJ → jj/mm/aaaa (usage FR). */
export function formatYmdFrSlash(ymd: string): string {
  return formatDateIso(ymd, 'dd/MM/yyyy')
}

/**
 * Interprète une date saisie en jj/mm/aaaa (séparateurs / . -).
 * Retourne AAAA-MM-JJ ou null si invalide.
 */
export function parseFrSlashDateToYmd(input: string): string | null {
  const t = input.trim()
  if (!t) return null
  const parts = t.split(/[/.\-]/).map((p) => p.trim())
  if (parts.length !== 3) return null
  const day = Number(parts[0])
  const month = Number(parts[1])
  let year = Number(parts[2])
  if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year))
    return null
  if (parts[2].length <= 2 && year < 100) year += 2000
  if (year < 1900 || year > 2100) return null
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const d = new Date(year, month - 1, day)
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month - 1 ||
    d.getDate() !== day
  ) {
    return null
  }
  return format(d, 'yyyy-MM-dd')
}

export function toAriary(n: number): string {
  return (
    new Intl.NumberFormat('fr-MG', {
      maximumFractionDigits: 0,
    }).format(Math.round(n)) + ' Ar'
  )
}

export function formatDateIso(isoOrYmd: string, pattern = 'd MMM yyyy'): string {
  try {
    const d = isoOrYmd.includes('T') ? parseISO(isoOrYmd) : parseISO(isoOrYmd + 'T12:00:00')
    return format(d, pattern, { locale: fr })
  } catch {
    return isoOrYmd
  }
}

function capitalizeFrSentence(s: string): string {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Titre de jour pour regroupement (ex. Dimanche 4 janvier 2026). */
export function formatDayLabel(ymd: string): string {
  return capitalizeFrSentence(formatDateIso(ymd, 'EEEE d MMMM yyyy'))
}
