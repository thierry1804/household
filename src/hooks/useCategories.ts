import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import type { Categorie } from '../types'
import {
  createCategory,
  deleteCategory,
  fetchCategories,
  updateCategory,
  type CategorieCreatePayload,
  type CategorieUpdatePayload,
} from '../services/categories.service'

function sortCategories(a: { ordre: number; code: string }, b: { ordre: number; code: string }) {
  return a.ordre - b.ordre || a.code.localeCompare(b.code)
}

/** Création : les postes budgétaires existants ne changent pas — pas de refetch lourd des postes. */
function afterCategoryCreate(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: ['dashboard'] })
  void qc.invalidateQueries({ queryKey: ['depenses'] })
  void qc.invalidateQueries({ queryKey: ['analyse'] })
}

/** Mise à jour / suppression : codes ou rattachements peuvent changer côté postes. */
function afterCategoryUpdateOrDelete(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: ['categories'] })
  void qc.invalidateQueries({ queryKey: ['budget-items'] })
  void qc.invalidateQueries({ queryKey: ['dashboard'] })
  void qc.invalidateQueries({ queryKey: ['depenses'] })
  void qc.invalidateQueries({ queryKey: ['analyse'] })
}

export function useCategories() {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: 5 * 60 * 1000,
  })

  const create = useMutation({
    mutationFn: (payload: CategorieCreatePayload) => createCategory(payload),
    onSuccess: (created) => {
      qc.setQueryData(
        ['categories'],
        (old: Categorie[] | undefined) => {
          const base = old ?? []
          if (base.some((x) => x.id === created.id)) return base
          return [...base, created].sort(sortCategories)
        },
      )
      afterCategoryCreate(qc)
    },
  })

  const update = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number
      payload: CategorieUpdatePayload
    }) => updateCategory(id, payload),
    onSuccess: () => afterCategoryUpdateOrDelete(qc),
  })

  const remove = useMutation({
    mutationFn: (id: number) => deleteCategory(id),
    onSuccess: () => afterCategoryUpdateOrDelete(qc),
  })

  return {
    ...query,
    createCategory: create,
    updateCategory: update,
    deleteCategory: remove,
  }
}
