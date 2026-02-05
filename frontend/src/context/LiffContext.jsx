import { createContext, useContext, useState, useEffect } from 'react'
import liff from '@line/liff'
import { fetchLiffId, syncProfileAvatar } from '../api'

// 開發模式：可設為 true 跳過 LIFF，用模擬 userId 測試 API
const DEV_SKIP_LIFF = import.meta.env.DEV && import.meta.env.VITE_DEV_SKIP_LIFF === '1'
const DEV_MOCK_USER_ID = 'U11111111111111111111111111111111'

const LiffContext = createContext({
  isReady: false,
  isLoggedIn: false,
  userId: null,
  profile: null,
  login: () => {},
  error: null,
})

export function LiffProvider({ children }) {
  const [isReady, setReady] = useState(false)
  const [isLoggedIn, setLoggedIn] = useState(false)
  const [userId, setUserId] = useState(null)
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState(null)

  const login = () => {
    if (!liff.isInClient()) {
      liff.login()
    } else {
      liff.login()
    }
  }

  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        if (DEV_SKIP_LIFF) {
          setUserId(DEV_MOCK_USER_ID)
          setProfile({ userId: DEV_MOCK_USER_ID, displayName: '開發測試員', pictureUrl: '' })
          setLoggedIn(true)
          setReady(true)
          return
        }

        const liffId = await fetchLiffId()
        await liff.init({ liffId })

        if (liff.isLoggedIn()) {
          const p = await liff.getProfile()
          if (!cancelled) {
            setUserId(p.userId)
            setProfile(p)
            setLoggedIn(true)
            // 每次進入系統：檢查 LINE 頭像是否變更，有則同步到 Google Sheet
            syncProfileAvatar(p.userId, (p.pictureUrl || '').trim())
          }
        }
        if (!cancelled) setReady(true)
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'LIFF 初始化失敗')
          setReady(true)
        }
      }
    }

    init()
    return () => { cancelled = true }
  }, [])

  return (
    <LiffContext.Provider value={{ isReady, isLoggedIn, userId, profile, login, error }}>
      {children}
    </LiffContext.Provider>
  )
}

export function useLiff() {
  return useContext(LiffContext)
}
