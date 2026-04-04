import { useState, useEffect, useCallback } from 'react'
import Header from '../components/Header'
import FabNav from '../components/FabNav'
import FabAction from '../components/FabAction'
import { useAuth } from '../contexts/AuthContext'
import { api, mapEvent } from '../services/api'

export default function Home() {
  const { user } = useAuth()
  const [activeFab, setActiveFab] = useState(null)
  const [todayEvents, setTodayEvents] = useState([])

  // 取得今日行程作為最新消息
  useEffect(() => {
    const today = new Date()
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    api.getEvents(dateStr, dateStr)
      .then(res => {
        if (res.success && res.data) {
          setTodayEvents(res.data.map(mapEvent))
        }
      })
      .catch(() => {})
  }, [])

  const handleNavOpen = useCallback(() => setActiveFab('nav'), [])
  const handleActionOpen = useCallback(() => setActiveFab('action'), [])

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F7F5F2' }}>
      <Header user={user} />

      <main className="flex-1 overflow-y-auto pt-16 pb-28 px-4">

        {/* 歡迎區塊 */}
        <section className="mt-4 mb-6 flex items-center gap-3">
          {user?.pictureUrl ? (
            <img src={user.pictureUrl} alt="" className="w-14 h-14 rounded-full object-cover shadow-sm" />
          ) : (
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold shadow-sm"
              style={{ background: '#4A7C59', color: '#fff' }}
            >
              {(user?.realName || '?')[0]}
            </div>
          )}
          <div>
            <p className="text-xs" style={{ color: '#8A8680' }}>歡迎回來</p>
            <p className="text-lg font-semibold" style={{ color: '#2C2C2C' }}>{user?.realName}</p>
          </div>
        </section>

        {/* 今日行程 */}
        <section>
          <h2 className="text-sm font-semibold mb-3" style={{ color: '#8A8680', letterSpacing: '0.06em' }}>
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

      <FabNav onOpen={handleNavOpen} />
      <FabAction onOpen={handleActionOpen} />
    </div>
  )
}
