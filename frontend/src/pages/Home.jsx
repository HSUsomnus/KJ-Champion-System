import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import FabAction from '../components/FabAction'
import { useAuth } from '../contexts/AuthContext'
import { api, mapEvent } from '../services/api'

// ── Inline SVG icons（UIDESIGN 禁止 emoji）──────────────────────────────────

function IconChat() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function IconDownload() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

// ── SystemLinkTile ──────────────────────────────────────────────────────────

function SystemLinkTile({ icon, label, subLabel, onClick, disabled, 'data-testid': testId }) {
  return (
    <button
      data-testid={testId}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        background: '#FFFFFF',
        border: '1px solid #E2DED8',
        borderRadius: 16,
        padding: '14px 8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'default' : 'pointer',
        transition: 'transform 0.1s',
      }}
    >
      <div style={{
        width: 44,
        height: 44,
        borderRadius: '50%',
        background: '#E8F0EB',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#4A7C59',
      }}>
        {icon}
      </div>
      <span style={{ fontSize: 12, fontWeight: 500, color: '#2C2C2C', textAlign: 'center', lineHeight: 1.3, whiteSpace: 'pre-line' }}>
        {label}
      </span>
      {subLabel && (
        <span style={{ fontSize: 11, color: '#8A8680', marginTop: -4 }}>{subLabel}</span>
      )}
    </button>
  )
}

// ── Home ────────────────────────────────────────────────────────────────────

