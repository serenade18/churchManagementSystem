/**
 * The member portal (MKanisa ID): its own sign-in, kept apart from the admin one. A member signs in
 * with their phone and an SMS code; the API answers only with what is linked to that phone.
 */
import { request } from './api'

const KEY = 'mk.portal'

export const portalToken = {
  get: () => { try { return localStorage.getItem(KEY) } catch { return null } },
  set: (token) => { try { localStorage.setItem(KEY, token) } catch { /* private mode */ } },
  clear: () => { try { localStorage.removeItem(KEY) } catch { /* private mode */ } },
}

/** A portal API call; a rejected sign-in clears it so the page asks again. */
export async function portalRequest(path, { method = 'GET', body, params } = {}) {
  try {
    return await request(path, { method, body, params, auth: false, headers: { Authorization: `Portal ${portalToken.get()}` } })
  } catch (e) {
    if (e.status === 401) {
      portalToken.clear()
      window.dispatchEvent(new Event('mk:portal-signed-out'))
    }
    throw e
  }
}

export const portalGet = (path, params) => portalRequest(path, { params })
