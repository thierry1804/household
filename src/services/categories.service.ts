import type { Categorie } from '../types'
import { api } from './api'

export interface CategorieCreatePayload {
  code: string
  libelle: string
  couleur: string
  icone?: string | null
  ordre: number
}

export async function fetchCategories(): Promise<Categorie[]> {
  const { data } = await api.get<Categorie[]>('/api/categories')
  return data
}

export async function createCategory(
  payload: CategorieCreatePayload,
): Promise<Categorie> {
  const { data } = await api.post<Categorie>('/api/categories', payload)
  return data
}

/** Champs modifiables (PATCH /api/categories/{id}) — aligné API Symfony / API Platform */
export type CategorieUpdatePayload = Partial<
  Pick<CategorieCreatePayload, 'libelle' | 'couleur' | 'icone' | 'ordre' | 'code'>
>

export async function updateCategory(
  id: number,
  payload: CategorieUpdatePayload,
): Promise<Categorie> {
  const { data } = await api.patch<Categorie>(`/api/categories/${id}`, payload)
  return data
}

export async function deleteCategory(id: number): Promise<void> {
  await api.delete(`/api/categories/${id}`)
}
