/**
 * The member portal (MKanisa ID): its own sign-in, kept apart from the admin one. A member signs in
 * with their phone and an SMS code; the API answers only with what is linked to that phone.
 */
import { ApiError, request, type RequestOptions } from './api'
import type { Params } from '../types'

const KEY = 'mk.portal'

export const portalToken = {
  get: (): string | null => { try { return localStorage.getItem(KEY) } catch { return null } },
  set: (token: string) => { try { localStorage.setItem(KEY, token) } catch { /* private mode */ } },
  clear: () => { try { localStorage.removeItem(KEY) } catch { /* private mode */ } },
}

type PortalOptions = Pick<RequestOptions, 'method' | 'body' | 'params'>

/** A portal API call; a rejected sign-in clears it so the page asks again. */
export async function portalRequest<T = unknown>(path: string, { method = 'GET', body, params }: PortalOptions = {}): Promise<T> {
  try {
    return await request<T>(path, { method, body, params, auth: false, headers: { Authorization: `Portal ${portalToken.get()}` } })
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      portalToken.clear()
      window.dispatchEvent(new Event('mk:portal-signed-out'))
    }
    throw e
  }
}

export const portalGet = <T = unknown>(path: string, params?: Params) => portalRequest<T>(path, { params })
