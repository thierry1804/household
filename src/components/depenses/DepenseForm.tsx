/** Charge utile d’édition / mise à jour d’une dépense (API). */
export type DepenseEditPayload = {
  date: string
  produit: string
  categorieCode: string
  quantite: number
  unite: string
  prixUnitaire: number
  budgetItemId: number | null
}
