import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FabAction, { PENCIL_ICON } from '../components/FabAction'
import ConfirmLeaveDialog, { useLeaveGuard } from '../components/ConfirmLeaveDialog'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../services/api'

const STAR_OPTIONS = ['白星', '綠星', '橙星', '紅星', '紫星']

const COURSE_OPTIONS = [
  '正式金流課',
  '財富藍圖課',
  '財富實踐旅程',
  '夢想清單專班',
  '群星計畫',
]

const VOLUNTEER_OPTIONS = ['金流', '藍圖']

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

export default function UserStatsEdit() {
  const navigate = useNavigate()
  const { user, refreshUser, isStatsComplete } = useAuth()
  const onboarding = !isStatsComplete(user)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    starLevel: user?.starLevel || '白星',
    courseList: parseCourses(user?.courseRecord),
    teslaFranchisee: user?.teslaFranchisee || '',
    teamResponsibilities: user?.teamResponsibilities || '',
    volunteerList: parseVolunteers(user?.volunteerRecords),
  })
  const [showVolunteerForm, setShowVolunteerForm] = useState(false)
  const [newVolunteer, setNewVolunteer] = useState({ date: '', option: '金流' })

  const toggleCourse = (course) => {
    setForm(prev => ({
      ...prev,
      courseList: prev.courseList.includes(course)
        ? prev.courseList.filter(c => c !== course)
        : [...prev.courseList, course],
    }))
  }

  const addVolunteer = () => {
    if (!newVolunteer.date) return
    setForm(prev => ({
      ...prev,
      volunteerList: [...prev.volunteerList, { ...newVolunteer }],
    }))
    setNewVolunteer({ date: '', option: '金流' })
    setShowVolunteerForm(false)
  }

  const removeVolunteer = (idx) => {
    setForm(prev => ({
      ...prev,
      volunteerList: prev.volunteerList.filter((_, i) => i !== idx),
    }))
  }

  const [blocker, setSaved] = useLeaveGuard()

  const handleConfirm = async () => {
    // [設計決策] 課程紀錄必填，至少勾 1 個
    // 原因：新用戶 onboarding 強制流程要求課程資料不得為空
    if (form.courseList.length === 0) { alert('請至少勾選一個課程紀錄'); return }
    setSaving(true)
    try {
      await api.updateProfile({
        starLevel: form.starLevel,
        courseRecord: form.courseList.join(', '),
        teslaFranchisee: form.teslaFranchisee,
        teamResponsibilities: form.teamResponsibilities,
        volunteerRecords: JSON.stringify(form.volunteerList),
      })
      await refreshUser()
      setSaved()
      // [設計決策] 新用戶完成 onboarding 最後一步 → 導主頁；既有用戶從 /user-stats 進來編輯 → 回 /user-stats
      // 原因：onboarding 完成是進入主應用的時機，使用者預期看到主頁而非數據頁
      setTimeout(() => navigate(onboarding ? '/' : '/user-stats'), 0)
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  const fabItems = [
    {
      label: saving ? '儲存中...' : '確認/儲存',
      onClick: handleConfirm,
      labelBg: '#FDECEA', labelColor: '#C0392B', labelBorderColor: '#C0392B',
      btnBg: '#FDECEA', btnColor: '#C0392B', btnBorderColor: '#C0392B',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
    },
    {
      label: '取消',
      onClick: () => navigate('/user-stats'),
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    },
  ]

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F7F5F2' }}>
      <main className="flex-1 overflow-y-auto pt-14 pb-28 px-4">
        <h1 className="text-base font-semibold mt-4 mb-4" style={{ color: '#2C2C2C' }}>編輯數據</h1>

        {onboarding && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ background: '#FFF3E0', border: '1px solid #FFB74D', color: '#7B5800' }}>
            ⚠️ 新用戶請至少勾選一個課程紀錄（必填）。完成後即可進入其他頁面。
          </div>
        )}

        <div className="rounded-2xl shadow-sm overflow-hidden" style={{ background: '#fff', border: '1px solid #E2DED8' }}>
          {/* 星等 */}
          <div className="px-4 py-3.5" style={{ borderBottom: '1px solid #E2DED8' }}>
            <label className="block text-xs mb-1.5" style={{ color: '#8A8680' }}>星等</label>
            <select
              value={form.starLevel}
              onChange={e => setForm(prev => ({ ...prev, starLevel: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: '#F7F5F2', border: '1px solid #E2DED8', color: '#2C2C2C' }}
            >
              {STAR_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* 課程紀錄 */}
          <div className="px-4 py-3.5" style={{ borderBottom: '1px solid #E2DED8' }}>
            <p className="text-xs mb-2" style={{ color: '#8A8680' }}>課程紀錄 <span style={{ color: '#C0392B' }}>*</span></p>
            <div className="flex flex-col gap-2">
              {COURSE_OPTIONS.map(course => (
                <label key={course} className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.courseList.includes(course)}
                    onChange={() => toggleCourse(course)}
                    className="w-4 h-4 rounded accent-[#4A7C59]"
                  />
                  <span className="text-sm" style={{ color: '#2C2C2C' }}>{course}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 特斯拉加盟主 */}
          <div className="px-4 py-3.5" style={{ borderBottom: '1px solid #E2DED8' }}>
            <label className="block text-xs mb-1.5" style={{ color: '#8A8680' }}>是否為特斯拉出行加盟主</label>
            <select
              value={form.teslaFranchisee}
              onChange={e => setForm(prev => ({ ...prev, teslaFranchisee: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: '#F7F5F2', border: '1px solid #E2DED8', color: '#2C2C2C' }}
            >
              <option value="">未填</option>
              <option value="是">是</option>
              <option value="否">否</option>
            </select>
          </div>

          {/* 團隊負責事項 */}
          <div className="px-4 py-3.5" style={{ borderBottom: '1px solid #E2DED8' }}>
            <label className="block text-xs mb-1.5" style={{ color: '#8A8680' }}>團隊負責事項</label>
            <input
              type="text"
              value={form.teamResponsibilities}
              onChange={e => setForm(prev => ({ ...prev, teamResponsibilities: e.target.value }))}
              placeholder="請輸入負責事項"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: '#F7F5F2', border: '1px solid #E2DED8', color: '#2C2C2C' }}
            />
          </div>

          {/* 課程志工 */}
          <div className="px-4 py-3.5">
            <p className="text-xs mb-2" style={{ color: '#8A8680' }}>課程志工</p>

            {form.volunteerList.length > 0 && (
              <div className="flex flex-col gap-2 mb-3">
                {form.volunteerList.map((r, i) => (
                  <div key={i} className="flex items-center justify-between py-2 px-3 rounded-xl" style={{ background: '#F7F5F2' }}>
                    <span className="text-sm" style={{ color: '#2C2C2C' }}>{r.date} {r.option}</span>
                    <button type="button" onClick={() => removeVolunteer(i)} className="transition-all active:scale-90" style={{ color: '#8A8680' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {!showVolunteerForm ? (
              <button
                type="button"
                onClick={() => {
                  setNewVolunteer({ date: new Date().toISOString().slice(0, 10), option: '金流' })
                  setShowVolunteerForm(true)
                }}
                className="text-sm font-medium transition-all active:scale-95"
                style={{ color: '#4A7C59' }}
              >
                + 新增記錄
              </button>
            ) : (
              <div className="p-3 rounded-xl space-y-2" style={{ background: '#F7F5F2' }}>
                <div>
                  <label className="block text-xs mb-1" style={{ color: '#8A8680' }}>日期</label>
                  <input type="date" value={newVolunteer.date} onChange={e => setNewVolunteer(prev => ({ ...prev, date: e.target.value }))} className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: '#fff', border: '1px solid #E2DED8', color: '#2C2C2C' }} />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: '#8A8680' }}>選項</label>
                  <select value={newVolunteer.option} onChange={e => setNewVolunteer(prev => ({ ...prev, option: e.target.value }))} className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: '#fff', border: '1px solid #E2DED8', color: '#2C2C2C' }}>
                    {VOLUNTEER_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setShowVolunteerForm(false)} className="flex-1 py-2 rounded-lg text-sm transition-all active:scale-95" style={{ background: '#EFEDE9', color: '#8A8680' }}>取消</button>
                  <button type="button" onClick={addVolunteer} className="flex-1 py-2 rounded-lg text-sm font-medium transition-all active:scale-95" style={{ background: '#4A7C59', color: '#fff' }}>確定</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <FabAction items={fabItems} fabIcon={PENCIL_ICON} />
      <ConfirmLeaveDialog blocker={blocker} />
    </div>
  )
}
