import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { BudgetItem, Categorie } from '../types'
import { budgetItemFromApiWithCategoryId } from '../types'
import {
  createBudgetItem,
  deleteBudgetItem,
  fetchBudgetItems,
  updateBudgetItem,
  type BudgetItemCreatePayload,
  type BudgetItemUpdatePayload,
} from '../services/budget.service'
import { fetchCategories } from '../services/categories.service'
import { computeMontantMensuel } from '../utils/periodicite'

export function useBudgetItems() {
  const qc = useQueryClient()
  const q = useQuery({
    queryKey: ['budget-items'],
    queryFn: async () => {
      const items = await fetchBudgetItems()
      let categories = qc.getQueryData<Categorie[]>(['categories'])
      if (!categories) {
        categories = await fetchCategories()
        qc.setQueryData(['categories'], categories)
      }
      return items.map((row) => budgetItemFromApiWithCategoryId(row, categories))
    },
  })

  const create = useMutation({
    mutationFn: (payload: BudgetItemCreatePayload) => createBudgetItem(payload),
    onSuccess: (data) => {
      const categories = qc.getQueryData<Categorie[]>(['categories']) ?? []
      const row = budgetItemFromApiWithCategoryId(data, categories)
      qc.setQueryData<BudgetItem[]>(['budget-items'], (old) => {
        if (!old) return [row]
        if (old.some((x) => x.id === row.id)) return old
        return [...old, row]
      })
      void qc.invalidateQueries({ queryKey: ['dashboard'] })
      void qc.invalidateQueries({ queryKey: ['analyse'] })
    },
  })

  const update = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number
      payload: BudgetItemUpdatePayload
    }) => updateBudgetItem(id, payload),
    onMutate: async ({ id, payload }) => {
      await qc.cancelQueries({ queryKey: ['budget-items'] })
      const prev = qc.getQueryData<BudgetItem[]>(['budget-items'])
      qc.setQueryData<BudgetItem[]>(['budget-items'], (old) => {
        if (!old) return old
        return old.map((row) => {
          if (row.id !== id) return row
          const next = {
            ...row,
            ...payload,
            nom: payload.nom ?? row.nom,
            categorieId: payload.categorieId ?? row.categorieId,
            periodicite: payload.periodicite ?? row.periodicite,
            frequence: payload.frequence ?? row.frequence,
            quantite: payload.quantite ?? row.quantite,
            unite: payload.unite !== undefined ? (payload.unite ?? undefined) : row.unite,
            prixUnitaire: payload.prixUnitaire ?? row.prixUnitaire,
            actif: payload.actif ?? row.actif,
          }
          const mensuel = computeMontantMensuel(
            next.quantite,
            next.prixUnitaire,
            next.periodicite,
            next.frequence,
          )
          return { ...next, montantMensuel: mensuel }
        })
      })
      return { prev }
    },
    onError: (_err, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['budget-items'], ctx.prev)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['budget-items'] })
      void qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const remove = useMutation({
    mutationFn: (id: number) => deleteBudgetItem(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['budget-items'] })
      void qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  return { ...q, create, update, remove }
}
