import { createContext, useContext, useState, useEffect } from 'react'
import { api, setTokens, clearTokens } from '../api'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // On mount, try to fetch current user if token exists
  useEffect(() => {
    async function fetchUser() {
      try {
        const data = await api.getCurrentUser()
        setUser(data)
      } catch (e) {
        clearTokens()
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    if (localStorage.getItem('access')) {
      fetchUser()
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (username, password) => {
    const data = await api.login(username, password)
    setUser(data.user)
  }

  const logout = async () => {
    try {
      await api.logout()
    } catch (e) {
      /* ignore */
    } finally {
      clearTokens()
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext) 