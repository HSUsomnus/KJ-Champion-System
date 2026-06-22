import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import FabAction from '../components/FabAction'
import { useAuth } from '../contexts/AuthContext'
import { api, mapEvent } from '../services/api'

export default function Home() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [todayEvents, setTodayEvents] = useState([])
  const [systemLinks, setSystemLinks] = useState({ lineAddFriendUrl: null, calendarAddUrl: null })
  const [pwaInstalled, setPwaInstalled] = useState(false)
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

    const handler = (e) => { e.preventDefault(); deferredPromptRef.current = e }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handlePwaInstall = () => {
    if (!deferredPromptRef.current) return
    deferredPromptRef.current.prompt()
    deferredPromptRef.current.userChoice.then(() => { deferredPromptRef.current = null })
  }

  const fa = user?.financialAmount
  const hasFinancial = fa !== null && fa !== undefined && fa !== ''

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F7F5F2' }}>
      <main className="flex-1 overflow-y-auto pt-14 pb-28 px-4">

        {/* 歡迎卡：左 頭像+名字，右 財力金額+上傳按鈕 */}
        <section className="mt-4 mb-5">
          <div
            className="rounded-2xl p-4 shadow-sm flex items-center gap-3"
            style={{ background: '#fff', border: '1px solid #E2DED8' }}
          >
            {user?.pictureUrl ? (
              <img src={user.pictureUrl} alt="" className="w-12 h-12 rounded-full object-cover shrink-0 shadow-sm" />
            ) : (
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0 shadow-sm"
                style={{ background: '#4A7C59', color: '#fff' }}
              >
                {(user?.realName || '?')[0]}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs" style={{ color: '#8A8680' }}>歡迎回來</p>
              <p className="text-base font-semibold truncate" style={{ color: '#2C2C2C' }}>{user?.realName}</p>
            </div>
            <div className="shrink-0 flex flex-col items-end gap-1.5">
              <div className="text-right">
                <p className="text-xs" style={{ color: '#8A8680' }}>財力金額</p>
                <p
                  className="text-sm font-semibold"
                  data-testid="financial-amount"
                  style={{ color: hasFinancial ? '#2C2C2C' : '#8A8680' }}
                >
                  {hasFinancial ? `$${Number(fa).toLocaleString()}` : '尚未填寫'}
                </p>
              </div>
              <button
                onClick={() => navigate('/financial-upload')}
                className="text-xs px-3 py-1 rounded-full font-medium"
                style={{ background: '#4A7C59', color: '#fff' }}
              >
                上傳財力
              </button>
            </div>
          </div>
        </section>

        {/* 系統連結區 */}
        <section className="mb-5">
          <h2 className="text-xs font-semibold mb-3" style={{ color: '#8A8680', letterSpacing: '0.06em' }}>
            系統連結
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {systemLinks.lineAddFriendUrl && (
              <button
                data-testid="link-line"
                onClick={() => window.open(systemLinks.lineAddFriendUrl, '_blank')}
                className="rounded-2xl p-4 flex flex-col items-center gap-2 shadow-sm"
                style={{ background: '#D8F5E5', border: '1px solid #B8E8CC' }}
              >
                <span className="text-2xl">💬</span>
                <span className="text-xs font-medium" style={{ color: '#2C2C2C' }}>LINE Bot</span>
              </button>
            )}

            {systemLinks.calendarAddUrl && (
              <button
                data-testid="link-calendar"
                onClick={() => window.open(systemLinks.calendarAddUrl, '_blank')}
                className="rounded-2xl p-4 flex flex-col items-center gap-2 shadow-sm"
                style={{ background: '#DEEAF6', border: '1px solid #BDD4EC' }}
              >
                <span className="text-2xl">📅</span>
                <span className="text-xs font-medium" style={{ color: '#2C2C2C' }}>行事曆</span>
              </button>
            )}

            <button
              data-testid="link-pwa"
              onClick={handlePwaInstall}
              disabled={pwaInstalled}
              className="rounded-2xl p-4 flex flex-col items-center gap-1 shadow-sm"
              style={{
                background: '#E8F0EB',
                border: '1px solid #C8DDD0',
                opacity: pwaInstalled ? 0.45 : 1,
                cursor: pwaInstalled ? 'default' : 'pointer',
              }}
            >
              <span className="text-2xl">📲</span>
              <span className="text-xs font-medium" style={{ color: '#2C2C2C' }}>安裝 App</span>
              {pwaInstalled && (
                <span className="text-xs" style={{ color: '#8A8680' }}>已安裝</span>
              )}
            </button>
          </div>
        </section>

        {/* 今日行程 */}
        <section>
          <h2 className="text-xs font-semibold mb-3" style={{ color: '#8A8680', letterSpacing: '0.06em' }}>
            今日行程
          </h2>
          <div className="flex flex-col gap-3">
            {todayEvents.length === 0 ? (
              <div className="rounded-2xl p-6 shadow-sm text-center" style={{ background: '#fff', border: '1px solid #E2DED8' }}>
                <p className="text-sm" style={{ color: '#8A8680' }}>今日沒有行程</p>
              </div>
            ) : (
              todayEvents.map(item => (
                <div
                  key={item.id}
                  className="rounded-2xl p-4 shadow-sm"
                  style={{ background: '#fff', border: '1px solid #E2DED8' }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium" style={{ color: '#2C2C2C' }}>{item.title}</p>
                    <span className="text-xs shrink-0" style={{ color: '#8A8680' }}>
                      {item.allDay ? '整日' : item.time || ''}
                    </span>
                  </div>
                  <p className="text-xs mt-1.5" style={{ color: '#8A8680' }}>{item.type}</p>
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
