import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api, mapMember } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // 啟動時檢查 localStorage 是否已登入
  useEffect(() => {
    const userId = localStorage.getItem('lineUserId')
    if (!userId) {
      setLoading(false)
      return
    }

    api.getProfile()
      .then(res => {
        if (res.success && res.data) {
          const m = mapMember(res.data)
          setUser({
            ...m,
            lineId: userId,
            displayName: m.displayName || localStorage.getItem('lineDisplayName') || '',
            pictureUrl: m.pictureUrl || localStorage.getItem('linePictureUrl') || null,
          })
        }
      })
      .catch(() => {
        // profile 取得失敗（可能是新用戶），保留 localStorage 但 user 為 null
      })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback((userData) => {
    setUser(userData)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('lineUserId')
    localStorage.removeItem('lineDisplayName')
    localStorage.removeItem('linePictureUrl')
    setUser(null)
  }, [])

  const refreshUser = useCallback(async () => {
    const res = await api.getProfile()
    if (res.success && res.data) {
      const m = mapMember(res.data)
      setUser(prev => ({ ...prev, ...m }))
    }
    return res
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
