import { Outlet } from 'react-router-dom'
import SidebarNav from './SidebarNav'

// [設計決策] 欄寬由 main.jsx 在 React render 前同步計算（pickColWidth），
// 依視窗高度從市面標準手機比例中選最合適的一個，整個 session 固定不變。
// 避免換頁時 svh 浮動導致欄寬跳動、文字排版錯位。
export default function Layout() {
  return (
    <>
      <SidebarNav />
      <div data-testid="layout-column" style={{ width: '100%', maxWidth: 'var(--col-max-w, 448px)', marginInline: 'auto' }}>
        <Outlet />
      </div>
    </>
  )
}
