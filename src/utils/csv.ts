import type { Periodicite } from '../types'
import {
  capitalizeCategoryLibelle,
  slugifyReferentialCode,
} from './slug'

const PERIODICITES: Periodicite[] = [
  'MOIS',
  'SEMAINE',
  '2_SEMAINES',
  'TRIMESTRE',
  'ANNEE',
]

/** Séparateur de champs (virgule, point-virgule Excel FR, tab). */
function parseCsvLine(line: string, delim: ',' | ';' | '\t'): string[] {
  const out: string[] = []
  let cur = ''
  let q = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      q = !q
    } else if ((c === delim && !q) || c === '\r') {
      out.push(cur.trim())
      cur = ''
    } else {
      cur += c
    }
  }
  out.push(cur.trim())
  return out
}

function parseLine(line: string): string[] {
  return parseCsvLine(line, ',')
}

function detectDelimiter(line: string): ',' | ';' | '\t' {
  let commas = 0
  let semis = 0
  let tabs = 0
  let q = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') q = !q
    else if (!q) {
      if (c === ',') commas++
      if (c === ';') semis++
      if (c === '\t') tabs++
    }
  }
  if (tabs > 0 && tabs >= semis && tabs >= commas) return '\t'
  if (semis > commas) return ';'
  return ','
}

function norm(s: string) {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, '_')
}

/** Première colonne dont le nom normalisé est dans `names`. */
function colIdx(header: string[], ...names: string[]): number {
  for (const n of names) {
    const i = header.indexOf(n)
    if (i >= 0) return i
  }
  return -1
}

/** Montants type capture (virgules = milliers, ex. 49,000 → 49000). */
function parseBudgetMoney(s: string | undefined): number {
  if (!s) return NaN
  const t = s.trim().replace(/\s/g, '').replace(/,/g, '')
  const n = Number(t)
  return Number.isFinite(n) ? Math.round(n) : NaN
}

/** Quantité : décimal virgule ou point (ex. 1,5 ou 0.25). */
function parseBudgetQty(s: string | undefined): number {
  if (!s) return NaN
  let t = s.trim().replace(/\s/g, '')
  if (/^\d+,\d+$/.test(t)) {
    t = t.replace(',', '.')
  }
  return Number(t)
}

export interface ParsedBudgetRow {
  nom: string
  /** Code stable (slug) pour l’API / correspondance. */
  categorieCode: string
  /** Libellé avec majuscule initiale pour création affichage. */
  categorieLibelle: string
  periodicite: Periodicite
  /** Défaut 1 si colonne absente */
  frequence: number
  quantite: number
  unite?: string
  prixUnitaire: number
}

/**
 * CSV aligné sur le tableau budget : item, périodicité, fréquence, qté, unité, pu, (montant ignoré), catégorie.
 * En-têtes reconnus (accents / variantes) après normalisation.
 */
export function parseBudgetCsv(content: string): ParsedBudgetRow[] {
  const lines = content.split(/\n/).map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2) return []
  const header = parseLine(lines[0]).map(norm)

  const iNom = colIdx(header, 'item', 'nom', 'poste', 'libelle')
  const iCat = colIdx(header, 'categorie', 'category', 'cat')
  const iPer = colIdx(header, 'periodicite')
  const iQte = colIdx(header, 'qte', 'quantite', 'qty')
  const iUn = colIdx(header, 'unite', 'unit')
  const iPu = colIdx(header, 'pu', 'prixunitaire', 'prix_unitaire')
  const iFreq = colIdx(header, 'frequence', 'freq')

  if (iNom < 0 || iCat < 0 || iPer < 0 || iQte < 0 || iPu < 0) {
    throw new Error(
      'Colonnes requises : item (ou nom), categorie, periodicite, qte (ou quantite), pu (ou prixUnitaire).',
    )
  }

  const rows: ParsedBudgetRow[] = []
  for (let l = 1; l < lines.length; l++) {
    const cells = parseLine(lines[l])
    const nom = cells[iNom]?.trim()
    if (!nom) continue
    const categorieRaw = cells[iCat]?.trim()
    if (!categorieRaw) continue
    const categorieCode = slugifyReferentialCode(categorieRaw)
    if (!categorieCode) continue
    const categorieLibelle = capitalizeCategoryLibelle(categorieRaw)
    const perRaw = cells[iPer]?.trim().toUpperCase().replace(/\s/g, '_') as Periodicite
    if (!PERIODICITES.includes(perRaw)) continue
    const quantite = parseBudgetQty(cells[iQte])
    const prixUnitaire = parseBudgetMoney(cells[iPu])
    if (!Number.isFinite(quantite) || quantite <= 0) continue
    if (!Number.isFinite(prixUnitaire) || prixUnitaire < 0) continue
    const unite = iUn >= 0 ? cells[iUn]?.trim() || undefined : undefined
    let frequence = 1
    if (iFreq >= 0) {
      const fq = Math.floor(
        Number(String(cells[iFreq] ?? '').replace(/\s/g, '')),
      )
      if (Number.isFinite(fq) && fq >= 1) frequence = fq
    }
    rows.push({
      nom,
      categorieCode,
      categorieLibelle,
      periodicite: perRaw,
      frequence,
      quantite,
      unite,
      prixUnitaire,
    })
  }
  return rows
}

