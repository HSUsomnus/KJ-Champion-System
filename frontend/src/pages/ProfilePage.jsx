import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiff } from '../context/LiffContext'
import PageHeader from '../components/PageHeader'
import { fetchProfile, updateProfile, checkUserRole, syncAllBirthdays } from '../api'

export default function ProfilePage() {
  const { userId } = useLiff()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [userRole, setUserRole] = useState('一般人')
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState(null)

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
    
    // 同時取得個人資料和權限等級
    Promise.all([
      fetchProfile(userId),
      checkUserRole(userId),
    ])
      .then(([data, roleData]) => {
        setProfile(data)
        setIsAdmin(roleData.isAdmin)
        setUserRole(roleData.role || data.role || '一般人')
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

  const handleSyncAllBirthdays = async () => {
    if (!userId || !isAdmin) return
    
    if (!confirm('確定要強制同步所有成員的生日行程嗎？\n這會更新 Google Calendar 和資料庫。')) {
      return
    }

    setSyncing(true)
    setSyncResult(null)
    setError(null)

    try {
      const result = await syncAllBirthdays(userId)
      setSyncResult(result)
      setTimeout(() => setSyncResult(null), 10000)
    } catch (err) {
      setError(err.message || '同步失敗')
    } finally {
      setSyncing(false)
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

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case '開發者': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case '管理者': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case '負責人': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    }
  }

  return (
    <>
      <PageHeader title="個人資料" onRefresh={() => window.location.reload()} />
      <div className="flex-1 overflow-y-auto p-4 pb-28">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* 權限顯示 */}
          {userRole && (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-3 flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-400">您的權限</span>
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${getRoleBadgeColor(userRole)}`}>
                {userRole}
              </span>
            </div>
          )}

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

          {/* 開發人員專用功能 */}
          {isAdmin && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl shadow-sm p-4 border-2 border-purple-200 dark:border-purple-700">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🔧</span>
                <h3 className="font-bold text-lg text-purple-900 dark:text-purple-200">
                  開發人員專用功能
                </h3>
              </div>
              
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => navigate('/admin/roles')}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md transition-all"
                >
                  👥 權限管理
                </button>
                
                <button
                  type="button"
                  onClick={handleSyncAllBirthdays}
                  disabled={syncing}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {syncing ? '同步中...' : '🎂 強制同步所有用戶生日行程'}
                </button>
              </div>
              
              <p className="text-xs text-purple-700 dark:text-purple-300 mt-2">
                模擬所有用戶更新個人資料，將資料庫中的生日同步到 Calendar 與資料庫
              </p>

              {syncResult && (
                <div className="mt-3 p-3 bg-white dark:bg-slate-800 rounded-lg">
                  <p className="text-sm font-bold text-green-600 dark:text-green-400 mb-2">
                    ✅ 同步完成！
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    成功：{syncResult.synced} / {syncResult.total}
                    {syncResult.failed > 0 && ` | 失敗：${syncResult.failed}`}
                  </p>
                  {syncResult.details && syncResult.details.length > 0 && (
                    <div className="mt-2 max-h-40 overflow-y-auto text-xs text-slate-600 dark:text-slate-400">
                      {syncResult.details.map((item, idx) => (
                        <div key={idx} className="py-1">
                          {item.status === 'success' ? '✅' : '❌'} {item.name} ({item.birthday})
                          {item.eventsCreated !== undefined && ` - ${item.eventsCreated} 個行程`}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="h-8" />
        </div>
      </div>
    </>
  )
}
