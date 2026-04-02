import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

export type ToastVariant = 'success' | 'error' | 'warning' | 'info'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface Toast {
  id: string
  message: string
  variant: ToastVariant
  action?: ToastAction
  /** durée ms, défaut 4000 */
  duration?: number
}

interface ToastCtx {
  toasts: Toast[]
  addToast: (t: Omit<Toast, 'id'>) => string
  removeToast: (id: string) => void
}

const Ctx = createContext<ToastCtx | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const removeToast = useCallback((id: string) => {
    clearTimeout(timers.current.get(id))
    timers.current.delete(id)
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random()}`
    const duration = t.duration ?? 4000
    setToasts((prev) => [...prev, { ...t, id }])
    const timer = setTimeout(() => removeToast(id), duration)
    timers.current.set(id, timer)
    return id
  }, [removeToast])

  return (
    <Ctx.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </Ctx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
