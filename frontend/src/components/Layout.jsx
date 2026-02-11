/**
 * 共用版面：包含標題列與底部導航
 * 與舊版 .container 一致：padding 16px、pt 12px、為底部導航留空間
 */

import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';

export default function Layout() {
  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#333] overflow-x-hidden">
      <main className="max-w-full mx-auto px-4 pt-3 pb-4 overflow-x-hidden" style={{ paddingTop: 12 }}>
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
