/**
 * 共用版面：包含標題列與底部導航
 */

import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';

export default function Layout() {
  return (
    <div className="min-h-screen bg-bg-page text-text-main font-sans">
      <main className="container mx-auto max-w-full px-4 pt-3 pb-4 overflow-x-hidden">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
