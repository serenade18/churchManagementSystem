import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, request, setViewOnly, tokens } from './api'
import { endDemo, isDemo, startDemo } from './demo'
import type { Tokens, User } from '../types'

interface AuthValue {
  user: User | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  demoLogin: () => Promise<void>
  acceptTokens: (data: Tokens) => Promise<void>
  logout: () => void
  reload: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(Boolean(tokens.access || tokens.refresh || isDemo()))

  const loadUser = useCallback(async () => {
    try {
      const me = await api.get<User>('/auth/me/')
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

  const login = async (username: string, password: string) => {
    endDemo() // a real sign-in leaves the demo
    const data = await request<Tokens>('/auth/login/', { method: 'POST', body: { username, password }, auth: false })
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
  const acceptTokens = async (data: Tokens) => {
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

export const useAuth = () => {
  const auth = useContext(AuthContext)
  if (!auth) throw new Error('useAuth must be used inside <AuthProvider>')
  return auth
}

/** Landing page for a signed-in user: super admins get the system dashboard. */
export const homeFor = (user: User | null) => (user?.is_superuser ? '/super' : '/dashboard')
