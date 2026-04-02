import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'

const DEFAULT_ITEMS = [
  {
    label: '新增行程',
    path: '/add-event',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="3"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="12" y1="11" x2="12" y2="17"/>
        <line x1="9" y1="14" x2="15" y2="14"/>
      </svg>
    ),
  },
  {
    label: '上傳財力',
    path: '/financial-upload',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
    ),
  },
  {
    label: '修改數據',
    path: '/user-stats/edit',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
    ),
  },
]

// 預設主按鈕 icon：+
const DEFAULT_ICON = (open) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.5" strokeLinecap="round"
    style={{ transition: 'transform 0.25s ease', transform: open ? 'rotate(45deg)' : 'rotate(0)' }}
  >
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)

// 鉛筆 icon
const PENCIL_ICON = (open) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ transition: 'transform 0.25s ease', transform: open ? 'rotate(-15deg)' : 'rotate(0)' }}
  >
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)

const ITEM_SIZE = 44
const ITEM_GAP = 10
const FAB_SIZE = 56

export default function FabAction({ onOpen, items, fabIcon, fabColor }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  const actionItems = items || DEFAULT_ITEMS
  const renderIcon = fabIcon || DEFAULT_ICON
  const bgColor = fabColor || '#4A7C59'

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

      <div style={{ position: 'fixed', bottom: 24, right: 16, width: FAB_SIZE, height: FAB_SIZE, zIndex: 50 }}>
        {actionItems.map((item, i) => {
          const bottomOffset = FAB_SIZE + ITEM_GAP + i * (ITEM_SIZE + ITEM_GAP)
          return (
            <div
              key={item.label}
              style={{
                position: 'absolute',
                bottom: bottomOffset,
                right: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                opacity: open ? 1 : 0,
                transform: open ? 'translateY(0)' : 'translateY(12px)',
                transition: 'opacity 0.2s ease, transform 0.2s ease',
                transitionDelay: open ? `${i * 40}ms` : `${(actionItems.length - 1 - i) * 25}ms`,
                pointerEvents: open ? 'auto' : 'none',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{
                fontSize: 12, fontWeight: 500,
                padding: '4px 10px', borderRadius: 999,
                background: item.labelBg || '#fff',
                color: item.labelColor || '#2C2C2C',
                border: `1px solid ${item.labelBorderColor || '#E2DED8'}`,
                boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
              }}>
                {item.label}
              </span>
              <button
                onClick={() => {
                  setOpen(false)
                  if (item.onClick) item.onClick()
                  else if (item.path) navigate(item.path)
                }}
                style={{
                  width: ITEM_SIZE, height: ITEM_SIZE, flexShrink: 0,
                  borderRadius: '50%',
                  background: item.btnBg || '#fff',
                  border: `1.5px solid ${item.btnBorderColor || '#E2DED8'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: item.btnColor || '#4A7C59',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                  cursor: 'pointer',
                }}
              >
                {item.icon}
              </button>
            </div>
          )
        })}

        <button
          onClick={toggle}
          style={{
            position: 'absolute', bottom: 0, right: 0,
            width: FAB_SIZE, height: FAB_SIZE,
            borderRadius: '50%', background: bgColor, color: '#fff',
            border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(0,0,0,0.22)', cursor: 'pointer',
          }}
          aria-label="操作選單"
        >
          {renderIcon(open)}
        </button>
      </div>
    </>,
    document.body
  )
}

// 匯出預設 icon 供其他頁面使用
export { PENCIL_ICON }
