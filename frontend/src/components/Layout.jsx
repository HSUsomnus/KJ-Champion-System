import { Outlet } from 'react-router-dom'
import SidebarNav from './SidebarNav'

// [設計決策] 欄寬依視窗高度決定，模擬手機直式比例
// 原因：固定 max-w-md (448px) 在桌機上比例失調；100svh/2 ≈ 手機寬度（9:18 比例）
// clamp 保護：最窄 375px（手機下限），最寬 500px；min(…, 100vw) 防橫向捲軸
const COL_MAX_W = 'min(clamp(375px, calc(100svh / 2), 500px), 100vw)'

export default function Layout() {
  return (
    <>
      <SidebarNav />
      <div data-testid="layout-column" style={{ maxWidth: COL_MAX_W, marginInline: 'auto' }}>
        <Outlet />
      </div>
    </>
  )
}
