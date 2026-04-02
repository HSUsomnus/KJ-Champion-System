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

      // 儲存至 localStorage
      localStorage.setItem('lineUserId', userId)
      localStorage.setItem('lineDisplayName', displayName || '')
      localStorage.setItem('linePictureUrl', pictureUrl || '')

      // 清除 URL 參數
      window.history.replaceState({}, '', '/login')

      // 查詢用戶資料
      api.getProfile()
        .then(res => {
          if (res.success && res.data) {
            const m = mapMember(res.data)
            setUserData({ ...m, lineId: userId, displayName: displayName || m.displayName, pictureUrl: pictureUrl || m.pictureUrl })
            setAuthState('has-profile')
          }
        })
        .catch(err => {
          // 404 = 未註冊
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
      // 同步頭像
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
        className="text-xl font-semibold mb-2"
        style={{ color: '#2C2C2C', letterSpacing: '0.06em' }}
      >
        康九冠軍小幫手系統
      </h1>

      {/* 副標題 */}
      <p className="text-xs mb-10" style={{ color: '#8A8680' }}>
        KJ Champion System
      </p>

      {authState === 'idle' && (
        <button
          onClick={handleLineLogin}
          className="w-full max-w-xs py-4 rounded-2xl text-base font-semibold shadow-sm transition-all active:scale-95"
          style={{ background: '#06C755', color: '#fff', letterSpacing: '0.04em' }}
        >
          LINE 登入驗證
        </button>
      )}

      {authState === 'loading' && (
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-10 h-10 rounded-full border-3 border-t-transparent animate-spin"
            style={{ borderColor: '#E2DED8', borderTopColor: 'transparent' }}
          />
          <p className="text-sm" style={{ color: '#8A8680' }}>驗證中...</p>
        </div>
      )}

      {authState === 'has-profile' && userData && (
        <div className="w-full max-w-xs flex flex-col items-center gap-5">
          {/* 用戶資訊卡片 */}
          <div
            className="w-full rounded-2xl p-5 flex flex-col items-center gap-3 shadow-sm"
            style={{ background: '#FFFFFF', border: '1px solid #E2DED8' }}
          >
            {userData.pictureUrl ? (
              <img src={userData.pictureUrl} alt="" className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
                style={{ background: '#4A7C59', color: '#fff' }}
              >
                {(userData.realName || userData.displayName || '?')[0]}
              </div>
            )}
            <div className="text-center">
              <p className="text-lg font-semibold" style={{ color: '#2C2C2C' }}>{userData.realName || userData.displayName}</p>
              {userData.realName && userData.displayName && userData.realName !== userData.displayName && (
                <p className="text-xs mt-1" style={{ color: '#8A8680' }}>{userData.displayName}</p>
              )}
            </div>
          </div>
          <button
            onClick={handleConfirm}
            className="w-full py-4 rounded-2xl text-base font-semibold shadow-sm transition-all active:scale-95"
            style={{ background: '#2C2C2C', color: '#fff' }}
          >
            確認進入
          </button>
        </div>
      )}

      {authState === 'no-profile' && userData && (
        <div className="w-full max-w-xs flex flex-col items-center gap-5">
          {/* 用戶資訊卡片 */}
          <div
            className="w-full rounded-2xl p-5 flex flex-col items-center gap-3 shadow-sm"
            style={{ background: '#FFFFFF', border: '1px solid #E2DED8' }}
          >
            {userData.pictureUrl ? (
              <img src={userData.pictureUrl} alt="" className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
                style={{ background: '#4A7C59', color: '#fff' }}
              >
                {(userData.displayName || '?')[0]}
              </div>
            )}
            <p className="text-base font-medium" style={{ color: '#2C2C2C' }}>{userData.displayName}</p>
            <div
              className="text-xs px-4 py-2 rounded-xl"
              style={{ color: '#4A7C59', background: '#E8F0EB' }}
            >
              首次登入，請建立用戶資料
            </div>
          </div>
          <button
            onClick={handleConfirm}
            className="w-full py-4 rounded-2xl text-base font-semibold shadow-sm transition-all active:scale-95"
            style={{ background: '#2C2C2C', color: '#fff' }}
          >
            建立資料
          </button>
        </div>
      )}

      {/* 底部裝飾 */}
      <div className="absolute bottom-6">
        <p className="text-xs" style={{ color: '#E2DED8' }}>v2.0</p>
      </div>
    </div>
  )
}
