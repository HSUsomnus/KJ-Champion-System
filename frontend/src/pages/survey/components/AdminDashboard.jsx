/**
 * 後台儀表板容器（Change 20，Section 4）
 * 側邊欄任務清單 + 首屏完成狀況儀表板。選定任務後首屏預設顯示完成進度。
 * 手機單欄堆疊、桌面左欄 + 右主視圖（md: 斷點）。
 */

import { useEffect, useState } from 'react'
import { getAdminForms, getFormAttendance } from '../../../services/surveyApi'
import TaskSidebar from './TaskSidebar'
import AttendanceView from './AttendanceView'

export default function AdminDashboard() {
  const [forms, setForms] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [attendance, setAttendance] = useState(null)
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

  // 切換任務 → 讀該任務完成狀況
  useEffect(() => {
    if (selectedId == null) {
      setAttendance(null)
      return
    }
    setLoadingView(true)
    setError('')
    getFormAttendance(selectedId)
      .then((res) => setAttendance(res.data))
      .catch((err) => setError(err.message || '讀取完成狀況失敗'))
      .finally(() => setLoadingView(false))
  }, [selectedId])

  if (loadingForms) {
    return <p style={{ fontSize: 14, color: '#8A8680' }}>載入任務中...</p>
  }

  return (
    <div className="flex flex-col md:flex-row" style={{ gap: 24 }}>
      <TaskSidebar forms={forms} selectedId={selectedId} onSelect={setSelectedId} />

      <main className="flex-1 min-w-0">
        {error && (
          <p style={{ fontSize: 13, color: '#C0392B', marginBottom: 12 }}>{error}</p>
        )}
        {forms.length === 0 ? (
          <p style={{ fontSize: 14, color: '#8A8680' }}>目前沒有任何任務。</p>
        ) : loadingView ? (
          <p style={{ fontSize: 14, color: '#8A8680' }}>載入完成狀況中...</p>
        ) : (
          <AttendanceView attendance={attendance} />
        )}
      </main>
    </div>
  )
}
