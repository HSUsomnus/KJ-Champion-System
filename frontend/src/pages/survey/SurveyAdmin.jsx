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
    <div style={pageStyle}>
      <div style={{ width: '100%', maxWidth: 448 }}>
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

const cardStyle = {
  background: '#FFFFFF',
  border: '1px solid #E2DED8',
  borderRadius: 16,
  padding: 16,
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
}
