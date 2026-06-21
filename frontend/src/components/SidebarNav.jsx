import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const NAV_ITEMS = [
  {
    label: '主頁',
    path: '/',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    label: '行事曆',
    path: '/calendar',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="3"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
  {
    label: '成員列表',
    path: '/members',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="7" r="4"/>
        <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        <path d="M21 21v-2a4 4 0 0 0-3-3.85"/>
      </svg>
    ),
  },
  {
    label: '用戶資料',
    path: '/profile',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4"/>
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
      </svg>
    ),
  },
]

const DEVELOPER_ITEMS = [
  {
    label: '開發者設定',
    path: '/agenda-settings',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ),
  },
]

export default function SidebarNav() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()

  const items = user?.role === '開發者'
    ? [...NAV_ITEMS, ...DEVELOPER_ITEMS]
    : NAV_ITEMS

  const close = () => setOpen(false)

  const handleNav = (path) => {
    close()
    navigate(path)
  }

  const handleProfile = () => {
    close()
    navigate('/profile')
  }

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return createPortal(
    <>
      {/* 漢堡 FAB */}
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed', top: 16, left: 16, zIndex: 50,
          width: 40, height: 40, borderRadius: '50%',
          background: '#2C2C2C', color: '#fff', border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 10px rgba(0,0,0,0.22)', cursor: 'pointer',
        }}
        aria-label="開啟選單"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="6" x2="20" y2="6"/>
          <line x1="4" y1="12" x2="20" y2="12"/>
          <line x1="4" y1="18" x2="20" y2="18"/>
        </svg>
      </button>

      {/* 遮罩 */}
      {open && (
        <div
          onClick={close}
          style={{
            position: 'fixed', inset: 0, zIndex: 60,
            background: 'rgba(44,44,44,0.35)',
          }}
        />
      )}

      {/* 側邊欄 */}
      <div
        style={{
          position: 'fixed', top: 0, left: 0, bottom: 0,
          width: 220, zIndex: 70,
          background: '#fff',
          borderRight: '1px solid #E2DED8',
          display: 'flex', flexDirection: 'column',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s ease',
        }}
      >
        {/* 頂部：Logo + 重整 */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 14px 12px',
          borderBottom: '1px solid #E2DED8',
        }}>
          <img
            src="/康九_logo.png"
            alt="KJ Champion"
            style={{ height: 32, width: 'auto', objectFit: 'contain', cursor: 'pointer' }}
            onClick={() => handleNav('/')}
          />
          <button
            onClick={() => window.location.reload()}
            style={{
              width: 32, height: 32, borderRadius: '50%',
              background: '#EFEDE9', border: 'none', color: '#8A8680',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
            aria-label="重新整理"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
            </svg>
          </button>
        </div>

        {/* 導覽項目 */}
        <nav style={{ flex: 1, padding: '8px 8px', overflowY: 'auto' }}>
          {items.map((item) => {
            const active = isActive(item.path)
            return (
              <button
                key={item.path}
                onClick={() => handleNav(item.path)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 10px', borderRadius: 8, border: 'none',
                  background: active ? '#EFEDE9' : 'transparent',
                  color: active ? '#4A7C59' : '#2C2C2C',
                  cursor: 'pointer', marginBottom: 2,
                  textAlign: 'left',
                }}
              >
                <span style={{ color: active ? '#4A7C59' : '#8A8680', flexShrink: 0 }}>
                  {item.icon}
                </span>
                <span style={{ fontSize: 14, fontWeight: active ? 600 : 400 }}>
                  {item.label}
                </span>
              </button>
            )
          })}
        </nav>

        {/* 底部：用戶資訊 */}
        <button
          onClick={handleProfile}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 14px',
            border: 'none', borderTop: '1px solid #E2DED8',
            background: 'transparent', cursor: 'pointer',
            width: '100%', textAlign: 'left',
          }}
        >
          {user?.pictureUrl ? (
            <img
              src={user.pictureUrl}
              alt={user.realName || user.displayName}
              style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
            />
          ) : (
            <div style={{
              width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
              background: '#4A7C59', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 600,
            }}>
              {(user?.realName || user?.displayName || '?')[0]}
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: '#2C2C2C', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.realName || user?.displayName}
            </p>
            <p style={{ margin: 0, fontSize: 11, color: '#8A8680' }}>用戶資料</p>
          </div>
        </button>
      </div>
    </>,
    document.body
  )
}
