import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import FabAction, { PENCIL_ICON } from '../components/FabAction'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../services/api'

function formatBirthday(dateStr) {
  if (!dateStr) return '未設定'
  const parts = dateStr.split('-')
  if (parts.length >= 3) return `${parts[1]}/${parts[2]}`
  return dateStr
}

const INFO_ITEMS = [
  { label: '真實姓名', key: 'realName' },
  { label: 'Email', key: 'email' },
  { label: '電話號碼', key: 'phone' },
  { label: '生日', key: 'birthday', format: formatBirthday },
]

const STAR_COLORS = {
  '白星': { bg: '#F7F5F2', text: '#8A8680', border: '#E2DED8' },
  '綠星': { bg: '#E8F0EB', text: '#4A7C59', border: '#4A7C59' },
  '橙星': { bg: '#FFF3E0', text: '#E67E22', border: '#E67E22' },
  '紅星': { bg: '#FDECEA', text: '#C0392B', border: '#C0392B' },
  '紫星': { bg: '#F3E5F5', text: '#8E44AD', border: '#8E44AD' },
}

function parseCourses(str) {
  if (!str) return []
  return str.split(',').map(c => c.trim()).filter(c => c)
}

function parseVolunteers(str) {
  if (!str || typeof str !== 'string') return []
  try {
    const arr = JSON.parse(str)
    return Array.isArray(arr) ? arr.filter(r => r && (r.date || r.option)) : []
  } catch {
    return []
  }
}

const PENCIL_SVG = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)

const LOGOUT_SVG = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
)

const UPLOAD_SVG = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
)

const TABS = [
  { key: 'profile', label: '個人資料' },
  { key: 'stats', label: '用戶數據' },
  { key: 'financial', label: '用戶財力' },
]

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(v => !v)}
      className="relative w-10 h-[22px] rounded-full transition-colors"
      style={{ background: checked ? '#4A7C59' : '#E2DED8' }}
    >
      <span
        className="absolute top-[2px] left-[2px] w-[18px] h-[18px] rounded-full bg-white shadow transition-transform"
        style={{ transform: checked ? 'translateX(18px)' : 'translateX(0)' }}
      />
    </button>
  )
}

