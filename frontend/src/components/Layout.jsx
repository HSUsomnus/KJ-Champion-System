import { Outlet } from 'react-router-dom'
import SidebarNav from './SidebarNav'

export default function Layout() {
  return (
    <>
      <SidebarNav />
      <div className="max-w-md mx-auto">
        <Outlet />
      </div>
    </>
  )
}
