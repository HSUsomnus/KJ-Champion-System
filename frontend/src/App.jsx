import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import Home from './pages/Home'
import Calendar from './pages/Calendar'
import Members from './pages/Members'
import Profile from './pages/Profile'
import ProfileEdit from './pages/ProfileEdit'
import UserStats from './pages/UserStats'
import UserStatsEdit from './pages/UserStatsEdit'
import Financial from './pages/Financial'
import AddEvent from './pages/AddEvent'
import EventDetail from './pages/EventDetail'
import FinancialUpload from './pages/FinancialUpload'
import Management from './pages/Management'
import MemberDetail from './pages/MemberDetail'

function ProtectedRoute() {
  const { user, loading } = useAuth()

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

  return <Outlet />
}

const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/calendar', element: <Calendar /> },
      { path: '/members', element: <Members /> },
      { path: '/profile', element: <Profile /> },
      { path: '/profile/edit', element: <ProfileEdit /> },
      { path: '/user-stats', element: <UserStats /> },
      { path: '/user-stats/edit', element: <UserStatsEdit /> },
      { path: '/financial', element: <Financial /> },
      { path: '/add-event', element: <AddEvent /> },
      { path: '/event/:id', element: <EventDetail /> },
      { path: '/financial-upload', element: <FinancialUpload /> },
      { path: '/management', element: <Management /> },
      { path: '/member/:id', element: <MemberDetail /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])

export default function App() {
  return <RouterProvider router={router} />
}