export default function Profile() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('profile')

  // 個人資料 tab
  const [hideProfile, setHideProfile] = useState(false)

  // 用戶財力 tab
  const [hideFinancial, setHideFinancial] = useState(false)
  const [hideDocuments, setHideDocuments] = useState(false)
  const [documents, setDocuments] = useState([])
  const [financialLoaded, setFinancialLoaded] = useState(false)

  useEffect(() => {
    if (activeTab === 'financial' && !financialLoaded && user?.lineId) {
      api.getFinancialList(user.lineId)
        .then(res => { if (res.success && res.data) setDocuments(res.data) })
        .catch(() => {})
        .finally(() => setFinancialLoaded(true))
    }
  }, [activeTab, financialLoaded, user?.lineId])

  const starLevel = user?.starLevel || '白星'
  const starColor = STAR_COLORS[starLevel] || STAR_COLORS['白星']
  const courses = parseCourses(user?.courseRecord)
  const volunteers = parseVolunteers(user?.volunteerRecords)

  const handleOpenDoc = (doc) => {
    if (doc.sheet_view_url) {
      window.open(doc.sheet_view_url, '_blank')
    } else {
      navigate(`/financial-preview?docId=${doc.id}&userId=${user.lineId}&filename=${encodeURIComponent(doc.original_filename)}`)
    }
  }

  const fabItemsByTab = {
    profile: [
      { label: '編輯資料', path: '/profile/edit', icon: PENCIL_SVG },
      { label: '登出', onClick: () => { logout(); navigate('/login') }, icon: LOGOUT_SVG },
    ],
    stats: [
      { label: '編輯數據', path: '/user-stats/edit', icon: PENCIL_SVG },
    ],
    financial: [
      { label: '上傳財力', path: '/financial-upload', icon: UPLOAD_SVG },
      { label: '選取/編輯', onClick: () => navigate('/financial/edit'), icon: PENCIL_SVG },
    ],
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F7F5F2' }}>
      <main className="flex-1 overflow-y-auto pt-14 pb-28 px-4">
        <h1 className="text-base font-semibold mt-4 mb-4" style={{ color: '#2C2C2C' }}>用戶資料</h1>

        {/* 用戶頭像卡（全 tab 共用） */}
        <section
          className="rounded-2xl p-4 shadow-sm mb-3 flex items-center gap-4"
          style={{ background: '#fff', border: '1px solid #E2DED8' }}
        >
          {user?.pictureUrl ? (
            <img src={user.pictureUrl} alt="" className="w-14 h-14 rounded-full object-cover shrink-0" />
          ) : (
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold shrink-0"
              style={{ background: '#4A7C59', color: '#fff' }}
            >
              {(user?.realName || '?')[0]}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold truncate" style={{ color: '#2C2C2C' }}>{user?.realName}</p>
            <p className="text-xs truncate" style={{ color: '#8A8680' }}>{user?.displayName}</p>
          </div>
          <div
            className="shrink-0 px-3 py-1 rounded-full text-xs font-bold"
            style={{ background: starColor.bg, color: starColor.text, border: `1.5px solid ${starColor.border}` }}
          >
            {starLevel}
          </div>
        </section>

        {/* Pill tabs */}
        <div className="mb-3">
          <div style={{ display: 'flex', background: '#EFEDE9', borderRadius: 20, padding: 3 }}>
            {TABS.map(tab => (
              <button
                key={tab.key}
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
                  color: activeTab === tab.key ? '#fff' : '#8A8680',
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── 個人資料 tab ── */}
        {activeTab === 'profile' && (
          <>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold" style={{ color: '#8A8680', letterSpacing: '0.06em' }}>基本資訊</h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs" style={{ color: '#8A8680' }}>隱藏</span>
                <Toggle checked={hideProfile} onChange={setHideProfile} />
              </label>
            </div>
            {!hideProfile && (
              <section>
                <div className="rounded-2xl shadow-sm overflow-hidden" style={{ background: '#fff', border: '1px solid #E2DED8' }}>
                  {INFO_ITEMS.map((item, idx) => {
                    const value = item.format ? item.format(user?.[item.key]) : user?.[item.key]
                    return (
                      <div
                        key={item.key}
                        className="flex items-center justify-between px-4 py-3.5"
                        style={{ borderBottom: idx < INFO_ITEMS.length - 1 ? '1px solid #E2DED8' : 'none' }}
                      >
                        <span className="text-sm" style={{ color: '#8A8680' }}>{item.label}</span>
                        <span className="text-sm font-medium" style={{ color: '#2C2C2C' }}>{value || '未設定'}</span>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}
          </>
        )}

        {/* ── 用戶數據 tab ── */}
        {activeTab === 'stats' && (
          <>
            <section className="rounded-2xl p-4 shadow-sm mb-3 flex items-center gap-4" style={{ background: '#fff', border: '1px solid #E2DED8' }}>
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: starColor.bg, color: starColor.text, border: `2px solid ${starColor.border}` }}
              >
                {starLevel}
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: '#2C2C2C' }}>目前星等</p>
                <p className="text-xs" style={{ color: '#8A8680' }}>{starLevel}</p>
              </div>
            </section>

            <section>
              <div className="rounded-2xl shadow-sm overflow-hidden" style={{ background: '#fff', border: '1px solid #E2DED8' }}>
                <div className="px-4 py-3.5" style={{ borderBottom: '1px solid #E2DED8' }}>
                  <p className="text-sm mb-2" style={{ color: '#8A8680' }}>課程紀錄</p>
                  {courses.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {courses.map(c => (
                        <span key={c} className="text-xs px-2.5 py-1 rounded-full" style={{ background: '#E8F0EB', color: '#4A7C59' }}>{c}</span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm font-medium" style={{ color: '#2C2C2C' }}>無</p>
                  )}
                </div>

                <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: '1px solid #E2DED8' }}>
                  <span className="text-sm" style={{ color: '#8A8680' }}>特斯拉出行加盟主</span>
                  <span className="text-sm font-medium" style={{ color: '#2C2C2C' }}>{user?.teslaFranchisee || '未填'}</span>
                </div>

                <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: '1px solid #E2DED8' }}>
                  <span className="text-sm shrink-0" style={{ color: '#8A8680' }}>團隊負責事項</span>
                  <span className="text-sm font-medium text-right ml-4" style={{ color: '#2C2C2C' }}>{user?.teamResponsibilities || '未填'}</span>
                </div>

                <div className="px-4 py-3.5">
                  <p className="text-sm mb-2" style={{ color: '#8A8680' }}>課程志工</p>
                  {volunteers.length > 0 ? (
                    <div className="flex flex-col gap-1.5">
                      {volunteers.map((r, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: '#EFEDE9', color: '#8A8680' }}>{r.date}</span>
                          <span className="text-sm font-medium" style={{ color: '#2C2C2C' }}>{r.option}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm font-medium" style={{ color: '#2C2C2C' }}>無</p>
                  )}
                </div>
              </div>
            </section>
          </>
        )}

        {/* ── 用戶財力 tab ── */}
        {activeTab === 'financial' && (
          <>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold" style={{ color: '#8A8680', letterSpacing: '0.06em' }}>財力資訊</h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs" style={{ color: '#8A8680' }}>隱藏</span>
                <Toggle checked={hideFinancial} onChange={setHideFinancial} />
              </label>
            </div>

            {!hideFinancial && (
              <section className="rounded-2xl p-4 shadow-sm mb-3 flex items-center justify-between" style={{ background: '#fff', border: '1px solid #E2DED8' }}>
                <span className="text-sm" style={{ color: '#8A8680' }}>財力金額</span>
                <span className="text-base font-bold" style={{ color: user?.financialAmount ? '#4A7C59' : '#8A8680' }}>
                  {user?.financialAmount || '無資料'}
                </span>
              </section>
            )}

            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold" style={{ color: '#8A8680', letterSpacing: '0.06em' }}>歷史上傳記錄</h2>
                <div className="flex items-center gap-3">
                  <span className="text-xs" style={{ color: '#8A8680' }}>共 {documents.length} 份</span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <span className="text-xs" style={{ color: '#8A8680' }}>隱藏</span>
                    <Toggle checked={hideDocuments} onChange={setHideDocuments} />
                  </label>
                </div>
              </div>
              {!hideDocuments && (
                <div className="flex flex-col gap-3">
                  {documents.map(doc => (
                    <div
                      key={doc.id}
                      className="relative overflow-hidden rounded-2xl p-4 shadow-sm transition-all active:scale-[0.98] cursor-pointer"
                      style={{ background: '#fff', border: '1px solid #E2DED8' }}
                      onClick={() => handleOpenDoc(doc)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#E8F0EB' }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4A7C59" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                            <line x1="16" y1="13" x2="8" y2="13"/>
                            <line x1="16" y1="17" x2="8" y2="17"/>
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: '#2C2C2C' }}>{doc.original_filename}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-xs" style={{ color: '#8A8680' }}>{doc.uploaded_at?.slice(0, 10)}</span>
                          </div>
                          {doc.comment && <p className="text-xs mt-1.5" style={{ color: '#8A8680' }}>{doc.comment}</p>}
                        </div>
                        <div className="flex items-center shrink-0 self-center">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8A8680" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6"/>
                          </svg>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <FabAction items={fabItemsByTab[activeTab]} fabIcon={PENCIL_ICON} />
    </div>
  )
}