export function depensesToCsv(
  rows: {
    date: string
    produit: string
    categorieCode: string
    posteBudgetaire: string
    quantite: number
    unite: string
    prixUnitaire: number
    montant: number
  }[],
): string {
  const h =
    'date,produit,quantite,unite,prixUnitaire,montant,categorie,posteBudgetaire'
  const body = rows
    .map((r) =>
      [
        r.date,
        escapeCsv(r.produit),
        r.quantite,
        escapeCsv(r.unite),
        r.prixUnitaire,
        r.montant,
        escapeCsv(r.categorieCode),
        escapeCsv(r.posteBudgetaire),
      ].join(','),
    )
    .join('\n')
  return `${h}\n${body}`
}

/**
 * Ordre des deux premiers nombres pour les dates avec `/` ou `-` sans année en tête.
 * - `DMY` : jour puis mois (usage courant FR) — 04/01/2026 → 4 janvier
 * - `MDY` : mois puis jour (Excel US) — 04/01/2026 → 1er avril
 */
export type SlashDateOrder = 'DMY' | 'MDY'

function twoPartDateToIso(
  a: string,
  b: string,
  year: string,
  order: SlashDateOrder,
): string {
  const y = year
  if (order === 'DMY') {
    const day = a.padStart(2, '0')
    const month = b.padStart(2, '0')
    return `${y}-${month}-${day}`
  }
  const month = a.padStart(2, '0')
  const day = b.padStart(2, '0')
  return `${y}-${month}-${day}`
}

/**
 * JJ/MM/AAAA ou MM/JJ/AAAA selon `slashOrder`, JJ-MM-AAAA, AAAA-MM-JJ, AAAA/MM/JJ → AAAA-MM-JJ pour l’API.
 */
export function parseDepenseDateIso(
  s: string | undefined,
  slashOrder: SlashDateOrder = 'DMY',
): string | null {
  if (!s) return null
  const t = s.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t
  const slash = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (slash) {
    return twoPartDateToIso(slash[1], slash[2], slash[3], slashOrder)
  }
  const dash = t.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
  if (dash) {
    return twoPartDateToIso(dash[1], dash[2], dash[3], slashOrder)
  }
  const isoSlash = t.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/)
  if (isoSlash) {
    const y = isoSlash[1]
    const mo = isoSlash[2].padStart(2, '0')
    const d = isoSlash[3].padStart(2, '0')
    return `${y}-${mo}-${d}`
  }
  return null
}

/** PU / montant : entiers ou décimaux (15,50 ou 15.50), espaces milliers. */
function parseDepenseMoney(s: string | undefined): number {
  if (!s) return NaN
  let t = s.trim().replace(/\s/g, '')
  if (!t) return NaN
  if (/^\d+,\d+$/.test(t)) {
    return Math.round(Number(t.replace(',', '.')))
  }
  if (/^\d{1,3}(\.\d{3})+,\d{1,2}$/.test(t)) {
    return Math.round(Number(t.replace(/\./g, '').replace(',', '.')))
  }
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(t)) {
    t = t.replace(/,/g, '')
    return Math.round(Number(t))
  }
  t = t.replace(/,/g, '')
  const n = Number(t)
  return Number.isFinite(n) ? Math.round(n) : NaN
}

/** Ligne brute import CSV dépenses (résolution catégorie / poste côté UI). */
export interface ParsedDepenseCsvRow {
  dateIso: string
  produit: string
  quantite: number
  unite: string
  prixUnitaire: number
  /** Code catégorie si colonne présente (sinon null). */
  categorieCodeRaw: string | null
  /** Nom du poste budgétaire si colonne présente. */
  posteBudgetaireRaw: string | null
}

export interface ParseDepensesCsvMeta {
  rows: ParsedDepenseCsvRow[]
  /** Nombre de lignes de données (sans la ligne d’en-tête). */
  dataLineCount: number
  /** Séparateur détecté sur la première ligne. */
  delimiter: ',' | ';' | '\t'
}

