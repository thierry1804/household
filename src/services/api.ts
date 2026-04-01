import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL ?? ''

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

export function isAxios422(err: unknown): err is { response: { data: { violations?: { field: string; message: string }[] } } } {
  return (
    typeof err === 'object' &&
    err !== null &&
    'response' in err &&
    (err as { response?: { status?: number } }).response?.status === 422
  )
}

export function getViolations(err: unknown): { field: string; message: string }[] {
  if (isAxios422(err) && err.response.data?.violations) {
    return err.response.data.violations
  }
  return []
}

/** Message d’erreur API (Symfony, API Platform, JSON générique). */
export function getApiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const d = err.response?.data as
      | { detail?: string; message?: string; error?: string }
      | undefined
    if (d?.detail && typeof d.detail === 'string') return d.detail
    if (d?.message && typeof d.message === 'string') return d.message
    if (d?.error && typeof d.error === 'string') return d.error
    return err.message
  }
  if (err instanceof Error) return err.message
  return 'Erreur inconnue'
}
