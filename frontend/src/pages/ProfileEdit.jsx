import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import FabNav from '../components/FabNav'
import FabAction, { PENCIL_ICON } from '../components/FabAction'
import ConfirmLeaveDialog, { useLeaveGuard } from '../components/ConfirmLeaveDialog'
import { useAuth } from '../contexts/AuthContext'
import { api, mapMember } from '../services/api'

export default function ProfileEdit() {
  const navigate = useNavigate()
  const { user, refreshUser, login } = useAuth()
  const [activeFab, setActiveFab] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    realName: user?.realName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    birthday: user?.birthday || '',
  })
  const [blocker, setSaved] = useLeaveGuard()

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleConfirm = async () => {
    if (!form.realName) return
    setSaving(true)
    try {
      const isNewUser = !user?.realName
      const payload = {
        name: form.realName,
        email: form.email,
        phone: form.phone,
        birthday: form.birthday,
        displayName: user?.displayName || localStorage.getItem('lineDisplayName') || '',
        pictureUrl: user?.pictureUrl || localStorage.getItem('linePictureUrl') || '',
      }

      if (isNewUser) {
        const res = await api.register(payload)
        if (res.success && res.data) {
          login({
            ...mapMember(res.data),
            lineId: localStorage.getItem('lineUserId'),
            displayName: payload.displayName,
            pictureUrl: payload.pictureUrl,
          })
        }
      } else {
        await api.updateProfile(payload)
        await refreshUser()
      }

      setSaved()
      setTimeout(() => navigate(isNewUser ? '/' : '/profile'), 0)
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  const fabItems = [
    {
      label: saving ? '儲存中...' : '確認',
      onClick: handleConfirm,
      labelBg: '#FDECEA', labelColor: '#C0392B', labelBorderColor: '#C0392B',
      btnBg: '#FDECEA', btnColor: '#C0392B', btnBorderColor: '#C0392B',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
    },
    {
      label: '取消',
      onClick: () => navigate(user?.realName ? '/profile' : '/login'),
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    },
  ]

  const fields = [
    { label: '真實姓名', key: 'realName', type: 'text', required: true },
    { label: 'Email', key: 'email', type: 'email' },
    { label: '電話號碼', key: 'phone', type: 'tel' },
    { label: '生日', key: 'birthday', type: 'date' },
  ]

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F7F5F2' }}>
      <Header user={user} />
      <main className="flex-1 overflow-y-auto pt-16 pb-28 px-4">
        <h1 className="text-base font-semibold mt-4 mb-4" style={{ color: '#2C2C2C' }}>編輯資料</h1>
        <div className="rounded-2xl shadow-sm overflow-hidden" style={{ background: '#fff', border: '1px solid #E2DED8' }}>
          {fields.map((field, idx) => (
            <div key={field.key} className="px-4 py-3.5" style={{ borderBottom: idx < fields.length - 1 ? '1px solid #E2DED8' : 'none' }}>
              <label className="block text-xs mb-1.5" style={{ color: '#8A8680' }}>{field.label}</label>
              <input
                type={field.type} value={form[field.key]}
                onChange={e => handleChange(field.key, e.target.value)}
                required={field.required}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: '#F7F5F2', border: '1px solid #E2DED8', color: '#2C2C2C' }}
              />
            </div>
          ))}
        </div>
      </main>
      <FabNav onOpen={() => setActiveFab('nav')} />
      <FabAction items={fabItems} fabIcon={PENCIL_ICON} onOpen={() => setActiveFab('action')} />
      <ConfirmLeaveDialog blocker={blocker} />
    </div>
  )
}
