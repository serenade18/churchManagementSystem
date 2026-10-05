import { demoRequest, isDemo } from './demo'
import type { Params, Tokens } from '../types'

export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace(/\/$/, '')

const ACCESS = 'cms.access'
const REFRESH = 'cms.refresh'

export const tokens = {
  get access(): string | null { return localStorage.getItem(ACCESS) },
  get refresh(): string | null { return localStorage.getItem(REFRESH) },
  set({ access, refresh }: Tokens) {
    if (access) localStorage.setItem(ACCESS, access)
    if (refresh) localStorage.setItem(REFRESH, refresh)
  },
  clear() {
    localStorage.removeItem(ACCESS)
    localStorage.removeItem(REFRESH)
  },
}

export class ApiError extends Error {
  status: number
  data: unknown // the parsed error body: DRF field errors, {detail}, ...

  constructor(status: number, data: unknown) {
    super(extractMessage(data) || `Request failed (${status})`)
    this.status = status
    this.data = data
  }
}

/** The message of anything thrown (ApiError, Error, or otherwise). */
export const errorMessage = (e: unknown): string => (e instanceof Error ? e.message : String(e))

// Turn DRF error payloads ({field: ["msg"]}, {detail: "msg"}, ...) into one readable line.
function extractMessage(data: unknown): string {
  if (!data) return ''
  if (typeof data === 'string') return data
  if (Array.isArray(data)) return data.map(extractMessage).join(' ')
  if (typeof data !== 'object') return ''
  const obj = data as Record<string, unknown>
  if (obj.detail) return extractMessage(obj.detail)
  if (obj.message) return String(obj.message)
  return Object.entries(obj)
    .map(([key, value]) => {
      const msg = extractMessage(value)
      return key === 'non_field_errors' ? msg : `${key.replace(/_/g, ' ')}: ${msg}`
    })
    .join(' ')
}

let refreshing: Promise<boolean> | null = null

async function refreshAccess(): Promise<boolean> {
  if (!tokens.refresh) return false
  refreshing ??= fetch(`${API_URL}/auth/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh: tokens.refresh }),
  })
    .then(async (res) => {
      if (!res.ok) return false
      tokens.set(await res.json())
      return true
    })
    .catch(() => false)
    .finally(() => { refreshing = null })
  return refreshing
}

// View-only accounts (e.g. the demo) can't change anything; the API refuses too, this just answers sooner.
export const VIEW_ONLY_MESSAGE = 'This is a view-only demo: you can look around, but changes are turned off.'
let viewOnly = false
export const setViewOnly = (value: unknown) => { viewOnly = Boolean(value) }

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  params?: Params
  raw?: boolean
  auth?: boolean
}

/**
 * Call the API. Resolves to the parsed JSON typed as `T` (the caller states the shape), or, with
 * `raw`, to the Response itself.
 */
export async function request(path: string, options: RequestOptions & { raw: true }): Promise<Response>
export async function request<T = unknown>(path: string, options?: RequestOptions): Promise<T>
export async function request(path: string, { method = 'GET', body, params, raw = false, auth = true }: RequestOptions = {}): Promise<unknown> {
  // Demo: admin requests are answered from built-in sample data, never the server.
  if (auth && isDemo()) {
    await new Promise((resolve) => setTimeout(resolve, 120))
    try {
      const data = demoRequest(path, { method, params, body })
      return data instanceof Response && !raw ? data.text() : data
    } catch (e) {
      const err = e as Error & { status?: number }
      throw new ApiError(err.status || 400, { detail: err.message })
    }
  }
  if (viewOnly && auth && method !== 'GET') throw new ApiError(403, { detail: VIEW_ONLY_MESSAGE })
  const url = new URL(`${API_URL}${path}`)
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v))
  })

  const isForm = body instanceof FormData
  const send = () => {
    const headers: Record<string, string> = {}
    if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json'
    if (auth && tokens.access) headers.Authorization = `Bearer ${tokens.access}`
    return fetch(url, { method, headers, body: body === undefined ? undefined : isForm ? body : JSON.stringify(body) })
  }

  let res = await send()
  if (res.status === 401 && auth && (await refreshAccess())) res = await send()
  if (res.status === 401 && auth) {
    tokens.clear()
    window.dispatchEvent(new Event('cms:logout'))
  }
  if (raw && res.ok) return res
  if (res.status === 204) return null
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(res.status, data)
  return data
}

export const api = {
  get: <T = unknown>(path: string, params?: Params) => request<T>(path, { params }),
  post: <T = unknown>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  patch: <T = unknown>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  put: <T = unknown>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  del: (path: string) => request<null>(path, { method: 'DELETE' }),
  upload: <T = unknown>(path: string, formData: FormData) => request<T>(path, { method: 'POST', body: formData }),
}

export async function downloadCsv(path: string, params: Params, filename: string) {
  const res = await request(path, { params, raw: true })
  const blob = await res.blob()
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}