export default function Home() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [todayEvents, setTodayEvents] = useState([])
  const [systemLinks, setSystemLinks] = useState({ lineAddFriendUrl: null, calendarAddUrl: null })
  const [pwaInstalled, setPwaInstalled] = useState(false)
  const [pwaDialog, setPwaDialog] = useState(null)   // null | '已安裝' | '不支援該瀏覽器，請使用 Chrome 或 Edge'
  const deferredPromptRef = useRef(null)

  useEffect(() => {
    const today = new Date()
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    api.getEvents(dateStr, dateStr)
      .then(res => { if (res.success && res.data) setTodayEvents(res.data.map(mapEvent)) })
      .catch(() => {})

    api.getSystemLinks()
      .then(res => { if (res.success && res.data) setSystemLinks(res.data) })
      .catch(() => {})

    setPwaInstalled(window.matchMedia('(display-mode: standalone)').matches)

    // [設計決策] 讀 main.jsx 預先攔截的 beforeinstallprompt
    // 因為該 event 在 React mount 前就觸發，useEffect 若自己監聽會 miss
    if (window.__pwaInstallPrompt) {
      deferredPromptRef.current = window.__pwaInstallPrompt
    }
    const handler = (e) => {
      e.preventDefault()
      deferredPromptRef.current = e
      window.__pwaInstallPrompt = e
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handlePwaInstall = () => {
    if (pwaInstalled) {
      setPwaDialog('已安裝')
      return
    }
    if (!deferredPromptRef.current) {
      const isMobile = window.matchMedia('(pointer: coarse)').matches
      setPwaDialog(isMobile ? '如果重新整理無效，不支援該瀏覽器，請使用其他瀏覽器' : '如果重新整理無效，不支援該瀏覽器，請使用 Chrome 或 Edge')
      return
    }
    deferredPromptRef.current.prompt()
    deferredPromptRef.current.userChoice.then(() => {
      deferredPromptRef.current = null
      window.__pwaInstallPrompt = null
    })
  }

  const fa = user?.financialAmount
  const hasFinancial = fa !== null && fa !== undefined && fa !== ''

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F7F5F2' }}>

      {/* PWA 資訊 dialog（Change 12 feedback 系統實作前的臨時方案，樣式按 UIDESIGN ConfirmDialog 規格） */}
      {pwaDialog && (
        <div
          onClick={() => setPwaDialog(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 60,
            background: 'rgba(44,44,44,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#FFFFFF',
              borderRadius: 16,
              padding: 24,
              maxWidth: 320,
              width: 'calc(100% - 48px)',
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.05)',
            }}
          >
            <p style={{
              fontSize: 14, fontWeight: 500, color: '#2C2C2C',
              textAlign: 'center', marginBottom: 24, lineHeight: 1.6,
            }}>
              {pwaDialog}
            </p>
            <button
              onClick={() => setPwaDialog(null)}
              style={{
                width: '100%',
                background: '#2C2C2C', color: '#FFFFFF',
                border: 'none', borderRadius: 16,
                padding: '14px 24px',
                fontSize: 16, fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              確認
            </button>
          </div>
        </div>
      )}
      <main className="flex-1 overflow-y-auto pt-14 pb-28 px-4">

        {/* 歡迎卡：左 頭像+名字，右 財力金額+上傳按鈕 */}
        <section className="mt-4 mb-5">
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E2DED8',
            borderRadius: 16,
            padding: 16,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            {/* 頭像 56px per UIDESIGN spec */}
            {user?.pictureUrl ? (
              <img src={user.pictureUrl} alt="" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            ) : (
              <div style={{
                width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
                background: '#4A7C59', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, fontWeight: 700,
              }}>
                {(user?.realName || '?')[0]}
              </div>
            )}

            {/* 名字 */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 12, color: '#8A8680', marginBottom: 2 }}>歡迎回來</p>
              <p style={{ fontSize: 16, fontWeight: 600, color: '#2C2C2C', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.realName}
              </p>
            </div>

            {/* 財力區 */}
            <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 11, color: '#8A8680', marginBottom: 2 }}>財力金額</p>
                <p
                  data-testid="financial-amount"
                  style={{ fontSize: 14, fontWeight: 600, color: hasFinancial ? '#2C2C2C' : '#8A8680' }}
                >
                  {hasFinancial ? `$${Number(fa).toLocaleString()}` : '尚未填寫'}
                </p>
              </div>
              <button
                onClick={() => navigate('/financial-upload')}
                style={{
                  background: '#4A7C59',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 12,
                  padding: '5px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                上傳財力
              </button>
            </div>
          </div>
        </section>

        {/* 系統連結區 */}
        <section className="mb-5">
          <h2 style={{ fontSize: 14, fontWeight: 600, color: '#8A8680', letterSpacing: '0.06em', marginBottom: 12 }}>
            系統連結
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {systemLinks.lineAddFriendUrl && (
              <SystemLinkTile
                data-testid="link-line"
                icon={<IconChat />}
                label={`LINE\n事業部小幫手`}
                onClick={() => window.open(systemLinks.lineAddFriendUrl, '_blank')}
              />
            )}
            {systemLinks.calendarAddUrl && (
              <SystemLinkTile
                data-testid="link-calendar"
                icon={<IconCalendar />}
                label={`康九冠軍\ngoogle 日曆`}
                onClick={() => window.open(systemLinks.calendarAddUrl, '_blank')}
              />
            )}
            <SystemLinkTile
              data-testid="link-pwa"
              icon={<IconDownload />}
              label={`安裝到\n手機/PC`}
              subLabel={pwaInstalled ? '已安裝' : undefined}
              onClick={handlePwaInstall}
            />
          </div>
        </section>

        {/* 今日行程 */}
        <section>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: '#8A8680', letterSpacing: '0.06em', marginBottom: 12 }}>
            今日行程
          </h2>
          <div className="flex flex-col gap-3">
            {todayEvents.length === 0 ? (
              <div style={{
                background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 16,
                padding: '24px 16px', textAlign: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}>
                <p style={{ fontSize: 14, color: '#8A8680' }}>今日沒有行程</p>
              </div>
            ) : (
              todayEvents.map(item => (
                <div
                  key={item.id}
                  style={{
                    background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 16,
                    padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <p style={{ fontSize: 14, fontWeight: 500, color: '#2C2C2C' }}>{item.title}</p>
                    <span style={{ fontSize: 12, color: '#8A8680', flexShrink: 0 }}>
                      {item.allDay ? '整日' : item.time || ''}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: '#8A8680', marginTop: 6 }}>{item.type}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      <FabAction />
    </div>
  )
}
