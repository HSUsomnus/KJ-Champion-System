import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { createPortal } from 'react-dom'
import Header from '../components/Header'
import FabNav from '../components/FabNav'
import FabAction, { PENCIL_ICON } from '../components/FabAction'
import ConfirmLeaveDialog, { useLeaveGuard } from '../components/ConfirmLeaveDialog'
import shareEvent from '../utils/shareEvent'
import { useAuth } from '../contexts/AuthContext'
import { api, formToEventPayload } from '../services/api'

const EVENT_TYPES = ['學員上課', '活動', '諮詢簽約', '紫星行程聊聊']

const TITLE_PLACEHOLDERS = {
  '學員上課': '名字+金流課/藍圖課，ex:小陞金流課',
  '活動': '時間(選)+名稱+(財商/加盟)(選)，ex:13台北組聚(財商)、醫美茶會',
  '諮詢簽約': '時間+名字+保單諮詢/財物諮詢/保單簽約/天耀簽約，ex:13小陞財務諮詢',
  '紫星行程聊聊': '時間+名字+聊聊or其他',
}

function ShareConfirmDialog({ open, onShare, onCancel, isEdit }) {
  if (!open) return null
  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      style={{ background: 'rgba(44,44,44,0.4)' }}
      onClick={onCancel}
    >
      <div
        className="mx-6 w-full max-w-xs rounded-2xl p-6 shadow-lg"
        style={{ background: '#fff' }}
        onClick={e => e.stopPropagation()}
      >
        <p className="text-sm font-medium text-center mb-6" style={{ color: '#2C2C2C' }}>
          {isEdit ? '行程更新成功，是否分享？' : '行程建立成功，是否分享？'}
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95" style={{ background: '#EFEDE9', color: '#8A8680' }}>取消</button>
          <button onClick={onShare} className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95" style={{ background: '#4A7C59', color: '#fff' }}>確認分享</button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default function AddEvent() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [activeFab, setActiveFab] = useState(null)
  const [saving, setSaving] = useState(false)

  const existingEvent = location.state?.event || null
  const isEdit = !!existingEvent

  const [form, setForm] = useState({
    title: existingEvent?.title || '',
    type: existingEvent?.type || '學員上課',
    allDay: existingEvent?.allDay ?? false,
    date: existingEvent?.date || '',
    endDate: existingEvent?.endDate || '',
    startTime: existingEvent?.time || '',
    endTime: existingEvent?.endTime || '',
    description: existingEvent?.description || '',
  })

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const [blocker, setSaved] = useLeaveGuard()
  const [showShareDialog, setShowShareDialog] = useState(false)

  const handleConfirm = async () => {
    if (!form.title || !form.date) return
    setSaving(true)
    try {
      const payload = formToEventPayload(form)
      if (isEdit) {
        await api.updateEvent(existingEvent.id, payload)
      } else {
        await api.createEvent(payload)
      }
      setSaved()
      setShowShareDialog(true)
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleShare = async () => {
    setShowShareDialog(false)
    await shareEvent(form)
    navigate(-1)
  }

  const handleSkipShare = () => {
    setShowShareDialog(false)
    navigate(-1)
  }

  const inputStyle = { background: '#F7F5F2', border: '1px solid #E2DED8', color: '#2C2C2C' }

  const fabItems = [
    {
      label: saving ? '儲存中...' : '確認', onClick: handleConfirm,
      labelBg: '#FDECEA', labelColor: '#C0392B', labelBorderColor: '#C0392B',
      btnBg: '#FDECEA', btnColor: '#C0392B', btnBorderColor: '#C0392B',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
    },
    {
      label: '取消', onClick: () => navigate(-1),
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    },
  ]

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F7F5F2' }}>
      <Header user={user} />
      <main className="flex-1 overflow-y-auto pt-16 pb-28 px-4">
        <h1 className="text-base font-semibold mt-4 mb-4" style={{ color: '#2C2C2C' }}>
          {isEdit ? '編輯行程' : '新增行程'}
        </h1>

        <div className="rounded-2xl shadow-sm overflow-hidden" style={{ background: '#fff', border: '1px solid #E2DED8' }}>
          <div className="px-4 py-3.5" style={{ borderBottom: '1px solid #E2DED8' }}>
            <label className="block text-xs mb-1.5" style={{ color: '#8A8680' }}>標題</label>
            <input type="text" value={form.title} onChange={e => set('title', e.target.value)} required placeholder={TITLE_PLACEHOLDERS[form.type] || '輸入行程名稱'} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
          </div>

          <div className="px-4 py-3.5" style={{ borderBottom: '1px solid #E2DED8' }}>
            <label className="block text-xs mb-2" style={{ color: '#8A8680' }}>類型</label>
            <div className="flex gap-2 flex-wrap">
              {EVENT_TYPES.map(t => (
                <button key={t} type="button" onClick={() => set('type', t)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95"
                  style={{ background: form.type === t ? '#4A7C59' : 'transparent', color: form.type === t ? '#fff' : '#2C2C2C', border: form.type === t ? 'none' : '1px solid #E2DED8' }}
                >{t}</button>
              ))}
            </div>
          </div>

          <div className="px-4 py-3.5" style={{ borderBottom: '1px solid #E2DED8' }}>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={form.allDay} onChange={e => set('allDay', e.target.checked)} className="w-4 h-4 rounded accent-[#4A7C59]" />
              <span className="text-sm" style={{ color: '#2C2C2C' }}>整日活動</span>
            </label>
          </div>

          <div className="px-4 py-3.5" style={{ borderBottom: '1px solid #E2DED8' }}>
            <label className="block text-xs mb-1.5" style={{ color: '#8A8680' }}>開始日期</label>
            <input type="date" value={form.date} onChange={e => set('date', e.target.value)} required className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
          </div>

          <div className="px-4 py-3.5" style={{ borderBottom: '1px solid #E2DED8' }}>
            <label className="block text-xs mb-1.5" style={{ color: '#8A8680' }}>結束日期</label>
            <input type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} placeholder="同一天可不填" className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
          </div>

          {!form.allDay && (
            <div className="px-4 py-3.5 grid grid-cols-2 gap-3" style={{ borderBottom: '1px solid #E2DED8' }}>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: '#8A8680' }}>開始時間</label>
                <input type="time" value={form.startTime} onChange={e => set('startTime', e.target.value)} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: '#8A8680' }}>結束時間</label>
                <input type="time" value={form.endTime} onChange={e => set('endTime', e.target.value)} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
              </div>
            </div>
          )}

          <div className="px-4 py-3.5">
            <label className="block text-xs mb-1.5" style={{ color: '#8A8680' }}>備註</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="選填" rows={3} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none" style={inputStyle} />
          </div>
        </div>
      </main>

      <FabNav onOpen={() => setActiveFab('nav')} />
      <FabAction items={fabItems} fabIcon={PENCIL_ICON} onOpen={() => setActiveFab('action')} />
      <ConfirmLeaveDialog blocker={blocker} />
      <ShareConfirmDialog open={showShareDialog} isEdit={isEdit} onShare={handleShare} onCancel={handleSkipShare} />
    </div>
  )
}
