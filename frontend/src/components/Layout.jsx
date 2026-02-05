import { Outlet, useLocation } from 'react-router-dom'
import BottomNav from './BottomNav'

export default function Layout() {
  const location = useLocation()

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto relative overflow-hidden bg-background-light dark:bg-background-dark">
      <main className="flex-1 flex flex-col overflow-hidden">
        <Outlet />
      </main>
      <BottomNav currentPath={location.pathname} />
    </div>
  )
}
