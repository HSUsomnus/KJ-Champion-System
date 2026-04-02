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
    window.location.href = '/api/auth/line'
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
        className="w-36 object-contain mb-4"
      />

      {/* 標題 */}
      <h1
        className="text-xl font-semibold mb-10"
        style={{ color: '#2C2C2C', letterSpacing: '0.06em' }}
      >
        康九冠軍小幫手系統
      </h1>

      {authState === 'idle' && (
        <button
          onClick={handleLineLogin}
          className="w-full max-w-xs py-4 rounded-2xl text-base font-semibold shadow-md transition-all active:scale-95"
          style={{ background: '#06C755', color: '#fff', letterSpacing: '0.04em' }}
        >
          LINE 登入驗證
        </button>
      )}

      {authState === 'loading' && (
        <div className="text-sm" style={{ color: '#8A8680' }}>驗證中...</div>
      )}

      {authState === 'has-profile' && userData && (
        <div className="w-full max-w-xs flex flex-col items-center gap-4">
          <div className="text-center">
            <p className="text-lg font-semibold" style={{ color: '#2C2C2C' }}>{userData.realName}</p>
            <p className="text-sm mt-1" style={{ color: '#8A8680' }}>{userData.displayName}</p>
          </div>
          <button
            onClick={handleConfirm}
            className="w-full py-4 rounded-2xl text-base font-semibold shadow-md transition-all active:scale-95"
            style={{ background: '#2C2C2C', color: '#fff' }}
          >
            確認進入
          </button>
        </div>
      )}

      {authState === 'no-profile' && userData && (
        <div className="w-full max-w-xs flex flex-col items-center gap-4">
          <div className="text-center">
            <p className="text-base font-medium" style={{ color: '#2C2C2C' }}>{userData.displayName}</p>
            <p className="text-sm mt-2 px-4 py-2 rounded-xl" style={{ color: '#4A7C59', background: '#E8F0EB' }}>
              請建立用戶資料
            </p>
          </div>
          <button
            onClick={handleConfirm}
            className="w-full py-4 rounded-2xl text-base font-semibold shadow-md transition-all active:scale-95"
            style={{ background: '#2C2C2C', color: '#fff' }}
          >
            確認進入
          </button>
        </div>
      )}
    </div>
  )
}
