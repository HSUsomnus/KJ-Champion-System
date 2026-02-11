/**
 * 底部導航欄
 * 與舊版 .bottom-nav / .nav-item 一致：高度約 52px、圖示 20px、文字 12px
 */

import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', icon: '📅', label: '行事曆' },
  { to: '/list', icon: '📋', label: '列表' },
  { to: '/members', icon: '👥', label: '成員' },
  { to: '/profile', icon: '👤', label: '個人' },
];

export default function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[1000] flex justify-around items-center bg-white border-t border-[#E0E0E0] min-h-[52px] py-1 pb-2"
      style={{ boxShadow: '0 -2px 8px rgba(0,0,0,0.1)', paddingBottom: 'max(6px, env(safe-area-inset-bottom))' }}
    >
      {navItems.map(({ to, icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-0.5 px-3 no-underline transition-colors text-[12px] font-semibold ${
              isActive ? 'text-[#06C755]' : 'text-[#666]'
            }`
          }
        >
          <span className="text-[20px] leading-none mb-0.5">{icon}</span>
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
