import { useEffect, useState } from 'react'
import { getAdminToken, setAdminToken, clearAdminToken } from '../../services/adminSession'
import { getAdminForms, getAdminSubmissions, getAdminAttendance } from '../../services/surveyApi'
import FormsSidebar from './admin/FormsSidebar'
import SubmissionsTable from './admin/SubmissionsTable'
import AttendanceRoster from './admin/AttendanceRoster'
import ExportButtons from './admin/ExportButtons'
import CopyLinkButton from './admin/CopyLinkButton'
import FormBuilder from './admin/FormBuilder'
import ConfirmLeaveDialog from '../../components/ConfirmLeaveDialog'

const TABS = [
  { key: 'table', label: '送出紀錄' },
  { key: 'attendance', label: '未填名冊' },
]

// [設計決策] 後台登入改為 kj-survey-server 自己的 LINE OAuth（Change 20 v4，D-A），
// 不再沿用主系統 /api/auth/line-login。舊版曾嘗試自建 callback + cookie session，
// 因 LINE 導回網域跟前端網域對不上、cookie 設錯地方，一直失敗，才改沿用主系統登入
// （見 git 歷史）。這次不會撞回同一個坑：JWT 透過 URL fragment（#token=）帶回前端，
// 存進記憶體（非 cookie），fragment 不會被瀏覽器送給伺服器，沒有網域/cookie 的問題。
// 若要修改：確認不會重新引入「cookie session」的設計
const LINE_LOGIN_URL = '/survey-api/admin-auth/line-login'

const AUTH_ERROR_MESSAGES = {
  missing_params: '登入流程中斷，請重新登入',
  invalid_state: '登入逾時或狀態已失效，請重新登入',
  token_exchange_failed: 'LINE 登入驗證失敗，請重新登入',
  verify_failed: 'LINE 登入驗證失敗，請重新登入',
  forbidden: '此 LINE 帳號沒有後台權限，請聯繫負責人確認角色設定',
}

