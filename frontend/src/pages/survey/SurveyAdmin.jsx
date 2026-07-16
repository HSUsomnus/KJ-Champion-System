import { useEffect, useState } from 'react'
import { getAdminMe } from '../../services/surveyApi'

// [設計決策] 登入沿用主系統既有的 /api/auth/line-login（見 pages/Login.jsx），
// 不自己做 OAuth 流程。原本自建的 callback + cookie session 因為 LINE 導回網域
// 跟前端網域對不上、cookie 設錯地方，一直失敗；主系統這套已經穩定在跑。
// 差異：這裡的登入狀態跟主系統共用同一個 localStorage lineUserId，屬永久登入
// （不會因為關分頁就登出），跟原規劃「關頁即失效」不同，但後台權限仍每次向
// 後端查角色，不是前端說了算。
const LINE_LOGIN_URL = '/api/auth/line-login?returnUrl=/admin'

export default function SurveyAdmin() {
  const [status, setStatus] = useState('checking') // checking | no-user | forbidden | ok
  const [admin, setAdmin] = useState(null)

  // 後台是桌機優先（給管理者在電腦上看資料/篩選/匯出），跟全站手機優先的
  // width=device-width 相反。掛載時把 viewport 換成固定寬度，手機開會整頁縮小顯示，
  // 而不是被硬擠成手機版面；離開頁面時還原，不影響其他頁面。
  useEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]')
    const original = meta?.getAttribute('content')
    meta?.setAttribute('content', 'width=1280')
    return () => {
      if (original) meta?.setAttribute('content', original)
    }
  }, [])

  // 檢查 URL 是否帶有主系統 OAuth 回調參數（比照 pages/Login.jsx 的處理方式）
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const userId = params.get('userId')
    if (userId) {
      localStorage.setItem('lineUserId', userId)
      localStorage.setItem('lineDisplayName', params.get('displayName') || '')
      localStorage.setItem('linePictureUrl', params.get('pictureUrl') || '')
      window.history.replaceState({}, '', '/admin')
    }
  }, [])

  useEffect(() => {
    if (!localStorage.getItem('lineUserId')) {
      setStatus('no-user')
      return
    }
    getAdminMe()
      .then((res) => {
        setAdmin(res.data)
        setStatus('ok')
      })
      .catch((err) => {
        setStatus(err.status === 403 ? 'forbidden' : 'no-user')
      })
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('lineUserId')
    localStorage.removeItem('lineDisplayName')
    localStorage.removeItem('linePictureUrl')
    setAdmin(null)
    setStatus('no-user')
  }

  if (status === 'checking') {
    return (
      <div style={pageStyle}>
        <p style={{ color: '#8A8680', fontSize: 14 }}>載入中...</p>
      </div>
    )
  }

  if (status === 'no-user' || status === 'forbidden') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: '#F7F5F2' }}>
        <div className="w-full flex flex-col items-center px-6" style={{ maxWidth: 448 }}>
          <img src="/康九_logo.png" alt="KJ Champion" className="w-28 object-contain mb-3" />

          <h1 className="text-xl font-semibold mb-1" style={{ color: '#2C2C2C', letterSpacing: '0.06em' }}>
            康九冠軍調查後台
          </h1>
          <p className="text-xs mb-8" style={{ color: '#8A8680' }}>
            僅限管理者 / 負責人 / 開發者
          </p>

          {status === 'forbidden' && (
            <p className="text-xs mb-4 text-center" style={{ color: '#C0392B' }}>
              此 LINE 帳號沒有後台權限，請聯繫負責人確認角色設定
            </p>
          )}

          <div className="w-full max-w-xs">
            {status === 'forbidden' ? (
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all active:scale-95"
                style={{ background: '#4A7C59', color: '#fff' }}
              >
                切換帳號
              </button>
            ) : (
              <a
                href={LINE_LOGIN_URL}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all active:scale-95"
                style={{ background: '#4A7C59', color: '#fff', textDecoration: 'none' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
                LINE 登入驗證
              </a>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={desktopPageStyle}>
      <div style={{ width: '100%', maxWidth: 1200 }}>
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h1 style={{ fontSize: 20, fontWeight: 600, color: '#2C2C2C', margin: 0 }}>
              調查表單後台
            </h1>
            <button
              type="button"
              onClick={handleLogout}
              style={{
                padding: '8px 16px',
                borderRadius: 16,
                border: '1.5px solid #E2DED8',
                background: '#FFFFFF',
                color: '#8A8680',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              登出
            </button>
          </div>
          <p style={{ fontSize: 12, color: '#8A8680' }}>身分：{admin.role}</p>
          <p style={{ fontSize: 14, color: '#2C2C2C', marginTop: 16 }}>
            資料檢視、未填名冊、匯出、表單建立器功能開發中。
          </p>
        </div>
      </div>
    </div>
  )
}

const pageStyle = {
  minHeight: '100svh',
  background: '#F7F5F2',
  display: 'flex',
  justifyContent: 'center',
  padding: '32px 16px',
  overscrollBehavior: 'none',
}

// 已登入後的桌機版面：不置中限寬 448，撐開到 1200px，給表格/篩選/側邊欄空間
const desktopPageStyle = {
  minHeight: '100svh',
  background: '#F7F5F2',
  display: 'flex',
  justifyContent: 'center',
  padding: '32px',
  overscrollBehavior: 'none',
}

const cardStyle = {
  background: '#FFFFFF',
  border: '1px solid #E2DED8',
  borderRadius: 16,
  padding: 16,
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
}