export interface ParseDepensesCsvOptions {
  /** Pour 04/01/2026 : DMY = 4 jan., MDY = 1er avril */
  slashDateOrder?: SlashDateOrder
}

/**
 * Import main courante : date, produit, qté, PU (ou montant seul), unité optionnelle,
 * categorie (code) et/ou posteBudgetaire (nom du poste).
 * BOM UTF-8, séparateur virgule / point-virgule (Excel) / tab.
 * En-têtes reconnus après normalisation (accents / underscores).
 */
export function parseDepensesCsvWithMeta(
  content: string,
  options?: ParseDepensesCsvOptions,
): ParseDepensesCsvMeta {
  const slashOrder: SlashDateOrder = options?.slashDateOrder ?? 'DMY'
  const raw = content.replace(/^\uFEFF/, '')
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2) {
    return { rows: [], dataLineCount: 0, delimiter: ',' }
  }
  const delim = detectDelimiter(lines[0])
  const header = parseCsvLine(lines[0], delim).map((c) =>
    norm(c.replace(/^\uFEFF/, '')),
  )

  const iDate = colIdx(header, 'date', 'jour')
  const iProd = colIdx(header, 'produit', 'product', 'article', 'description')
  const iQte = colIdx(
    header,
    'quantite',
    'qte',
    'qt',
    'qty',
    '#_qt',
    '#qt',
    '_qt',
  )
  const iUn = colIdx(header, 'unite', 'unit')
  const iPu = colIdx(header, 'pu', 'prixunitaire', 'prix_unitaire', '#_pu', '#pu')
  const iMontant = colIdx(
    header,
    'montant',
    'amount',
    'total',
    '#_montant',
    '#montant',
  )
  const iCat = colIdx(header, 'categorie', 'category', 'cat', 'enveloppe')
  const iPoste = colIdx(
    header,
    'poste_budgetaire',
    'postebudgetaire',
    'poste',
    'poste_budget',
    'budgetitem',
    'item_budget',
  )

  if (iDate < 0 || iProd < 0 || iQte < 0) {
    throw new Error(
      'Colonnes requises : DATE, PRODUIT, quantité (QUANTITE, QT, QTE…), et PU ou MONTANT. Les en-têtes peuvent être en majuscules.',
    )
  }
  if (iPu < 0 && iMontant < 0) {
    throw new Error(
      'Indiquez une colonne PU (prix unitaire) ou MONTANT. Les en-têtes peuvent être en majuscules.',
    )
  }
  /** Pas de colonne CATEGORIE / poste : l’import utilisera une catégorie par défaut (côté appli). */

  const dataLineCount = lines.length - 1
  const rows: ParsedDepenseCsvRow[] = []
  for (let l = 1; l < lines.length; l++) {
    const cells = parseCsvLine(lines[l], delim)
    const produit = cells[iProd]?.trim()
    if (!produit) continue

    const dateIso = parseDepenseDateIso(cells[iDate], slashOrder)
    if (!dateIso) continue

    const quantite = parseBudgetQty(cells[iQte])
    if (!Number.isFinite(quantite) || quantite <= 0) continue

    let prixUnitaire = iPu >= 0 ? parseDepenseMoney(cells[iPu]) : NaN
    if (!Number.isFinite(prixUnitaire) || prixUnitaire < 0) {
      const mont = iMontant >= 0 ? parseDepenseMoney(cells[iMontant]) : NaN
      if (Number.isFinite(mont) && mont >= 0 && quantite > 0) {
        prixUnitaire = Math.round(mont / quantite)
      }
    }
    if (!Number.isFinite(prixUnitaire) || prixUnitaire < 0) continue

    const unite = iUn >= 0 ? (cells[iUn]?.trim() ?? '') : ''
    const categorieCodeRaw =
      iCat >= 0 ? (cells[iCat]?.trim() || null) : null
    const posteBudgetaireRaw =
      iPoste >= 0 ? (cells[iPoste]?.trim() || null) : null

    /** Ligne valide même si CATEGORIE / poste vides (repli côté import). */
    rows.push({
      dateIso,
      produit,
      quantite,
      unite,
      prixUnitaire,
      categorieCodeRaw,
      posteBudgetaireRaw,
    })
  }
  return { rows, dataLineCount, delimiter: delim }
}

export function parseDepensesCsv(
  content: string,
  options?: ParseDepensesCsvOptions,
): ParsedDepenseCsvRow[] {
  return parseDepensesCsvWithMeta(content, options).rows
}

function escapeCsv(s: string) {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}
