import type { BudgetItemApi, Periodicite } from '../types'
import { api } from './api'

export interface BudgetItemCreatePayload {
  nom: string
  categorieId: number
  periodicite: Periodicite
  quantite: number
  unite?: string | null
  prixUnitaire: number
  actif?: boolean
  /** Défaut côté API : 1 */
  frequence?: number
}

export type BudgetItemUpdatePayload = Partial<BudgetItemCreatePayload>

export async function fetchBudgetItems(): Promise<BudgetItemApi[]> {
  const { data } = await api.get<BudgetItemApi[]>('/api/budget-items')
  return data
}

export async function fetchBudgetItem(id: number): Promise<BudgetItemApi> {
  const { data } = await api.get<BudgetItemApi>(`/api/budget-items/${id}`)
  return data
}

export async function createBudgetItem(
  payload: BudgetItemCreatePayload,
): Promise<BudgetItemApi> {
  const { data } = await api.post<BudgetItemApi>('/api/budget-items', payload)
  return data
}

export async function updateBudgetItem(
  id: number,
  payload: BudgetItemUpdatePayload,
): Promise<BudgetItemApi> {
  const { data } = await api.patch<BudgetItemApi>(
    `/api/budget-items/${id}`,
    payload,
  )
  return data
}

export async function replaceBudgetItem(
  id: number,
  payload: BudgetItemCreatePayload,
): Promise<BudgetItemApi> {
  const { data } = await api.put<BudgetItemApi>(
    `/api/budget-items/${id}`,
    payload,
  )
  return data
}

export async function deleteBudgetItem(id: number): Promise<void> {
  await api.delete(`/api/budget-items/${id}`)
}
