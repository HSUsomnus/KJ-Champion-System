import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import FabNav from '../components/FabNav'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../services/api'

const TARGET_OPTIONS = [
  { value: 'all', label: '全體用戶' },
  { value: 'manager_above', label: '管理者以上' },
  { value: 'developer', label: '開發者' },
]

export default function AgendaSettings() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const isDeveloper = user?.role === '開發者'

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pushing, setPushing] = useState(false)
  const [form, setForm] = useState({ time: '21:00', enabled: true, target: 'developer' })
  const [pushResult, setPushResult] = useState(null)
  const [error, setError] = useState('')
  const [savedMsg, setSavedMsg] = useState('')

  const inputStyle = { background: '#F7F5F2', border: '1px solid #E2DED8', color: '#2C2C2C' }

  useEffect(() => {
    if (!isDeveloper) {
      setLoading(false)
      return
    }
    let mounted = true
    ;(async () => {
      try {
        const res = await api.getAgendaSettings()
        if (mounted && res?.data) {
          setForm({
            time: res.data.time || '21:00',
            enabled: res.data.enabled !== false,
            target: res.data.target || 'developer',
          })
        }
      } catch (err) {
        if (mounted) setError(err.message || '讀取設定失敗')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [isDeveloper])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSavedMsg('')
    try {
      const res = await api.updateAgendaSettings(form)
      if (res?.data) {
        setForm({
          time: res.data.time,
          enabled: res.data.enabled,
          target: res.data.target,
        })
      }
      setSavedMsg('✅ 設定已儲存')
      setTimeout(() => setSavedMsg(''), 3000)
    } catch (err) {
      setError(err.message || '儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  const handlePushNow = async () => {
    setPushing(true)
    setPushResult(null)
    setError('')
    try {
      const res = await api.pushDailyAgenda()
      setPushResult(res?.data || {})
    } catch (err) {
      setError(err.message || '推播失敗')
    } finally {
      setPushing(false)
    }
  }

  if (!isDeveloper) {
    return (
      <div className="min-h-screen" style={{ background: '#F7F5F2' }}>
        <Header user={user} />
        <main className="pt-20 pb-24 px-4">
          <div className="max-w-md mx-auto text-center rounded-2xl p-8" style={{ background: '#fff', border: '1px solid #E2DED8' }}>
            <p className="text-sm mb-4" style={{ color: '#8A8680' }}>⛔ 無存取權限</p>
            <p className="text-xs mb-4" style={{ color: '#8A8680' }}>僅「開發者」角色可進入推播設定頁面</p>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 rounded-xl text-sm"
              style={{ background: '#4A7C59', color: '#fff' }}
            >
              回首頁
            </button>
          </div>
        </main>
        <FabNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#F7F5F2' }}>
      <Header user={user} />
      <main className="pt-20 pb-24 px-4">
        <div className="max-w-md mx-auto">
          <h1 className="text-lg font-bold mb-4" style={{ color: '#2C2C2C' }}>每日行程推播設定</h1>

          {loading ? (
            <div className="text-center py-8" style={{ color: '#8A8680' }}>載入中...</div>
          ) : (
            <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E2DED8' }}>
              {/* 啟用/停用 */}
              <div className="px-4 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #E2DED8' }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: '#2C2C2C' }}>推播狀態</p>
                  <p className="text-xs mt-1" style={{ color: '#8A8680' }}>停用時 cron 不會執行</p>
                </div>
                <button
                  onClick={() => set('enabled', !form.enabled)}
                  className="relative w-12 h-7 rounded-full transition-colors"
                  style={{ background: form.enabled ? '#4A7C59' : '#D0CCC5' }}
                  aria-label="切換啟用狀態"
                >
                  <span
                    className="absolute top-0.5 w-6 h-6 bg-white rounded-full transition-transform"
                    style={{ transform: form.enabled ? 'translateX(22px)' : 'translateX(2px)' }}
                  />
                </button>
              </div>

              {/* 推播時間 */}
              <div className="px-4 py-3.5" style={{ borderBottom: '1px solid #E2DED8' }}>
                <label className="block text-xs mb-1.5" style={{ color: '#8A8680' }}>推播時間（台北時間）</label>
                <input
                  type="time"
                  value={form.time}
                  onChange={e => set('time', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={inputStyle}
                />
              </div>

              {/* 推播對象 */}
              <div className="px-4 py-3.5">
                <label className="block text-xs mb-1.5" style={{ color: '#8A8680' }}>推播對象</label>
                <select
                  value={form.target}
                  onChange={e => set('target', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={inputStyle}
                >
                  {TARGET_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* 儲存按鈕 */}
          <button
            onClick={handleSave}
            disabled={loading || saving}
            className="w-full mt-4 py-3 rounded-xl text-sm font-medium transition-opacity disabled:opacity-50"
            style={{ background: '#4A7C59', color: '#fff' }}
          >
            {saving ? '儲存中...' : '💾 儲存設定'}
          </button>

          {savedMsg && (
            <p className="text-center text-xs mt-2" style={{ color: '#4A7C59' }}>{savedMsg}</p>
          )}

          {/* 立即推播 */}
          <div className="mt-6 rounded-2xl p-4" style={{ background: '#fff', border: '1px solid #E2DED8' }}>
            <p className="text-sm font-medium mb-2" style={{ color: '#2C2C2C' }}>手動觸發（測試）</p>
            <p className="text-xs mb-3" style={{ color: '#8A8680' }}>立即推播明日行程給當前設定的對象</p>
            <button
              onClick={handlePushNow}
              disabled={pushing}
              className="w-full py-2.5 rounded-xl text-sm font-medium transition-opacity disabled:opacity-50"
              style={{ background: '#2C2C2C', color: '#fff' }}
            >
              {pushing ? '推播中...' : '📤 立即推播明日行程'}
            </button>

            {pushResult && (
              <div className="mt-3 p-3 rounded-xl" style={{ background: '#F7F5F2' }}>
                {pushResult.skipped ? (
                  <p className="text-xs" style={{ color: '#8A8680' }}>
                    ⚠️ 跳過推播（{pushResult.reason === 'no_events' ? '明日無行程' : pushResult.reason === 'disabled' ? '已停用' : pushResult.reason}）
                  </p>
                ) : (
                  <div className="text-xs space-y-1" style={{ color: '#2C2C2C' }}>
                    <p>推送對象：{pushResult.totalMembers} 人</p>
                    <p>成功：{pushResult.sent} 人</p>
                    {pushResult.failed > 0 && <p style={{ color: '#EA4335' }}>失敗：{pushResult.failed} 人</p>}
                    <p>行程數：{pushResult.eventCount}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 p-3 rounded-xl text-xs" style={{ background: '#FEE', color: '#EA4335', border: '1px solid #FCC' }}>
              {error}
            </div>
          )}
        </div>
      </main>
      <FabNav />
    </div>
  )
}
