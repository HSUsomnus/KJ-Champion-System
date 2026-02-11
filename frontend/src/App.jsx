import { Routes, Route, Navigate } from 'react-router-dom'
import { useLiff } from './context/LiffContext'
import Layout from './components/Layout'
import CalendarPage from './pages/CalendarPage'
import MembersPage from './pages/MembersPage'
import AddEventPage from './pages/AddEventPage'
import EventDetailPage from './pages/EventDetailPage'
import ListPage from './pages/ListPage'
import ProfilePage from './pages/ProfilePage'
import RoleManagementPage from './pages/RoleManagementPage'

/** LIFF 未登入時顯示的登入區塊 */
function LoginOverlay() {
  const { login, error } = useLiff()
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-primary to-primary-dark p-6">
      <p className="text-white text-center mb-6">請使用 LINE 登入以使用行事曆</p>
      <button
        type="button"
        onClick={login}
        className="px-8 py-3 bg-white text-primary font-bold rounded-full shadow-lg hover:shadow-xl transition-shadow"
      >
        使用 LINE 登入
      </button>
      {error && <p className="text-white/90 text-sm mt-4">{error}</p>}
    </div>
  )
}

export default function App() {
  const { isReady, isLoggedIn } = useLiff()

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <p className="text-slate-500">載入中...</p>
      </div>
    )
  }

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 min-h-screen selection:bg-primary selection:text-white">
      {!isLoggedIn && <LoginOverlay />}
      <div className={!isLoggedIn ? 'pointer-events-none opacity-50' : ''}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<CalendarPage />} />
            <Route path="list" element={<ListPage />} />
            <Route path="members" element={<MembersPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="add-event" element={<AddEventPage />} />
            <Route path="event/:id" element={<EventDetailPage />} />
            <Route path="admin/roles" element={<RoleManagementPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  )
}
