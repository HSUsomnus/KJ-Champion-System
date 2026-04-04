import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import FabNav from '../components/FabNav'
import FabAction from '../components/FabAction'
import TagBadge from '../components/TagBadge'
import { useAuth } from '../contexts/AuthContext'
import { api, mapMember } from '../services/api'

const TABS = ['數據', '財力', '權限', '標籤']

const TAG_CATEGORIES = ['身份', '技能', '成就', '自訂']
const DEFAULT_TAG_COLORS = {
  '身份': { color: '#4A7C59', bgColor: '#E8F0EB' },
  '技能': { color: '#2980B9', bgColor: '#EBF5FB' },
  '成就': { color: '#E67E22', bgColor: '#FFF3E0' },
  '自訂': { color: '#8A8680', bgColor: '#EFEDE9' },
}

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
  const [activeFab, setActiveFab] = useState(null)
  const [tab, setTab] = useState('數據')
  const [members, setMembers] = useState([])
  const [permissions, setPermissions] = useState([])
  const [tags, setTags] = useState([])
  const [newTag, setNewTag] = useState({ name: '', category: '自訂', description: '' })
  const [editingTag, setEditingTag] = useState(null)

  const userRole = user?.role || '一般人'
  const hasAccess = userRole !== '一般人'

  const loadTags = () => {
    api.getTags()
      .then(res => { if (res.success) setTags(res.data) })
      .catch(() => {})
  }

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
    loadTags()
  }, [hasAccess])

  const handleCreateTag = async () => {
    if (!newTag.name.trim()) return
    const defaults = DEFAULT_TAG_COLORS[newTag.category] || DEFAULT_TAG_COLORS['自訂']
    try {
      await api.createTag(user.lineId, {
        name: newTag.name.trim(),
        category: newTag.category,
        color: defaults.color,
        bgColor: defaults.bgColor,
        description: newTag.description,
      })
      setNewTag({ name: '', category: '自訂', description: '' })
      loadTags()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleDeleteTag = async (tagId) => {
    try {
      await api.deleteTag(tagId, user.lineId)
      loadTags()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleUpdateTag = async () => {
    if (!editingTag) return
    try {
      await api.updateTag(editingTag.id, user.lineId, {
        name: editingTag.name,
        category: editingTag.category,
        description: editingTag.description,
      })
      setEditingTag(null)
      loadTags()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleRoleChange = async (lineId, newRole) => {
    setPermissions(prev => prev.map(m => m.lineId === lineId ? { ...m, role: newRole } : m))
    try {
      await api.updateRoles(user.lineId, [{ lineId, role: newRole }])
    } catch (err) {
      alert(err.message)
      // 還原
      setPermissions(prev => prev.map(m => m.lineId === lineId ? { ...m, role: members.find(mb => mb.lineId === lineId)?.role || '一般人' } : m))
    }
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: '#F7F5F2' }}>
        <Header user={user} />
        <main className="flex-1 flex items-center justify-center pt-16 pb-28 px-4">
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
        <FabNav onOpen={() => setActiveFab('nav')} />
      </div>
    )
  }

  const canEditPermission = userRole === '負責人' || userRole === '開發者'

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F7F5F2' }}>
      <Header user={user} />
      <main className="flex-1 overflow-y-auto pt-16 pb-28 px-4">
        <h1 className="text-base font-semibold mt-4 mb-4" style={{ color: '#2C2C2C' }}>管理介面</h1>

        <div className="flex gap-2 mb-4">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="px-4 py-2 rounded-full text-xs font-medium transition-all active:scale-95"
              style={{ background: tab === t ? '#2C2C2C' : '#fff', color: tab === t ? '#fff' : '#2C2C2C', border: tab === t ? 'none' : '1px solid #E2DED8' }}
            >{t}</button>
          ))}
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
              <div key={m.lineId} className="rounded-2xl p-4 shadow-sm flex items-center justify-between" style={{ background: '#fff', border: '1px solid #E2DED8' }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: '#2C2C2C' }}>{m.realName}</p>
                </div>
                <span className="text-sm font-bold" style={{ color: m.financialAmount ? '#4A7C59' : '#8A8680' }}>{m.financialAmount || '無資料'}</span>
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

        {/* 標籤 tab */}
        {tab === '標籤' && (
          <div className="flex flex-col gap-4">
            {/* 新增標籤表單 */}
            <div className="rounded-2xl p-4 shadow-sm" style={{ background: '#fff', border: '1px solid #E2DED8' }}>
              <p className="text-sm font-medium mb-3" style={{ color: '#2C2C2C' }}>新增標籤</p>
              <div className="flex flex-col gap-2.5">
                <input
                  type="text"
                  value={newTag.name}
                  onChange={e => setNewTag(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="標籤名稱"
                  className="text-sm px-3 py-2 rounded-xl outline-none"
                  style={{ background: '#F7F5F2', border: '1px solid #E2DED8', color: '#2C2C2C' }}
                />
                <select
                  value={newTag.category}
                  onChange={e => setNewTag(prev => ({ ...prev, category: e.target.value }))}
                  className="text-sm px-3 py-2 rounded-xl outline-none"
                  style={{ background: '#F7F5F2', border: '1px solid #E2DED8', color: '#2C2C2C' }}
                >
                  {TAG_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input
                  type="text"
                  value={newTag.description}
                  onChange={e => setNewTag(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="說明（選填）"
                  className="text-sm px-3 py-2 rounded-xl outline-none"
                  style={{ background: '#F7F5F2', border: '1px solid #E2DED8', color: '#2C2C2C' }}
                />
                <button
                  onClick={handleCreateTag}
                  disabled={!newTag.name.trim()}
                  className="text-sm py-2 rounded-xl font-medium transition-all active:scale-95 disabled:opacity-40"
                  style={{ background: '#4A7C59', color: '#fff' }}
                >
                  建立
                </button>
              </div>
            </div>

            {/* 編輯中的標籤 */}
            {editingTag && (
              <div className="rounded-2xl p-4 shadow-sm" style={{ background: '#fff', border: '2px solid #4A7C59' }}>
                <p className="text-sm font-medium mb-3" style={{ color: '#2C2C2C' }}>編輯標籤</p>
                <div className="flex flex-col gap-2.5">
                  <input
                    type="text"
                    value={editingTag.name}
                    onChange={e => setEditingTag(prev => ({ ...prev, name: e.target.value }))}
                    className="text-sm px-3 py-2 rounded-xl outline-none"
                    style={{ background: '#F7F5F2', border: '1px solid #E2DED8', color: '#2C2C2C' }}
                  />
                  <select
                    value={editingTag.category}
                    onChange={e => setEditingTag(prev => ({ ...prev, category: e.target.value }))}
                    className="text-sm px-3 py-2 rounded-xl outline-none"
                    style={{ background: '#F7F5F2', border: '1px solid #E2DED8', color: '#2C2C2C' }}
                  >
                    {TAG_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input
                    type="text"
                    value={editingTag.description}
                    onChange={e => setEditingTag(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="說明（選填）"
                    className="text-sm px-3 py-2 rounded-xl outline-none"
                    style={{ background: '#F7F5F2', border: '1px solid #E2DED8', color: '#2C2C2C' }}
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setEditingTag(null)} className="flex-1 text-sm py-2 rounded-xl font-medium transition-all active:scale-95" style={{ background: '#EFEDE9', color: '#8A8680' }}>
                      取消
                    </button>
                    <button onClick={handleUpdateTag} className="flex-1 text-sm py-2 rounded-xl font-medium transition-all active:scale-95" style={{ background: '#4A7C59', color: '#fff' }}>
                      儲存
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 標籤列表依類別分群 */}
            {TAG_CATEGORIES.map(cat => {
              const catTags = tags.filter(t => t.category === cat)
              if (catTags.length === 0) return null
              return (
                <div key={cat}>
                  <p className="text-xs font-medium mb-2" style={{ color: '#8A8680' }}>{cat}</p>
                  <div className="flex flex-col gap-2">
                    {catTags.map(tag => (
                      <div key={tag.id} className="rounded-2xl p-3 shadow-sm flex items-center justify-between" style={{ background: '#fff', border: '1px solid #E2DED8' }}>
                        <div className="flex items-center gap-2 min-w-0">
                          <TagBadge name={tag.name} color={tag.color} bgColor={tag.bgColor} isSystem={tag.isSystem} />
                          {tag.description && <span className="text-xs truncate" style={{ color: '#8A8680' }}>{tag.description}</span>}
                        </div>
                        {!tag.isSystem && (
                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            <button
                              onClick={() => setEditingTag({ id: tag.id, name: tag.name, category: tag.category, description: tag.description || '' })}
                              className="p-1.5 rounded-lg transition-all active:scale-90"
                              style={{ background: '#EFEDE9' }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8A8680" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteTag(tag.id)}
                              className="p-1.5 rounded-lg transition-all active:scale-90"
                              style={{ background: '#FDECEC' }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C0392B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}

            {tags.length === 0 && (
              <p className="text-center text-xs py-8" style={{ color: '#8A8680' }}>尚無標籤，使用上方表單建立第一個標籤</p>
            )}
          </div>
        )}
      </main>

      <FabNav onOpen={() => setActiveFab('nav')} />
      <FabAction onOpen={() => setActiveFab('action')} />
    </div>
  )
}
