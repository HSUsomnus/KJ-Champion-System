import { createBrowserRouter, RouterProvider, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Home from './pages/Home'
import Calendar from './pages/Calendar'
import Members from './pages/Members'
import Profile from './pages/Profile'
import ProfileEdit from './pages/ProfileEdit'
import UserStatsEdit from './pages/UserStatsEdit'
import Financial from './pages/Financial'
import AddEvent from './pages/AddEvent'
import EventDetail from './pages/EventDetail'
import FinancialEdit from './pages/FinancialEdit'
import FinancialUpload from './pages/FinancialUpload'
import FinancialPreview from './pages/FinancialPreview'
import Management from './pages/Management'
import MemberDetail from './pages/MemberDetail'
import AgendaSettings from './pages/AgendaSettings'
import SurveyFill from './pages/survey/SurveyFill'

function ProtectedRoute() {
  const { user, loading, isProfileComplete, isStatsComplete } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F7F5F2' }}>
        <p className="text-sm" style={{ color: '#8A8680' }}>載入中...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // [設計決策] onboarding 強制流程：新用戶必須完成 用戶資料 → 用戶數據 順序
  // 原因：避免新用戶帶半套資料進主應用，違反業務邏輯
  // 若要修改：請先確認 isProfileComplete / isStatsComplete 判斷準則
  const path = location.pathname
  const profileComplete = isProfileComplete(user)
  const statsComplete = isStatsComplete(user)

  // 階段 1：未完成用戶資料 → 強制 /profile/edit
  if (!profileComplete && path !== '/profile/edit') {
    return <Navigate to="/profile/edit" replace />
  }
  // 階段 2：用戶資料完成，但用戶數據未完成 → 強制 /user-stats/edit（允許回頭改 /profile/edit）
  if (profileComplete && !statsComplete && path !== '/user-stats/edit' && path !== '/profile/edit') {
    return <Navigate to="/user-stats/edit" replace />
  }

  return <Outlet />
}

const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  { path: '/f/:token', element: <SurveyFill /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <Layout />,
        children: [
          { path: '/', element: <Home /> },
          { path: '/calendar', element: <Calendar /> },
          { path: '/members', element: <Members /> },
          { path: '/profile', element: <Profile /> },
          { path: '/profile/edit', element: <ProfileEdit /> },
          { path: '/user-stats', element: <Navigate to="/profile" replace /> },
          { path: '/user-stats/edit', element: <UserStatsEdit /> },
          { path: '/financial', element: <Financial /> },
          { path: '/financial/edit', element: <FinancialEdit /> },
          { path: '/add-event', element: <AddEvent /> },
          { path: '/event/:id', element: <EventDetail /> },
          { path: '/financial-upload', element: <FinancialUpload /> },
          { path: '/financial-preview', element: <FinancialPreview /> },
          { path: '/management', element: <Management /> },
          { path: '/member/:id', element: <MemberDetail /> },
          { path: '/agenda-settings', element: <AgendaSettings /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])

export default function App() {
  return <RouterProvider router={router} />
}
