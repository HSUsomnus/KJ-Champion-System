/**
 * 底部導航欄
 * 與舊前端 .bottom-nav 對應
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
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around bg-card-bg border-t border-border shadow-[0_-2px_8px_rgba(0,0,0,0.08)] pb-[env(safe-area-inset-bottom)]">
      {navItems.map(({ to, icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-2 px-4 min-w-[64px] no-underline transition-colors ${
              isActive ? 'text-primary' : 'text-text-light'
            }`
          }
        >
          <span className="text-xl leading-none">{icon}</span>
          <span className="text-xs mt-0.5">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
