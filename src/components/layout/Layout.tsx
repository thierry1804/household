import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'

const STORAGE_KEY = 'household-sidebar-collapsed'

export function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(STORAGE_KEY) === '1'
  })

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      sidebarCollapsed ? '1' : '0',
    )
  }, [sidebarCollapsed])

  return (
    <div className="flex min-h-svh flex-col md:flex-row">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((c) => !c)}
      />
      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  )
}
