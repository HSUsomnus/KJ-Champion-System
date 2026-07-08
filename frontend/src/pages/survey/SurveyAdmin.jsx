import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getAdminMe, adminLogout, ADMIN_LOGIN_URL } from '../../services/surveyApi'

const AUTH_ERROR_MESSAGES = {
  forbidden: '此 LINE 帳號沒有後台權限，請聯繫負責人確認角色設定',
  missing_code: '登入失敗，請重新嘗試',
  server_error: '登入失敗，請稍後再試',
}

export default function SurveyAdmin() {
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [admin, setAdmin] = useState(null)

  // [設計決策] 後台是桌機優先（給管理者在電腦上看資料/篩選/匯出），跟全站手機優先的
  // width=device-width 相反。掛載時把 viewport 換成固定寬度，手機開會整頁縮小顯示，
  // 而不是被硬擠成手機版面；離開頁面時還原，不影響其他頁面。
  // 若要修改：確認 index.html 的預設 viewport 內容沒有跟著被永久改掉
  useEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]')
    const original = meta?.getAttribute('content')
    meta?.setAttribute('content', 'width=1280')
    return () => {
      if (original) meta?.setAttribute('content', original)
    }
  }, [])

  useEffect(() => {
    getAdminMe()
      .then((res) => setAdmin(res.data))
      .catch(() => setAdmin(null))
      .finally(() => setLoading(false))
  }, [])

  const handleLogout = async () => {
    await adminLogout()
    setAdmin(null)
  }

  const authError = searchParams.get('authError')

  if (loading) {
    return (
      <div style={pageStyle}>
        <p style={{ color: '#8A8680', fontSize: 14 }}>載入中...</p>
      </div>
    )
  }

  if (!admin) {
    return (
      <div style={pageStyle}>
        <div style={{ width: '100%', maxWidth: 448 }}>
          <div style={cardStyle}>
            <h1 style={{ fontSize: 20, fontWeight: 600, color: '#2C2C2C', margin: '0 0 8px', textAlign: 'center' }}>
              後台登入
            </h1>
            <p style={{ fontSize: 12, color: '#8A8680', margin: '0 0 20px', textAlign: 'center' }}>
              僅限管理者 / 負責人 / 開發者
            </p>
            {authError && (
              <p style={{ fontSize: 12, color: '#C0392B', marginBottom: 16, textAlign: 'center' }}>
                {AUTH_ERROR_MESSAGES[authError] || '登入失敗，請重新嘗試'}
              </p>
            )}
            <a
              href={ADMIN_LOGIN_URL}
              style={{
                display: 'block',
                textAlign: 'center',
                padding: '14px 24px',
                borderRadius: 16,
                background: '#06C755',
                color: '#FFFFFF',
                fontSize: 16,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              使用 LINE 登入
            </a>
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

// 已登入後的桌機版面：不置中限寬 448，左對齊撐開到 1200px，給表格/篩選/側邊欄空間
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
