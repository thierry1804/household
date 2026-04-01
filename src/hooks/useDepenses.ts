import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { DepenseApi, DepenseListResponse } from '../types'
import {
  createDepense,
  deleteDepense,
  fetchDepensesPage,
  updateDepense,
  type DepenseCreatePayload,
  type DepenseListParams,
  type DepenseUpdatePayload,
} from '../services/depenses.service'

export function useDepensesList(params: DepenseListParams) {
  return useQuery({
    queryKey: ['depenses', params],
    queryFn: () => fetchDepensesPage(params),
    staleTime: 30 * 1000,
  })
}

export function useDepenseMutations() {
  const qc = useQueryClient()

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['depenses'] })
    void qc.invalidateQueries({ queryKey: ['dashboard'] })
  }

  const create = useMutation({
    mutationFn: (payload: DepenseCreatePayload) => createDepense(payload),
    onSuccess: invalidate,
  })

  const update = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number
      payload: DepenseUpdatePayload
    }) => updateDepense(id, payload),
    onMutate: async ({ id, payload }) => {
      await qc.cancelQueries({ queryKey: ['depenses'] })
      const queries = qc.getQueriesData<DepenseListResponse>({
        queryKey: ['depenses'],
      })
      const snapshots = queries.map(([key, data]) => ({ key, data }))
      for (const { key, data } of snapshots) {
        if (!data?.member) continue
        qc.setQueryData<DepenseListResponse>(key, {
          ...data,
          member: data.member.map((row: DepenseApi) =>
            row.id === id
              ? {
                  ...row,
                  ...payload,
                  date: payload.date ?? row.date,
                  produit: payload.produit ?? row.produit,
                  categorieCode: payload.categorieCode ?? row.categorieCode,
                  quantite: payload.quantite ?? row.quantite,
                  unite: payload.unite !== undefined ? payload.unite : row.unite,
                  prixUnitaire: payload.prixUnitaire ?? row.prixUnitaire,
                  montant: row.montant,
                }
              : row,
          ),
        })
      }
      return { snapshots }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.snapshots) {
        for (const { key, data } of ctx.snapshots) {
          if (data) qc.setQueryData(key, data)
        }
      }
    },
    onSettled: invalidate,
  })

  const remove = useMutation({
    mutationFn: (id: number) => deleteDepense(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['depenses'] })
      const queries = qc.getQueriesData<DepenseListResponse>({
        queryKey: ['depenses'],
      })
      const snapshots = queries.map(([key, data]) => ({ key, data }))
      for (const { key, data } of snapshots) {
        if (!data?.member) continue
        qc.setQueryData<DepenseListResponse>(key, {
          ...data,
          member: data.member.filter((row: DepenseApi) => row.id !== id),
          total: Math.max(0, data.total - 1),
        })
      }
      return { snapshots }
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.snapshots) {
        for (const { key, data } of ctx.snapshots) {
          if (data) qc.setQueryData(key, data)
        }
      }
    },
    onSettled: invalidate,
  })

  return { create, update, remove }
}
