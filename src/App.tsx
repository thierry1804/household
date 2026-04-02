import { lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/layout/Layout'

const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
)
const BudgetPage = lazy(() =>
  import('./pages/BudgetPage').then((m) => ({ default: m.BudgetPage })),
)
const DepensesPage = lazy(() =>
  import('./pages/DepensesPage').then((m) => ({ default: m.DepensesPage })),
)
const ReferentialsPage = lazy(() =>
  import('./pages/ReferentialsPage').then((m) => ({ default: m.ReferentialsPage })),
)
const AnalysePage = lazy(() =>
  import('./pages/AnalysePage').then((m) => ({ default: m.AnalysePage })),
)

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="budget" element={<BudgetPage />} />
          <Route path="depenses" element={<DepensesPage />} />
          <Route path="referentiels" element={<ReferentialsPage />} />
          <Route path="analyse" element={<AnalysePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
