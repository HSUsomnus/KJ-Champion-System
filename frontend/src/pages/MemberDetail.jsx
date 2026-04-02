import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import Header from '../components/Header'
import FabNav from '../components/FabNav'
import FabAction from '../components/FabAction'
import { useAuth } from '../contexts/AuthContext'
import { api, mapMember } from '../services/api'

const STAR_COLORS = {
  '白星': { bg: '#F7F5F2', text: '#8A8680', border: '#E2DED8' },
  '綠星': { bg: '#E8F0EB', text: '#4A7C59', border: '#4A7C59' },
  '橙星': { bg: '#FFF3E0', text: '#E67E22', border: '#E67E22' },
  '紅星': { bg: '#FDECEA', text: '#C0392B', border: '#C0392B' },
  '紫星': { bg: '#F3E5F5', text: '#8E44AD', border: '#8E44AD' },
}

const STATUS_CONFIG = {
  approved: { label: '已審核', bg: '#E8F0EB', color: '#4A7C59' },
  pending: { label: '審核中', bg: '#FFF3E0', color: '#C7A33A' },
  rejected: { label: '退回', bg: '#FDECEC', color: '#C75B3A' },
}

function HiddenNotice({ label }) {
  return (
    <div className="rounded-2xl p-8 shadow-sm text-center" style={{ background: '#fff', border: '1px solid #E2DED8' }}>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#E2DED8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
      </svg>
      <p className="text-sm" style={{ color: '#8A8680' }}>{label}</p>
    </div>
  )
}

function formatBirthday(d) {
  if (!d) return '未設定'
  const p = d.split('-')
  return p.length >= 3 ? `${p[1]}/${p[2]}` : d
}

function parseVolunteers(str) {
  try { const a = JSON.parse(str); return Array.isArray(a) ? a : [] } catch { return [] }
}

function parseCourses(str) {
  if (!str) return []
  return str.split(',').map(c => c.trim()).filter(c => c)
}

const TABS = ['資料', '數據', '財力']

