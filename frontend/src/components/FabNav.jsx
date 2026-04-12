import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
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
    label: '用戶數據',
    path: '/user-stats',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/>
        <line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
  },
  {
    label: '用戶財力',
    path: '/financial',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2"/>
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
        <line x1="12" y1="12" x2="12" y2="16"/>
        <line x1="10" y1="14" x2="14" y2="14"/>
      </svg>
    ),
  },
]

// 開發者限定項目（僅 role === '開發者' 可見）
const DEVELOPER_ITEMS = [
  {
    label: '推播設定',
    path: '/agenda-settings',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
    ),
  },
]

const ITEM_SIZE = 44
const ITEM_GAP = 10
const FAB_SIZE = 56

export default function FabNav({ onOpen }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { user } = useAuth()

  // 開發者才能看到推播設定等開發者限定項目
  const items = user?.role === '開發者'
    ? [...NAV_ITEMS, ...DEVELOPER_ITEMS]
    : NAV_ITEMS

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next && onOpen) onOpen()
  }

  return createPortal(
    <>
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(44,44,44,0.15)' }}
        />
      )}

      <div style={{ position: 'fixed', bottom: 24, left: 16, width: FAB_SIZE, height: FAB_SIZE, zIndex: 50 }}>
        {/* 子項：absolute 從主按鈕往上展開，不影響主按鈕位置 */}
        {items.map((item, i) => {
          const bottomOffset = FAB_SIZE + ITEM_GAP + i * (ITEM_SIZE + ITEM_GAP)
          return (
            <div
              key={item.path}
              style={{
                position: 'absolute',
                bottom: bottomOffset,
                left: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                opacity: open ? 1 : 0,
                transform: open ? 'translateY(0)' : 'translateY(12px)',
                transition: 'opacity 0.2s ease, transform 0.2s ease',
                transitionDelay: open ? `${i * 40}ms` : `${(items.length - 1 - i) * 25}ms`,
                pointerEvents: open ? 'auto' : 'none',
                whiteSpace: 'nowrap',
              }}
            >
              <button
                onClick={() => { setOpen(false); navigate(item.path) }}
                style={{
                  width: ITEM_SIZE, height: ITEM_SIZE, flexShrink: 0,
                  borderRadius: '50%',
                  background: '#fff',
                  border: '1.5px solid #E2DED8',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#4A7C59',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                  cursor: 'pointer',
                }}
              >
                {item.icon}
              </button>
              <span style={{
                fontSize: 12, fontWeight: 500,
                padding: '4px 10px', borderRadius: 999,
                background: '#fff', color: '#2C2C2C',
                border: '1px solid #E2DED8',
                boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
              }}>
                {item.label}
              </span>
            </div>
          )
        })}

        {/* 主 FAB：absolute 貼底，容器不會被撐高 */}
        <button
          onClick={toggle}
          style={{
            position: 'absolute', bottom: 0, left: 0,
            width: FAB_SIZE, height: FAB_SIZE,
            borderRadius: '50%', background: '#2C2C2C', color: '#fff',
            border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(0,0,0,0.22)', cursor: 'pointer',
          }}
          aria-label="導航選單"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ transition: 'transform 0.25s ease', transform: open ? 'rotate(45deg)' : 'rotate(0)' }}
          >
            {open
              ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
              : <><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></>
            }
          </svg>
        </button>
      </div>
    </>,
    document.body
  )
}
