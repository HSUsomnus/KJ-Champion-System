import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import FabAction from '../components/FabAction'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/feedback'
import { api, mapMember } from '../services/api'

const TABS = ['數據', '財力', '權限']

const ROLE_OPTIONS = ['一般人', '管理者', '負責人', '開發者']

const ROLE_STYLE = {
  '開發者': { bg: '#F3E5F5', color: '#8E44AD' },
  '負責人': { bg: '#E8F0EB', color: '#4A7C59' },
  '管理者': { bg: '#FFF3E0', color: '#C7A33A' },
  '一般人': { bg: '#EFEDE9', color: '#8A8680' },
}

const STAR_COLORS = {
  '白星': { bg: '#F7F5F2', color: '#8A8680' },
  '綠星': { bg: '#E8F0EB', color: '#4A7C59' },
  '橙星': { bg: '#FFF3E0', color: '#E67E22' },
  '紅星': { bg: '#FDECEA', color: '#C0392B' },
  '紫星': { bg: '#F3E5F5', color: '#8E44AD' },
}

export default function Management() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('數據')
  const [members, setMembers] = useState([])
  const [permissions, setPermissions] = useState([])

  const userRole = user?.role || '一般人'
  const hasAccess = userRole !== '一般人'

  useEffect(() => {
    if (!hasAccess) return
    api.getMembers()
      .then(res => {
        if (res.success && res.data) {
          const mapped = res.data.map(mapMember)
          setMembers(mapped)
          setPermissions(mapped.map(m => ({ lineId: m.lineId, name: m.realName, role: m.role || '一般人' })))
        }
      })
      .catch(() => {})
  }, [hasAccess])

  const handleRoleChange = async (lineId, newRole) => {
    setPermissions(prev => prev.map(m => m.lineId === lineId ? { ...m, role: newRole } : m))
    try {
      await api.updateRoles(user.lineId, [{ lineId, role: newRole }])
    } catch (err) {
      toast.error(err.message || '角色變更失敗')
      // 還原
      setPermissions(prev => prev.map(m => m.lineId === lineId ? { ...m, role: members.find(mb => mb.lineId === lineId)?.role || '一般人' } : m))
    }
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: '#F7F5F2' }}>
        <main className="flex-1 flex items-center justify-center pt-14 pb-28 px-4">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: '#EFEDE9' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#8A8680" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <p className="text-sm font-medium mb-1" style={{ color: '#2C2C2C' }}>無存取權限</p>
            <p className="text-xs mb-4" style={{ color: '#8A8680' }}>此頁面僅限管理者、負責人、開發者使用</p>
            <button onClick={() => navigate('/')} className="px-4 py-2 rounded-xl text-sm font-medium transition-all active:scale-95" style={{ background: '#4A7C59', color: '#fff' }}>
              返回主頁
            </button>
          </div>
        </main>
      </div>
    )
  }

  const canEditPermission = userRole === '負責人' || userRole === '開發者'

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F7F5F2' }}>
      <main className="flex-1 overflow-y-auto pt-14 pb-28 px-4">
        <h1 className="text-base font-semibold mt-4 mb-4" style={{ color: '#2C2C2C' }}>管理者後台</h1>

        <div className="mb-4">
          <div style={{ display: 'flex', background: '#EFEDE9', borderRadius: 20, padding: 3 }}>
            {TABS.map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  fontSize: 12,
                  fontWeight: tab === t ? 500 : 400,
                  padding: '6px 4px',
                  borderRadius: 16,
                  border: 'none',
                  cursor: 'pointer',
                  background: tab === t ? '#4A7C59' : 'transparent',
                  color: tab === t ? '#fff' : '#2C2C2C',
                  transition: 'background 0.15s, color 0.15s',
                }}
              >{t}</button>
            ))}
          </div>
        </div>

        {/* 數據 tab */}
        {tab === '數據' && (
          <div className="flex flex-col gap-3">
            {members.map(m => {
              const sc = STAR_COLORS[m.starLevel] || STAR_COLORS['白星']
              return (
                <div key={m.lineId} className="rounded-2xl p-4 shadow-sm" style={{ background: '#fff', border: '1px solid #E2DED8' }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium" style={{ color: '#2C2C2C' }}>{m.realName}</p>
                    <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: sc.bg, color: sc.color }}>{m.starLevel}</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs" style={{ color: '#8A8680' }}>課程：{m.courseRecord || '無'}</p>
                    <p className="text-xs" style={{ color: '#8A8680' }}>特斯拉加盟：{m.teslaFranchisee || '未填'}</p>
                    <p className="text-xs" style={{ color: '#8A8680' }}>負責事項：{m.teamResponsibilities || '未填'}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* 財力 tab */}
        {tab === '財力' && (
          <div className="flex flex-col gap-3">
            {members.map(m => (
              <div
                key={m.lineId}
                className="rounded-2xl p-4 shadow-sm flex items-center justify-between cursor-pointer transition-all active:scale-[0.98]"
                style={{ background: '#fff', border: '1px solid #E2DED8' }}
                onClick={() => navigate(`/financial?userId=${m.lineId}&name=${encodeURIComponent(m.realName)}`)}
              >
                <div>
                  <p className="text-sm font-medium" style={{ color: '#2C2C2C' }}>{m.realName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold" style={{ color: m.financialAmount ? '#4A7C59' : '#8A8680' }}>{m.financialAmount || '無資料'}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8A8680" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 權限 tab */}
        {tab === '權限' && (
          <div className="flex flex-col gap-3">
            {permissions.map(m => {
              const rs = ROLE_STYLE[m.role] || ROLE_STYLE['一般人']
              return (
                <div key={m.lineId} className="rounded-2xl p-4 shadow-sm flex items-center justify-between" style={{ background: '#fff', border: '1px solid #E2DED8' }}>
                  <p className="text-sm font-medium" style={{ color: '#2C2C2C' }}>{m.name}</p>
                  {canEditPermission ? (
                    <select
                      value={m.role}
                      onChange={e => handleRoleChange(m.lineId, e.target.value)}
                      className="text-xs px-2.5 py-1.5 rounded-full outline-none cursor-pointer"
                      style={{ background: rs.bg, color: rs.color, border: 'none', appearance: 'auto' }}
                    >
                      {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  ) : (
                    <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: rs.bg, color: rs.color }}>
                      {m.role}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>

      <FabAction />
    </div>
  )
}