export default function MemberDetail() {
  const { user } = useAuth()
  const { id } = useParams()
  const [activeFab, setActiveFab] = useState(null)
  const [tab, setTab] = useState('資料')
  const [member, setMember] = useState(null)
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.getMember(id).then(res => res.success ? mapMember(res.data) : null),
      api.getFinancialList(id).then(res => res.success ? res.data : []).catch(() => []),
    ])
      .then(([m, docs]) => {
        setMember(m)
        setDocuments(docs)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: '#F7F5F2' }}>
        <Header user={user} />
        <main className="flex-1 flex items-center justify-center pt-16">
          <p className="text-sm" style={{ color: '#8A8680' }}>載入中...</p>
        </main>
      </div>
    )
  }

  if (!member) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: '#F7F5F2' }}>
        <Header user={user} />
        <main className="flex-1 flex items-center justify-center pt-16">
          <p className="text-sm" style={{ color: '#8A8680' }}>找不到此成員</p>
        </main>
      </div>
    )
  }

  const sc = STAR_COLORS[member.starLevel] || STAR_COLORS['白星']
  const courses = parseCourses(member.courseRecord)
  const volunteers = parseVolunteers(member.volunteerRecords)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F7F5F2' }}>
      <Header user={user} />
      <main className="flex-1 overflow-y-auto pt-16 pb-28 px-4">

        {/* 頭像 + 名稱 */}
        <section className="rounded-2xl p-5 shadow-sm mt-4 mb-3 flex items-center gap-4" style={{ background: '#fff', border: '1px solid #E2DED8' }}>
          {member.pictureUrl ? (
            <img src={`/api/members/avatar/${member.lineId}`} alt="" className="w-14 h-14 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold shrink-0" style={{ background: '#4A7C59', color: '#fff' }}>
              {(member.realName || '?')[0]}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold truncate" style={{ color: '#2C2C2C' }}>{member.realName}</p>
            <p className="text-xs truncate" style={{ color: '#8A8680' }}>{member.displayName}</p>
          </div>
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0" style={{ background: sc.bg, color: sc.text, border: `2px solid ${sc.border}` }}>
            {member.starLevel}
          </div>
        </section>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-2 rounded-full text-xs font-medium transition-all active:scale-95"
              style={{ background: tab === t ? '#2C2C2C' : '#fff', color: tab === t ? '#fff' : '#2C2C2C', border: tab === t ? 'none' : '1px solid #E2DED8' }}
            >{t}</button>
          ))}
        </div>

        {/* 資料 tab */}
        {tab === '資料' && (
          member.hideProfile ? (
            <HiddenNotice label="該用戶隱藏資料" />
          ) : (
            <div className="rounded-2xl shadow-sm overflow-hidden" style={{ background: '#fff', border: '1px solid #E2DED8' }}>
              {[
                { label: '真實姓名', value: member.realName },
                { label: 'Email', value: member.email },
                { label: '電話號碼', value: member.phone },
                { label: '生日', value: formatBirthday(member.birthday) },
              ].map((item, idx, arr) => (
                <div key={item.label} className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: idx < arr.length - 1 ? '1px solid #E2DED8' : 'none' }}>
                  <span className="text-sm" style={{ color: '#8A8680' }}>{item.label}</span>
                  <span className="text-sm font-medium" style={{ color: '#2C2C2C' }}>{item.value || '未設定'}</span>
                </div>
              ))}
            </div>
          )
        )}

        {/* 數據 tab */}
        {tab === '數據' && (
          <div className="rounded-2xl shadow-sm overflow-hidden" style={{ background: '#fff', border: '1px solid #E2DED8' }}>
            <div className="px-4 py-3.5" style={{ borderBottom: '1px solid #E2DED8' }}>
              <p className="text-sm mb-2" style={{ color: '#8A8680' }}>課程紀錄</p>
              {courses.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {courses.map(c => <span key={c} className="text-xs px-2.5 py-1 rounded-full" style={{ background: '#E8F0EB', color: '#4A7C59' }}>{c}</span>)}
                </div>
              ) : <p className="text-sm font-medium" style={{ color: '#2C2C2C' }}>無</p>}
            </div>
            <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: '1px solid #E2DED8' }}>
              <span className="text-sm" style={{ color: '#8A8680' }}>特斯拉出行加盟主</span>
              <span className="text-sm font-medium" style={{ color: '#2C2C2C' }}>{member.teslaFranchisee || '未填'}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: '1px solid #E2DED8' }}>
              <span className="text-sm shrink-0" style={{ color: '#8A8680' }}>團隊負責事項</span>
              <span className="text-sm font-medium text-right ml-4" style={{ color: '#2C2C2C' }}>{member.teamResponsibilities || '未填'}</span>
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
              ) : <p className="text-sm font-medium" style={{ color: '#2C2C2C' }}>無</p>}
            </div>
          </div>
        )}

        {/* 財力 tab */}
        {tab === '財力' && (
          member.hideFinancial ? (
            <HiddenNotice label="該用戶隱藏財力資料" />
          ) : (
            <>
              <div className="rounded-2xl p-4 shadow-sm mb-3 flex items-center justify-between" style={{ background: '#fff', border: '1px solid #E2DED8' }}>
                <span className="text-sm" style={{ color: '#8A8680' }}>財力金額</span>
                <span className="text-base font-bold" style={{ color: member.financialAmount ? '#4A7C59' : '#8A8680' }}>{member.financialAmount || '無資料'}</span>
              </div>
              {member.hideDocuments ? (
                <HiddenNotice label="該用戶隱藏上傳記錄" />
              ) : (
                <div className="flex flex-col gap-3">
                  {documents.map(doc => {
                    const st = STATUS_CONFIG[doc.status] || STATUS_CONFIG.pending
                    return (
                      <div key={doc.id} className="rounded-2xl p-4 shadow-sm" style={{ background: '#fff', border: '1px solid #E2DED8' }}>
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#EFEDE9' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8A8680" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate" style={{ color: '#2C2C2C' }}>{doc.original_filename}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-xs" style={{ color: '#8A8680' }}>{doc.uploaded_at?.slice(0, 10)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )
        )}
      </main>

      <FabNav onOpen={useCallback(() => setActiveFab('nav'), [])} />
      <FabAction onOpen={useCallback(() => setActiveFab('action'), [])} />
    </div>
  )
}
