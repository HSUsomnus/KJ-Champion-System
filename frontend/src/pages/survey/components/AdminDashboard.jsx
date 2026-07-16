/**
 * 後台儀表板容器（Change 20，Section 4–5）
 * 側邊欄任務清單 + 主視圖（儀表板完成狀況 / 明細檢視切換）。
 * 選定任務後首屏預設顯示完成進度。手機單欄堆疊、桌面左欄 + 右主視圖（md: 斷點）。
 */

import { useEffect, useState } from 'react'
import { getAdminForms, getFormAttendance, getFormSubmissions } from '../../../services/surveyApi'
import TaskSidebar from './TaskSidebar'
import AttendanceView from './AttendanceView'
import SubmissionsView from './SubmissionsView'

const VIEWS = [
  { key: 'dashboard', label: '完成狀況' },
  { key: 'detail', label: '明細' },
]

export default function AdminDashboard() {
  const [forms, setForms] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [view, setView] = useState('dashboard')
  const [attendance, setAttendance] = useState(null)
  const [detail, setDetail] = useState(null)
  const [loadingForms, setLoadingForms] = useState(true)
  const [loadingView, setLoadingView] = useState(false)
  const [error, setError] = useState('')

  // 載入任務清單，預設選第一個
  useEffect(() => {
    getAdminForms()
      .then((res) => {
        setForms(res.data)
        if (res.data.length > 0) setSelectedId(res.data[0].id)
      })
      .catch((err) => setError(err.message || '讀取任務清單失敗'))
      .finally(() => setLoadingForms(false))
  }, [])

  // 切換任務或視圖 → 讀對應資料
  useEffect(() => {
    if (selectedId == null) {
      setAttendance(null)
      setDetail(null)
      return
    }
    setLoadingView(true)
    setError('')

    const fetcher =
      view === 'detail'
        ? getFormSubmissions(selectedId).then((res) => setDetail(res.data))
        : getFormAttendance(selectedId).then((res) => setAttendance(res.data))

    fetcher
      .catch((err) => setError(err.message || '讀取資料失敗'))
      .finally(() => setLoadingView(false))
  }, [selectedId, view])

  const selectTask = (id) => {
    setSelectedId(id)
    setView('dashboard') // 切任務時回到首屏完成狀況
  }

  if (loadingForms) {
    return <p style={{ fontSize: 14, color: '#8A8680' }}>載入任務中...</p>
  }

  return (
    <div className="flex flex-col md:flex-row" style={{ gap: 24 }}>
      <TaskSidebar forms={forms} selectedId={selectedId} onSelect={selectTask} />

      <main className="flex-1 min-w-0">
        {forms.length === 0 ? (
          <p style={{ fontSize: 14, color: '#8A8680' }}>目前沒有任何任務。</p>
        ) : (
          <>
            {/* 視圖切換 pill tab（儀表板 / 明細） */}
            <div
              style={{ display: 'flex', background: '#EFEDE9', borderRadius: 20, padding: 3, marginBottom: 16, maxWidth: 240 }}
            >
              {VIEWS.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => setView(v.key)}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    fontSize: 12,
                    fontWeight: view === v.key ? 500 : 400,
                    padding: '6px 4px',
                    borderRadius: 16,
                    border: 'none',
                    cursor: 'pointer',
                    background: view === v.key ? '#4A7C59' : 'transparent',
                    color: view === v.key ? '#fff' : '#2C2C2C',
                    transition: 'background 0.15s, color 0.15s',
                  }}
                >
                  {v.label}
                </button>
              ))}
            </div>

            {error && <p style={{ fontSize: 13, color: '#C0392B', marginBottom: 12 }}>{error}</p>}

            {loadingView ? (
              <p style={{ fontSize: 14, color: '#8A8680' }}>載入中...</p>
            ) : view === 'detail' ? (
              detail && <SubmissionsView form={detail.form} submissions={detail.submissions} />
            ) : (
              <AttendanceView attendance={attendance} />
            )}
          </>
        )}
      </main>
    </div>
  )
}
