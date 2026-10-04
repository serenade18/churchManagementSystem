import { demoRequest, isDemo } from './demo'
export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace(/\/$/, '')

const ACCESS = 'cms.access'
const REFRESH = 'cms.refresh'

export const tokens = {
  get access() { return localStorage.getItem(ACCESS) },
  get refresh() { return localStorage.getItem(REFRESH) },
  set({ access, refresh }) {
    if (access) localStorage.setItem(ACCESS, access)
    if (refresh) localStorage.setItem(REFRESH, refresh)
  },
  clear() {
    localStorage.removeItem(ACCESS)
    localStorage.removeItem(REFRESH)
  },
}

export class ApiError extends Error {
  constructor(status, data) {
    super(extractMessage(data) || `Request failed (${status})`)
    this.status = status
    this.data = data
  }
}

// Turn DRF error payloads ({field: ["msg"]}, {detail: "msg"}, ...) into one readable line.
function extractMessage(data) {
  if (!data) return ''
  if (typeof data === 'string') return data
  if (Array.isArray(data)) return data.map(extractMessage).join(' ')
  if (data.detail) return extractMessage(data.detail)
  if (data.message) return data.message
  return Object.entries(data)
    .map(([key, value]) => {
      const msg = extractMessage(value)
      return key === 'non_field_errors' ? msg : `${key.replace(/_/g, ' ')}: ${msg}`
    })
    .join(' ')
}

let refreshing = null

async function refreshAccess() {
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
export const setViewOnly = (value) => { viewOnly = Boolean(value) }

export async function request(path, { method = 'GET', body, params, raw = false, auth = true } = {}) {
  // Demo: admin requests are answered from built-in sample data, never the server.
  if (auth && isDemo()) {
    await new Promise((resolve) => setTimeout(resolve, 120))
    try {
      const data = demoRequest(path, { method, params, body })
      return data instanceof Response && !raw ? data.text() : data
    } catch (e) {
      throw new ApiError(e.status || 400, { detail: e.message })
    }
  }
  if (viewOnly && auth && method !== 'GET') throw new ApiError(403, { detail: VIEW_ONLY_MESSAGE })
  const url = new URL(`${API_URL}${path}`)
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v)
  })

  const isForm = body instanceof FormData
  const send = () => {
    const headers = {}
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
  get: (path, params) => request(path, { params }),
  post: (path, body) => request(path, { method: 'POST', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  del: (path) => request(path, { method: 'DELETE' }),
  upload: (path, formData) => request(path, { method: 'POST', body: formData }),
}

export async function downloadCsv(path, params, filename) {
  const res = await request(path, { params, raw: true })
  const blob = await res.blob()
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}
