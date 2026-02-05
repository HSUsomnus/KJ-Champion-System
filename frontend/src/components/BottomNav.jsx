import { Link } from 'react-router-dom'

const navItems = [
  { path: '/', icon: 'calendar_month', label: '行事曆', fill: true },
  { path: '/list', icon: 'format_list_bulleted', label: '列表' },
  { path: '/members', icon: 'groups', label: '成員' },
  { path: '/profile', icon: 'person', label: '個人檔案' },
]

export default function BottomNav({ currentPath }) {
  return (
    <nav className="flex-none bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 px-6 flex justify-between items-center z-20 shadow-up h-[84px] pb-5 safe-area-pb">
      {navItems.map(({ path, icon, label, fill }) => {
        const isActive = path === '/' ? currentPath === '/' : currentPath.startsWith(path)
        return (
          <Link
            key={path}
            to={path}
            className={`flex flex-col items-center justify-center gap-1 w-16 transition-colors ${
              isActive ? 'text-primary' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
            }`}
          >
            <span className={`material-symbols-outlined text-[28px] ${isActive && fill ? 'fill-icon' : ''}`}>
              {icon}
            </span>
            <span className={`text-[11px] ${isActive ? 'font-bold' : 'font-medium'}`}>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
