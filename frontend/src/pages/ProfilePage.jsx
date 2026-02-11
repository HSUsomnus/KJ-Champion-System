import { useState, useEffect } from 'react'
import { useLiff } from '../context/LiffContext'
import PageHeader from '../components/PageHeader'
import { fetchProfile, updateProfile } from '../api'

export default function ProfilePage() {
  const { userId } = useLiff()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  // 表單狀態
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    birthday: '',
    displayName: '',
    starLevel: '白星',
    teslaFranchisee: '',
    teamResponsibilities: '',
    courseRecord: '',
    volunteerRecords: '',
  })

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    setError(null)
    
    fetchProfile(userId)
      .then((data) => {
        setProfile(data)
        setFormData({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          birthday: data.birthday || '',
          displayName: data.displayName || '',
          starLevel: data.starLevel || '白星',
          teslaFranchisee: data.teslaFranchisee || '',
          teamResponsibilities: data.teamResponsibilities || '',
          courseRecord: data.courseRecord || '',
          volunteerRecords: data.volunteerRecords || '',
        })
      })
      .catch((err) => {
        if (err.message === 'NEED_REGISTER') {
          setError('請先註冊')
        } else {
          setError(err.message || '載入失敗')
        }
      })
      .finally(() => setLoading(false))
  }, [userId])

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setSaveMessage('')
  }

  const handleSave = async () => {
    if (!userId) return
    setSaving(true)
    setSaveMessage('')
    setError(null)

    try {
      const updated = await updateProfile(userId, formData)
      setProfile(updated)
      setSaveMessage('✅ 儲存成功')
      setTimeout(() => setSaveMessage(''), 3000)
    } catch (err) {
      setError(err.message || '儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader title="個人資料" onRefresh={() => window.location.reload()} />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-slate-500 dark:text-gray-400">載入中...</p>
        </div>
      </>
    )
  }

  if (error && !profile) {
    return (
      <>
        <PageHeader title="個人資料" onRefresh={() => window.location.reload()} />
        <div className="flex-1 flex items-center justify-center p-6">
          <p className="text-red-500 text-center">{error}</p>
        </div>
      </>
    )
  }

  const starLevels = ['白星', '綠星', '橙星', '紅星', '紫星']

  return (
    <>
      <PageHeader title="個人資料" onRefresh={() => window.location.reload()} />
      <div className="flex-1 overflow-y-auto p-4 pb-28">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* 基本資料 */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4 space-y-4">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">基本資料</h3>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                真實姓名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                placeholder="請輸入真實姓名"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                顯示名稱
              </label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => handleChange('displayName', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                placeholder="成員列表顯示的名稱（選填）"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                placeholder="email@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                手機
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                placeholder="0912345678"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                生日 🎂
              </label>
              <input
                type="date"
                value={formData.birthday}
                onChange={(e) => handleChange('birthday', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                填寫後系統會在行事曆上顯示生日提醒
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                星等
              </label>
              <select
                value={formData.starLevel}
                onChange={(e) => handleChange('starLevel', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                {starLevels.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 進階資料 */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4 space-y-4">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">進階資料</h3>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Tesla 事業部
              </label>
              <input
                type="text"
                value={formData.teslaFranchisee}
                onChange={(e) => handleChange('teslaFranchisee', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                團隊職務
              </label>
              <textarea
                value={formData.teamResponsibilities}
                onChange={(e) => handleChange('teamResponsibilities', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white resize-none"
                placeholder="例如：活動組長"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                課程紀錄
              </label>
              <textarea
                value={formData.courseRecord}
                onChange={(e) => handleChange('courseRecord', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white resize-none"
                placeholder="參加過的課程..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                志工紀錄
              </label>
              <textarea
                value={formData.volunteerRecords}
                onChange={(e) => handleChange('volunteerRecords', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white resize-none"
                placeholder="參與的志工活動..."
              />
            </div>
          </div>

          {/* 儲存按鈕 */}
          <div className="sticky bottom-20 z-10">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !formData.name.trim()}
              className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {saving ? '儲存中...' : '儲存變更'}
            </button>
            {saveMessage && (
              <p className="text-center text-green-600 dark:text-green-400 text-sm mt-2">
                {saveMessage}
              </p>
            )}
            {error && (
              <p className="text-center text-red-500 text-sm mt-2">
                {error}
              </p>
            )}
          </div>

          <div className="h-8" />
        </div>
      </div>
    </>
  )
}
