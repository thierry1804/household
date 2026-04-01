export type Periodicite =
  | 'MOIS'
  | 'SEMAINE'
  | '2_SEMAINES'
  | 'TRIMESTRE'
  | 'ANNEE'

export interface CategorieCompact {
  code: string
  libelle: string
  couleur: string
}

export interface Categorie extends CategorieCompact {
  id: number
  icone: string | null
  ordre: number
}

/** Réponse API budget-item */
export interface BudgetItemApi {
  id: number
  nom: string
  categorie: CategorieCompact
  periodicite: Periodicite
  /** Une occurrence tous les N cycles de périodicité (défaut 1 si absent côté API). */
  frequence?: number
  quantite: number
  unite: string | null
  prixUnitaire: number
  montant: number
  montantMensuel: number
  actif: boolean
}

/** Forme pratique UI (catégorie = code) */
export interface BudgetItem {
  id: number
  nom: string
  categorie: string
  categorieId: number
  periodicite: Periodicite
  frequence: number
  quantite: number
  unite?: string
  prixUnitaire: number
  montant: number
  montantMensuel: number
  actif: boolean
}

export interface DepenseApi {
  id: number
  date: string
  produit: string
  budgetItem: {
    id: number
    nom: string
    categorie: CategorieCompact
  } | null
  categorieCode: string
  quantite: number
  unite: string | null
  prixUnitaire: number
  montant: number
  note: string | null
  createdAt: string
}

export interface DepenseBudgetLink {
  id: number
  nom: string
  categorie: CategorieCompact
}

export interface Depense {
  id: number
  date: string
  produit: string
  budgetItem?: DepenseBudgetLink
  categorie: string
  categorieCode: string
  quantite: number
  unite?: string
  prixUnitaire: number
  montant: number
  note?: string | null
}

export interface MonthlyStats {
  categorie: string
  prevision: number
  reel: number
  ecart: number
  pourcentage: number
}

export interface DepenseListResponse {
  member: DepenseApi[]
  total: number
  page: number
  itemsPerPage: number
}

export interface ApiViolation {
  field: string
  message: string
}

export interface ApiError422 {
  violations: ApiViolation[]
}

export function budgetItemFromApi(
  row: BudgetItemApi,
  categorieId?: number,
): BudgetItem {
  const freq = Number(row.frequence ?? 1)
  return {
    id: row.id,
    nom: row.nom,
    categorie: row.categorie.code,
    categorieId: categorieId ?? 0,
    periodicite: row.periodicite,
    frequence: Number.isFinite(freq) && freq >= 1 ? Math.floor(freq) : 1,
    quantite: row.quantite,
    unite: row.unite ?? undefined,
    prixUnitaire: row.prixUnitaire,
    montant: row.montant,
    montantMensuel: row.montantMensuel,
    actif: row.actif,
  }
}

export function budgetItemFromApiWithCategoryId(
  row: BudgetItemApi,
  categories: Categorie[],
): BudgetItem {
  const cat = categories.find((c) => c.code === row.categorie.code)
  return budgetItemFromApi(row, cat?.id)
}

export function depenseFromApi(row: DepenseApi): Depense {
  return {
    id: row.id,
    date: row.date,
    produit: row.produit,
    budgetItem: row.budgetItem ?? undefined,
    categorie: row.categorieCode,
    categorieCode: row.categorieCode,
    quantite: row.quantite,
    unite: row.unite ?? undefined,
    prixUnitaire: row.prixUnitaire,
    montant: row.montant,
    note: row.note,
  }
}
