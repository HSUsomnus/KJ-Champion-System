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

  // [設計決策] onboarding 強制流程的完整度判斷
  // 用戶資料完整 = realName / email / phone / birthday 四欄都不為空
  const isProfileComplete = useCallback((u) => {
    if (!u) return false
    return !!(u.realName?.trim() && u.email?.trim() && u.phone?.trim() && u.birthday)
  }, [])

  // 用戶數據完整 = courseRecord 至少一筆（comma-separated 字串）
  const isStatsComplete = useCallback((u) => {
    if (!u || !u.courseRecord) return false
    const courses = u.courseRecord.split(',').map(c => c.trim()).filter(c => c)
    return courses.length > 0
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser, isProfileComplete, isStatsComplete }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
