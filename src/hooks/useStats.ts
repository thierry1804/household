import { useQuery } from '@tanstack/react-query'
import { fetchBudgetItems } from '../services/budget.service'
import { fetchCategories } from '../services/categories.service'
import { getDashboardComputed } from '../services/stats.service'

export function useDashboard(ref?: Date) {
  const d = ref ?? new Date()
  const year = d.getFullYear()
  const month = d.getMonth() + 1
  return useQuery({
    queryKey: ['dashboard', year, month],
    queryFn: async () => {
      const [budgetItems, categories] = await Promise.all([
        fetchBudgetItems(),
        fetchCategories(),
      ])
      return getDashboardComputed(budgetItems, categories, d)
    },
    staleTime: 60 * 1000,
  })
}
