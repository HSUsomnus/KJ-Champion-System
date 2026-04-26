import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import FabNav from '../components/FabNav'
import FabAction, { PENCIL_ICON } from '../components/FabAction'
import ConfirmLeaveDialog, { useLeaveGuard } from '../components/ConfirmLeaveDialog'
import { useToast, FieldError } from '../components/feedback'
import { useAuth } from '../contexts/AuthContext'
import { api, mapMember } from '../services/api'

export default function ProfileEdit() {
  const navigate = useNavigate()
  const { user, refreshUser, login, isProfileComplete } = useAuth()
  const toast = useToast()
  const onboarding = !isProfileComplete(user)
  const [activeFab, setActiveFab] = useState(null)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const inputRefs = useRef({})
  const [form, setForm] = useState({
    realName: user?.realName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    birthday: user?.birthday || '',
  })
  const [blocker, setSaved] = useLeaveGuard()

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  const handleConfirm = async () => {
    // [設計決策] 四欄必填驗證 — inline FieldError + 焦點導引
    // 原因：新用戶 onboarding 強制流程要求所有欄位都不為空，inline 紅字比 alert 更精準指出位置
    const newErrors = {}
    if (!form.realName?.trim()) newErrors.realName = '請輸入真實姓名'
    if (!form.email?.trim()) newErrors.email = '請輸入 Email'
    if (!form.phone?.trim()) newErrors.phone = '請輸入電話號碼'
    if (!form.birthday) newErrors.birthday = '請選擇生日'
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      const firstKey = Object.keys(newErrors)[0]
      const el = inputRefs.current[firstKey]
      if (el) {
        el.focus()
        el.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }
      return
    }
    setErrors({})
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
      // 新用戶完成資料後接著去填數據頁；既有用戶回個人資料頁
      setTimeout(() => navigate(isNewUser ? '/user-stats/edit' : '/profile'), 0)
    } catch (err) {
      toast.error(err.message || '儲存失敗')
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
      onClick: () => navigate(user?.realName ? '/profile' : '/login'),
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    },
  ]

  const fields = [
    { label: '真實姓名', key: 'realName', type: 'text', required: true },
    { label: 'Email', key: 'email', type: 'email', required: true },
    { label: '電話號碼', key: 'phone', type: 'tel', required: true },
    { label: '生日', key: 'birthday', type: 'date', required: true },
  ]

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F7F5F2' }}>
      <Header user={user} />
      <main className="flex-1 overflow-y-auto pt-16 pb-28 px-4">
        <h1 className="text-base font-semibold mt-4 mb-4" style={{ color: '#2C2C2C' }}>編輯資料</h1>
        {onboarding && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ background: '#FFF3E0', border: '1px solid #FFB74D', color: '#7B5800' }}>
            ⚠️ 新用戶請完成所有欄位（皆為必填），完成後將引導至下一步「編輯數據」。完成全部資料前無法進入其他頁面。
          </div>
        )}
        <div className="rounded-2xl shadow-sm overflow-hidden" style={{ background: '#fff', border: '1px solid #E2DED8' }}>
          {fields.map((field, idx) => (
            <div key={field.key} className="px-4 py-3.5" style={{ borderBottom: idx < fields.length - 1 ? '1px solid #E2DED8' : 'none' }}>
              <label className="block text-xs mb-1.5" style={{ color: '#8A8680' }}>{field.label}</label>
              <input
                ref={el => { inputRefs.current[field.key] = el }}
                type={field.type} value={form[field.key]}
                onChange={e => handleChange(field.key, e.target.value)}
                required={field.required}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: '#F7F5F2', border: errors[field.key] ? '1px solid #C0392B' : '1px solid #E2DED8', color: '#2C2C2C' }}
              />
              {errors[field.key] && <FieldError>{errors[field.key]}</FieldError>}
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
