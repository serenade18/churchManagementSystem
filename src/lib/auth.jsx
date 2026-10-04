import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api, request, setViewOnly, tokens } from './api'
import { endDemo, isDemo, startDemo } from './demo'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(Boolean(tokens.access || tokens.refresh || isDemo()))

  const loadUser = useCallback(async () => {
    try {
      const me = await api.get('/auth/me/')
      setViewOnly(me.view_only)
      setUser(me)
    } catch {
      tokens.clear()
      setViewOnly(false)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tokens.access || tokens.refresh || isDemo()) loadUser()
    const onLogout = () => setUser(null)
    window.addEventListener('cms:logout', onLogout)
    return () => window.removeEventListener('cms:logout', onLogout)
  }, [loadUser])

  const login = async (username, password) => {
    endDemo() // a real sign-in leaves the demo
    const data = await request('/auth/login/', { method: 'POST', body: { username, password }, auth: false })
    tokens.set(data)
    await loadUser()
  }

  // Demo mode (switched on by a super admin): the app on built-in sample data, view only.
  const demoLogin = async () => {
    tokens.clear()
    startDemo()
    await loadUser()
  }

  // Sign in with tokens issued elsewhere (e.g. right after verifying a signup code).
  const acceptTokens = async (data) => {
    tokens.set(data)
    await loadUser()
  }

  const logout = () => {
    tokens.clear()
    endDemo()
    setViewOnly(false)
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, loading, login, demoLogin, acceptTokens, logout, reload: loadUser }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)

/** Landing page for a signed-in user: super admins get the system dashboard. */
export const homeFor = (user) => (user?.is_superuser ? '/super' : '/dashboard')
