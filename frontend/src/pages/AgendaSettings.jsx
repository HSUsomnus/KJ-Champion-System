import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../services/api'

const TARGET_OPTIONS = [
  { value: 'all', label: '全體用戶' },
  { value: 'manager_above', label: '管理者以上' },
  { value: 'developer', label: '開發者' },
]

// 遵循 DESIGN_SYSTEM.md：禁用 emoji、圓形元素為主視覺、Warm Minimal 色彩
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

  // Eruda 開關：讀 localStorage，切換時寫入 localStorage（重整生效）
  const [erudaEnabled, setErudaEnabled] = useState(
    () => typeof window !== 'undefined' && localStorage.getItem('erudaEnabled') === 'true'
  )
  const [erudaHint, setErudaHint] = useState('')

  const inputStyle = { background: '#F7F5F2', border: '1px solid #E2DED8', color: '#2C2C2C' }
  const cardStyle = { background: '#fff', border: '1px solid #E2DED8' }

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

  const toggleEruda = () => {
    const next = !erudaEnabled
    setErudaEnabled(next)
    localStorage.setItem('erudaEnabled', next ? 'true' : 'false')
    setErudaHint(next ? '已啟用，重新整理頁面後生效' : '已關閉，重新整理頁面後生效')
    setTimeout(() => setErudaHint(''), 4000)
  }

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
      setSavedMsg('設定已儲存')
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

  // Toggle UI：全 inline style（避免 Tailwind JIT 漏掃 class 導致 knob 不見）
  // 尺寸：軌道 48x28 / knob 24x24 / 左右留白 2px
  const Toggle = ({ on, onClick, label }) => (
    <button
      onClick={onClick}
      aria-label={label}
      style={{
        position: 'relative',
        width: 48,
        height: 28,
        borderRadius: 999,
        border: 'none',
        padding: 0,
        flexShrink: 0,
        cursor: 'pointer',
        background: on ? '#4A7C59' : '#D0CCC5',
        transition: 'background-color 0.2s ease',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: 2,
          width: 24,
          height: 24,
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
          transform: on ? 'translateX(20px)' : 'translateX(0)',
          transition: 'transform 0.2s ease',
        }}
      />
    </button>
  )

  if (!isDeveloper) {
    return (
      <div className="min-h-screen" style={{ background: '#F7F5F2' }}>
        <main className="pt-14 pb-24 px-4">
          <div className="max-w-md mx-auto text-center rounded-2xl p-8" style={cardStyle}>
            <p className="text-sm mb-2" style={{ color: '#2C2C2C', fontWeight: 600 }}>無存取權限</p>
            <p className="text-xs mb-4" style={{ color: '#8A8680' }}>僅「開發者」角色可進入此頁面</p>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 rounded-xl text-sm"
              style={{ background: '#2C2C2C', color: '#fff' }}
            >
              回首頁
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#F7F5F2' }}>
      <main className="pt-14 pb-24 px-4">
        <div className="max-w-md mx-auto space-y-4">
          <h1 className="text-lg font-bold" style={{ color: '#2C2C2C' }}>開發者設定</h1>

          {/* ===== 區塊 1：除錯工具 ===== */}
          <section>
            <p className="text-xs font-semibold mb-2 pl-1" style={{ color: '#8A8680', letterSpacing: '0.06em' }}>除錯工具</p>
            <div className="rounded-2xl overflow-hidden" style={cardStyle}>
              <div className="px-4 py-4 flex items-center justify-between">
                <div className="pr-3">
                  <p className="text-sm font-medium" style={{ color: '#2C2C2C' }}>Eruda 手機除錯面板</p>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: '#8A8680' }}>
                    開啟後網頁右下角出現綠色按鈕，點擊可查看 Console、Network、Elements
                  </p>
                </div>
                <Toggle on={erudaEnabled} onClick={toggleEruda} label="切換 Eruda" />
              </div>
              {erudaHint && (
                <p className="px-4 pb-3 text-xs" style={{ color: '#4A7C59' }}>{erudaHint}</p>
              )}
            </div>
          </section>

          {/* ===== 區塊 2：每日行程推播 ===== */}
          <section>
            <p className="text-xs font-semibold mb-2 pl-1" style={{ color: '#8A8680', letterSpacing: '0.06em' }}>每日行程推播</p>
            {loading ? (
              <div className="rounded-2xl p-8 text-center" style={cardStyle}>
                <p className="text-sm" style={{ color: '#8A8680' }}>載入中...</p>
              </div>
            ) : (
              <div className="rounded-2xl overflow-hidden" style={cardStyle}>
                {/* 啟用/停用 */}
                <div className="px-4 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #E2DED8' }}>
                  <div className="pr-3">
                    <p className="text-sm font-medium" style={{ color: '#2C2C2C' }}>推播狀態</p>
                    <p className="text-xs mt-1" style={{ color: '#8A8680' }}>停用時排程不會執行</p>
                  </div>
                  <Toggle on={form.enabled} onClick={() => set('enabled', !form.enabled)} label="切換啟用狀態" />
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
              className="w-full mt-3 py-3 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-50"
              style={{ background: '#2C2C2C', color: '#fff' }}
            >
              {saving ? '儲存中...' : '儲存設定'}
            </button>
            {savedMsg && (
              <p className="text-center text-xs mt-2" style={{ color: '#4A7C59' }}>{savedMsg}</p>
            )}
          </section>

          {/* ===== 區塊 3：手動觸發 ===== */}
          <section>
            <p className="text-xs font-semibold mb-2 pl-1" style={{ color: '#8A8680', letterSpacing: '0.06em' }}>測試</p>
            <div className="rounded-2xl p-4" style={cardStyle}>
              <p className="text-sm font-medium mb-1" style={{ color: '#2C2C2C' }}>立即推播明日行程</p>
              <p className="text-xs mb-3" style={{ color: '#8A8680' }}>手動觸發一次，推給當前設定的對象</p>
              <button
                onClick={handlePushNow}
                disabled={pushing}
                className="w-full py-2.5 rounded-xl text-sm font-medium transition-opacity disabled:opacity-50"
                style={{ background: '#4A7C59', color: '#fff' }}
              >
                {pushing ? '推播中...' : '立即推播'}
              </button>

              {pushResult && (
                <div className="mt-3 p-3 rounded-xl" style={{ background: '#F7F5F2' }}>
                  {pushResult.skipped ? (
                    <p className="text-xs" style={{ color: '#8A8680' }}>
                      已跳過推播（{pushResult.reason === 'no_events' ? '明日無行程' : pushResult.reason === 'disabled' ? '已停用' : pushResult.reason}）
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
          </section>

          {error && (
            <div className="p-3 rounded-xl text-xs" style={{ background: '#FEE', color: '#EA4335', border: '1px solid #FCC' }}>
              {error}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
