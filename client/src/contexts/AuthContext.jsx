import { createContext, useState, useEffect, useCallback } from 'react'
import { jwtDecode } from 'jwt-decode'
import api from '../lib/api'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadUser = useCallback(() => {
    const token = localStorage.getItem('dc_token')
    if (!token) { setLoading(false); return }
    try {
      const decoded = jwtDecode(token)
      if (decoded.exp * 1000 < Date.now()) {
        localStorage.removeItem('dc_token')
        setLoading(false)
        return
      }
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      setUser(decoded)
    } catch {
      localStorage.removeItem('dc_token')
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadUser() }, [loadUser])

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('dc_token', data.token)
    api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`
    setUser(jwtDecode(data.token))
    return data
  }

  const logout = () => {
    localStorage.removeItem('dc_token')
    delete api.defaults.headers.common['Authorization']
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
