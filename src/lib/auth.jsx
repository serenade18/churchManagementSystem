import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api, request, tokens } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(Boolean(tokens.access || tokens.refresh))

  const loadUser = useCallback(async () => {
    try {
      setUser(await api.get('/auth/me/'))
    } catch {
      tokens.clear()
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tokens.access || tokens.refresh) loadUser()
    const onLogout = () => setUser(null)
    window.addEventListener('cms:logout', onLogout)
    return () => window.removeEventListener('cms:logout', onLogout)
  }, [loadUser])

  const login = async (username, password) => {
    const data = await request('/auth/login/', { method: 'POST', body: { username, password }, auth: false })
    tokens.set(data)
    await loadUser()
  }

  const logout = () => {
    tokens.clear()
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, loading, login, logout, reload: loadUser }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
