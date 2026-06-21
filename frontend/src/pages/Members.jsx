import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import FabAction, { PENCIL_ICON } from '../components/FabAction'
import { useAuth } from '../contexts/AuthContext'
import { api, mapMember } from '../services/api'

const STAR_ORDER = { '紫星': 5, '紅星': 4, '橙星': 3, '綠星': 2, '白星': 1 }
const STAR_COLORS = {
  '白星': { bg: '#F7F5F2', color: '#8A8680' },
  '綠星': { bg: '#E8F0EB', color: '#4A7C59' },
  '橙星': { bg: '#FFF3E0', color: '#E67E22' },
  '紅星': { bg: '#FDECEA', color: '#C0392B' },
  '紫星': { bg: '#F3E5F5', color: '#8E44AD' },
}

export default function Members() {
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [members, setMembers] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    api.getMembers()
      .then(res => {
        if (res.success && res.data) {
          setMembers(res.data.map(mapMember))
        }
      })
      .catch(() => {})
  }, [])

  const sorted = [...members].sort((a, b) => (STAR_ORDER[b.starLevel] || 0) - (STAR_ORDER[a.starLevel] || 0))
  const filtered = sorted.filter(m =>
    (m.realName || '').includes(search) || (m.displayName || '').toLowerCase().includes(search.toLowerCase())
  )

  const fabItems = [
    {
      label: '管理介面', path: '/management',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      ),
    },
  ]

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F7F5F2' }}>
      <main className="flex-1 overflow-y-auto pt-14 pb-28 px-4">
        <h1 className="text-base font-semibold mt-4 mb-4" style={{ color: '#2C2C2C' }}>成員列表</h1>

        <div className="mb-4">
          <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: '#fff', border: '1px solid #E2DED8' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8A8680" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="搜尋成員" className="flex-1 text-sm outline-none bg-transparent" style={{ color: '#2C2C2C' }} />
          </div>
        </div>

        <p className="text-xs mb-3" style={{ color: '#8A8680' }}>共 {filtered.length} 位成員</p>

        <div className="flex flex-col gap-2">
          {filtered.map(member => {
            const sc = STAR_COLORS[member.starLevel] || STAR_COLORS['白星']
            return (
              <div
                key={member.lineId}
                onClick={() => navigate(`/member/${member.lineId}`)}
                className="rounded-2xl p-4 shadow-sm flex items-center gap-3 transition-all active:scale-[0.98] cursor-pointer"
                style={{ background: '#fff', border: '1px solid #E2DED8' }}
              >
                {member.pictureUrl ? (
                  <img src={`/api/members/avatar/${member.lineId}`} alt="" className="w-11 h-11 rounded-full object-cover" />
                ) : (
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-base font-medium shrink-0" style={{ background: '#4A7C59', color: '#fff' }}>
                    {(member.realName || '?')[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: '#2C2C2C' }}>{member.displayName || member.realName}</p>
                  <p className="text-xs truncate" style={{ color: '#8A8680' }}>{member.realName}</p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full shrink-0" style={{ background: sc.bg, color: sc.color }}>
                  {member.starLevel}
                </span>
              </div>
            )
          })}
        </div>
      </main>

      <FabAction items={fabItems} fabIcon={PENCIL_ICON} />
    </div>
  )
}
