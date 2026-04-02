import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api, mapMember } from '../services/api'

export default function Login() {
  const navigate = useNavigate()
  const { user, login } = useAuth()
  const [authState, setAuthState] = useState('idle') // 'idle' | 'loading' | 'has-profile' | 'no-profile'
  const [userData, setUserData] = useState(null)

  // 已登入狀態直接跳轉
  useEffect(() => {
    if (user) navigate('/', { replace: true })
  }, [user, navigate])

  // 檢查 URL 是否帶有 OAuth 回調參數
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const userId = params.get('userId')
    const displayName = params.get('displayName')
    const pictureUrl = params.get('pictureUrl')

    if (userId) {
      setAuthState('loading')

      localStorage.setItem('lineUserId', userId)
      localStorage.setItem('lineDisplayName', displayName || '')
      localStorage.setItem('linePictureUrl', pictureUrl || '')

      window.history.replaceState({}, '', '/login')

      api.getProfile()
        .then(res => {
          if (res.success && res.data) {
            const m = mapMember(res.data)
            setUserData({ ...m, lineId: userId, displayName: displayName || m.displayName, pictureUrl: pictureUrl || m.pictureUrl })
            setAuthState('has-profile')
          }
        })
        .catch(() => {
          setUserData({ lineId: userId, displayName, pictureUrl })
          setAuthState('no-profile')
        })
    }
  }, [])

  const handleLineLogin = () => {
    window.location.href = '/api/auth/line-login?returnUrl=/login'
  }

  const handleConfirm = () => {
    if (authState === 'has-profile' && userData) {
      login(userData)
      if (userData.pictureUrl) {
        api.syncAvatar(userData.pictureUrl).catch(() => {})
      }
      navigate('/')
    } else {
      navigate('/profile/edit')
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: '#F7F5F2' }}
    >
      {/* Logo */}
      <img
        src="/康九_logo.png"
        alt="KJ Champion"
        className="w-28 object-contain mb-3"
      />

      {/* 標題 */}
      <h1
        className="text-xl font-semibold mb-1"
        style={{ color: '#2C2C2C', letterSpacing: '0.06em' }}
      >
        康九冠軍小幫手系統
      </h1>

      {/* 副標題 */}
      <p className="text-xs mb-8" style={{ color: '#8A8680' }}>
        KJ Champion System
      </p>

      {authState === 'idle' && (
        <div className="w-full max-w-xs">
          <button
            onClick={handleLineLogin}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all active:scale-95"
            style={{ background: '#4A7C59', color: '#fff' }}
          >
            {/* LINE icon */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
            LINE 登入驗證
          </button>
        </div>
      )}

      {authState === 'loading' && (
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: '#E2DED8', borderTopColor: 'transparent' }}
          />
          <p className="text-xs" style={{ color: '#8A8680' }}>驗證中...</p>
        </div>
      )}

      {authState === 'has-profile' && userData && (
        <div className="w-full max-w-xs flex flex-col items-center gap-4">
          {/* 用戶資訊卡片 */}
          <div
            className="w-full rounded-2xl p-5 flex flex-col items-center gap-3"
            style={{ background: '#FFFFFF', border: '1px solid #E2DED8' }}
          >
            {userData.pictureUrl ? (
              <img src={userData.pictureUrl} alt="" className="w-14 h-14 rounded-full object-cover" />
            ) : (
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold"
                style={{ background: '#4A7C59', color: '#fff' }}
              >
                {(userData.realName || userData.displayName || '?')[0]}
              </div>
            )}
            <div className="text-center">
              <p className="text-sm font-medium" style={{ color: '#2C2C2C' }}>{userData.realName || userData.displayName}</p>
              {userData.realName && userData.displayName && userData.realName !== userData.displayName && (
                <p className="text-xs mt-1" style={{ color: '#8A8680' }}>{userData.displayName}</p>
              )}
            </div>
          </div>
          <button
            onClick={handleConfirm}
            className="w-full py-3 rounded-xl text-sm font-medium transition-all active:scale-95"
            style={{ background: '#4A7C59', color: '#fff' }}
          >
            確認進入
          </button>
        </div>
      )}

      {authState === 'no-profile' && userData && (
        <div className="w-full max-w-xs flex flex-col items-center gap-4">
          {/* 用戶資訊卡片 */}
          <div
            className="w-full rounded-2xl p-5 flex flex-col items-center gap-3"
            style={{ background: '#FFFFFF', border: '1px solid #E2DED8' }}
          >
            {userData.pictureUrl ? (
              <img src={userData.pictureUrl} alt="" className="w-14 h-14 rounded-full object-cover" />
            ) : (
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold"
                style={{ background: '#4A7C59', color: '#fff' }}
              >
                {(userData.displayName || '?')[0]}
              </div>
            )}
            <p className="text-sm font-medium" style={{ color: '#2C2C2C' }}>{userData.displayName}</p>
            <div
              className="text-xs px-3 py-1.5 rounded-lg"
              style={{ color: '#4A7C59', background: '#E8F0EB' }}
            >
              首次登入，請建立用戶資料
            </div>
          </div>
          <button
            onClick={handleConfirm}
            className="w-full py-3 rounded-xl text-sm font-medium transition-all active:scale-95"
            style={{ background: '#4A7C59', color: '#fff' }}
          >
            建立資料
          </button>
        </div>
      )}

      {/* 底部版本 */}
      <p className="absolute bottom-6 text-xs" style={{ color: '#E2DED8' }}>v2.0</p>
    </div>
  )
}
