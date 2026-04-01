import type { DepenseApi, DepenseListResponse } from '../types'
import { api } from './api'

export interface DepenseListParams {
  page?: number
  itemsPerPage?: number
  categorieCode?: string
  produit?: string
  orderDir?: 'asc' | 'desc'
  'order[date]'?: 'asc' | 'desc'
  'order[montant]'?: 'asc' | 'desc'
  'date[after]'?: string
  'date[before]'?: string
}

export interface DepenseCreatePayload {
  date: string
  produit: string
  budgetItemId: number | null
  categorieCode: string
  quantite: number
  unite?: string | null
  prixUnitaire: number
  note?: string | null
}

export type DepenseUpdatePayload = Partial<DepenseCreatePayload>

export async function fetchDepensesPage(
  params?: DepenseListParams,
): Promise<DepenseListResponse> {
  const { data } = await api.get<DepenseListResponse>('/api/depenses', {
    params,
  })
  return data
}

/** Récupère toutes les dépenses dans une plage de dates (pagination serveur). */
export type DepenseFilterParams = Omit<DepenseListParams, 'page' | 'itemsPerPage'>

/** Liste complète avec filtres (boucle pagination 100). */
export async function fetchDepensesAllFiltered(
  params: DepenseFilterParams,
): Promise<DepenseApi[]> {
  const acc: DepenseApi[] = []
  let page = 1
  let total = Infinity
  const itemsPerPage = 100
  while (acc.length < total) {
    const res = await fetchDepensesPage({
      ...params,
      page,
      itemsPerPage,
    })
    acc.push(...res.member)
    total = res.total
    page += 1
    if (res.member.length === 0) break
  }
  return acc
}

export async function fetchDepensesInRange(
  after: string,
  before: string,
): Promise<DepenseApi[]> {
  const acc: DepenseApi[] = []
  let page = 1
  let total = Infinity
  const itemsPerPage = 100
  while (acc.length < total) {
    const res = await fetchDepensesPage({
      page,
      itemsPerPage,
      'date[after]': after,
      'date[before]': before,
      'order[date]': 'desc',
    })
    acc.push(...res.member)
    total = res.total
    page += 1
    if (res.member.length === 0) break
  }
  return acc
}

export async function fetchDepense(id: number): Promise<DepenseApi> {
  const { data } = await api.get<DepenseApi>(`/api/depenses/${id}`)
  return data
}

export async function createDepense(
  payload: DepenseCreatePayload,
): Promise<DepenseApi> {
  const { data } = await api.post<DepenseApi>('/api/depenses', payload)
  return data
}

export async function updateDepense(
  id: number,
  payload: DepenseUpdatePayload,
): Promise<DepenseApi> {
  const { data } = await api.patch<DepenseApi>(`/api/depenses/${id}`, payload)
  return data
}

export async function replaceDepense(
  id: number,
  payload: DepenseCreatePayload,
): Promise<DepenseApi> {
  const { data } = await api.put<DepenseApi>(`/api/depenses/${id}`, payload)
  return data
}

export async function deleteDepense(id: number): Promise<void> {
  await api.delete(`/api/depenses/${id}`)
}