export default function SurveyAdmin() {
  const [status, setStatus] = useState('checking') // checking | no-user | forbidden | ok
  const [authError, setAuthError] = useState(null)
  const [forms, setForms] = useState([])
  const [selectedFormId, setSelectedFormId] = useState(null)
  const [activeTab, setActiveTab] = useState('table')
  const [creatingNew, setCreatingNew] = useState(false)
  const [submissions, setSubmissions] = useState([])
  const [attendance, setAttendance] = useState(null)
  const [dashLoading, setDashLoading] = useState(false)
  const [dashError, setDashError] = useState('')
  const [builderDirty, setBuilderDirty] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)


  // 讀 line-callback 導回的 #token=<jwt> → 存記憶體 → 清 fragment；
  // authError query（登入失敗）→ 顯示對應訊息 → 清 query。兩者互斥，均只在掛載時處理一次。
  useEffect(() => {
    const hash = window.location.hash
    if (hash.startsWith('#token=')) {
      setAdminToken(decodeURIComponent(hash.slice('#token='.length)))
      window.history.replaceState({}, '', window.location.pathname + window.location.search)
    }

    const params = new URLSearchParams(window.location.search)
    const errorCode = params.get('authError')
    if (errorCode) {
      window.history.replaceState({}, '', window.location.pathname)
    }

    if (getAdminToken()) {
      setStatus('ok')
    } else if (errorCode === 'forbidden') {
      setAuthError(AUTH_ERROR_MESSAGES.forbidden)
      setStatus('forbidden')
    } else if (errorCode) {
      setAuthError(AUTH_ERROR_MESSAGES[errorCode] || '登入失敗，請重新登入')
      setStatus('no-user')
    } else {
      setStatus('no-user')
    }
  }, [])

  // 登入完成後載入表單清單，預設選第一筆；token 過期/被撤權（401/403）視同登出。
  useEffect(() => {
    if (status !== 'ok') return
    getAdminForms()
      .then((res) => {
        const list = res.data || []
        setForms(list)
        setSelectedFormId((prev) => prev ?? list[0]?.id ?? null)
      })
      .catch((err) => {
        if (err.status === 401) {
          clearAdminToken()
          setStatus('no-user')
        } else if (err.status === 403) {
          setAuthError(AUTH_ERROR_MESSAGES.forbidden)
          setStatus('forbidden')
        } else {
          setDashError(err.message || '載入表單清單失敗')
        }
      })
  }, [status])

  useEffect(() => {
    if (!selectedFormId) return
    setDashLoading(true)
    setDashError('')
    Promise.all([getAdminSubmissions(selectedFormId), getAdminAttendance(selectedFormId)])
      .then(([submissionsRes, attendanceRes]) => {
        setSubmissions(submissionsRes.data || [])
        setAttendance(attendanceRes.data || null)
      })
      .catch((err) => {
        if (err.status === 401) {
          clearAdminToken()
          setStatus('no-user')
        } else {
          setDashError(err.message || '載入資料失敗')
        }
      })
      .finally(() => setDashLoading(false))
  }, [selectedFormId])

  // 十二節 12.2：切換表單/新增/登出都算「離開目前建立器」，草稿有未儲存變更時要先攔截確認
  const guardedAction = (action) => {
    if (builderDirty) {
      setPendingAction(() => action)
    } else {
      action()
    }
  }
  const cancelPendingAction = () => setPendingAction(null)
  const confirmPendingAction = () => {
    pendingAction?.()
    setPendingAction(null)
    setBuilderDirty(false)
  }

  const handleLogout = () => guardedAction(() => {
    clearAdminToken()
    setAuthError(null)
    setStatus('no-user')
  })

  const handleSelectForm = (id) => guardedAction(() => {
    setCreatingNew(false)
    setSelectedFormId(id)
  })

  const handleCreateNew = () => guardedAction(() => {
    setCreatingNew(true)
    setSelectedFormId(null)
  })

  // 建立/儲存草稿/發佈成功後，把回傳的表單塞回清單並選取它；新表單就新增一筆，
  // 既有表單（patch/publish）就地覆蓋，兩種情境共用同一段合併邏輯。
  const handleFormSaved = (savedForm) => {
    setCreatingNew(false)
    setForms((prev) => {
      const exists = prev.some((f) => f.id === savedForm.id)
      return exists ? prev.map((f) => (f.id === savedForm.id ? savedForm : f)) : [...prev, savedForm]
    })
    setSelectedFormId(savedForm.id)
  }

  const selectedForm = forms.find((f) => f.id === selectedFormId)
  const builderActive = creatingNew || selectedForm?.status === 'draft'

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

          {authError && (
            <p className="text-xs mb-4 text-center" style={{ color: '#C0392B' }}>
              {authError}
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
    <div className="p-4 md:p-8" style={desktopPageStyle}>
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
          {dashError && (
            <p style={{ fontSize: 13, color: '#C0392B', marginBottom: 12 }}>{dashError}</p>
          )}

          <div className="flex flex-col md:flex-row gap-4 md:gap-6">
            <FormsSidebar
              forms={forms}
              selectedId={creatingNew ? null : selectedFormId}
              onSelect={handleSelectForm}
              onCreateNew={handleCreateNew}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              {!builderActive && selectedForm && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', background: '#EFEDE9', borderRadius: 20, padding: 3, maxWidth: 280 }}>
                    {TABS.map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveTab(tab.key)}
                        style={{
                          flex: 1,
                          textAlign: 'center',
                          fontSize: 12,
                          fontWeight: activeTab === tab.key ? 500 : 400,
                          padding: '6px 4px',
                          borderRadius: 16,
                          border: 'none',
                          cursor: 'pointer',
                          background: activeTab === tab.key ? '#4A7C59' : 'transparent',
                          color: activeTab === tab.key ? '#fff' : '#2C2C2C',
                          transition: 'background 0.15s, color 0.15s',
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <CopyLinkButton token={selectedForm.token} />
                    <ExportButtons formId={selectedForm.id} />
                  </div>
                </div>
              )}

              {builderActive && (
                <FormBuilder
                  key={creatingNew ? 'new' : selectedForm?.id}
                  form={creatingNew ? null : selectedForm}
                  onSaved={handleFormSaved}
                  onDirtyChange={setBuilderDirty}
                />
              )}
              {!builderActive && dashLoading && (
                <p style={{ fontSize: 13, color: '#8A8680' }}>載入中...</p>
              )}
              {!builderActive && !dashLoading && selectedForm && activeTab === 'table' && (
                <SubmissionsTable form={selectedForm} submissions={submissions} />
              )}
              {!builderActive && !dashLoading && selectedForm && activeTab === 'attendance' && attendance && (
                <AttendanceRoster attendance={attendance} />
              )}
              {!builderActive && !dashLoading && !selectedForm && forms.length === 0 && (
                <p style={{ fontSize: 13, color: '#8A8680' }}>尚無表單，請先到建立器新增一份</p>
              )}
            </div>
          </div>
        </div>
      </div>
      <ConfirmLeaveDialog
        blocker={pendingAction ? { state: 'blocked', reset: cancelPendingAction, proceed: confirmPendingAction } : null}
      />
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

// 已登入後的桌機版面：不置中限寬 448，撐開到 1200px，給表格/篩選/側邊欄空間；
// padding 響應式縮小（十二節 12.6：360-375px 手機不得有非必要水平捲動）
const desktopPageStyle = {
  minHeight: '100svh',
  background: '#F7F5F2',
  display: 'flex',
  justifyContent: 'center',
  overscrollBehavior: 'none',
}

const cardStyle = {
  background: '#FFFFFF',
  border: '1px solid #E2DED8',
  borderRadius: 16,
  padding: 16,
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
}
