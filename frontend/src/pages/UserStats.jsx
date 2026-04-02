import { useState, useCallback } from 'react'
import Header from '../components/Header'
import FabNav from '../components/FabNav'
import FabAction, { PENCIL_ICON } from '../components/FabAction'
import { useAuth } from '../contexts/AuthContext'

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

export default function UserStats() {
  const { user } = useAuth()
  const [activeFab, setActiveFab] = useState(null)

  const starLevel = user?.starLevel || '白星'
  const starColor = STAR_COLORS[starLevel] || STAR_COLORS['白星']
  const courses = parseCourses(user?.courseRecord)
  const volunteers = parseVolunteers(user?.volunteerRecords)

  const fabItems = [
    {
      label: '編輯數據',
      path: '/user-stats/edit',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      ),
    },
  ]

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F7F5F2' }}>
      <Header user={user} />

      <main className="flex-1 overflow-y-auto pt-16 pb-28 px-4">
        <h1 className="text-base font-semibold mt-4 mb-4" style={{ color: '#2C2C2C' }}>用戶數據</h1>

        {/* 星等 */}
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

        {/* 資料列表 */}
        <section>
          <div className="rounded-2xl shadow-sm overflow-hidden" style={{ background: '#fff', border: '1px solid #E2DED8' }}>
            {/* 課程紀錄 */}
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

            {/* 特斯拉加盟主 */}
            <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: '1px solid #E2DED8' }}>
              <span className="text-sm" style={{ color: '#8A8680' }}>特斯拉出行加盟主</span>
              <span className="text-sm font-medium" style={{ color: '#2C2C2C' }}>{user?.teslaFranchisee || '未填'}</span>
            </div>

            {/* 團隊負責事項 */}
            <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: '1px solid #E2DED8' }}>
              <span className="text-sm shrink-0" style={{ color: '#8A8680' }}>團隊負責事項</span>
              <span className="text-sm font-medium text-right ml-4" style={{ color: '#2C2C2C' }}>{user?.teamResponsibilities || '未填'}</span>
            </div>

            {/* 課程志工 */}
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
      </main>

      <FabNav onOpen={useCallback(() => setActiveFab('nav'), [])} />
      <FabAction items={fabItems} fabIcon={PENCIL_ICON} onOpen={useCallback(() => setActiveFab('action'), [])} />
    </div>
  )
}
