import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { DashboardPage } from './pages/DashboardPage'
import { BudgetPage } from './pages/BudgetPage'
import { DepensesPage } from './pages/DepensesPage'
import { AnalysePage } from './pages/AnalysePage'
import { ReferentialsPage } from './pages/ReferentialsPage'

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
