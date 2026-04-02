import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import FabNav from '../components/FabNav'
import FabAction, { PENCIL_ICON } from '../components/FabAction'
import { useAuth } from '../contexts/AuthContext'

function formatBirthday(dateStr) {
  if (!dateStr) return '未設定'
  const parts = dateStr.split('-')
  if (parts.length >= 3) return `${parts[1]}/${parts[2]}`
  return dateStr
}

const INFO_ITEMS = [
  { label: '真實姓名', key: 'realName' },
  { label: 'Email', key: 'email' },
  { label: '電話號碼', key: 'phone' },
  { label: '生日', key: 'birthday', format: formatBirthday },
]

export default function Profile() {
  const { user, logout } = useAuth()
  const [activeFab, setActiveFab] = useState(null)
  const [hideProfile, setHideProfile] = useState(false)
  const navigate = useNavigate()

  const fabItems = [
    {
      label: '編輯資料',
      path: '/profile/edit',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      ),
    },
    {
      label: '登出',
      onClick: () => {
        logout()
        navigate('/login')
      },
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
      ),
    },
  ]

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F7F5F2' }}>
      <Header user={user} />

      <main className="flex-1 overflow-y-auto pt-16 pb-28 px-4">
        <div className="flex items-center justify-between mt-4 mb-4">
          <h1 className="text-base font-semibold" style={{ color: '#2C2C2C' }}>用戶資料</h1>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-xs" style={{ color: '#8A8680' }}>隱藏</span>
            <button
              type="button"
              role="switch"
              aria-checked={hideProfile}
              onClick={() => setHideProfile(v => !v)}
              className="relative w-10 h-[22px] rounded-full transition-colors"
              style={{ background: hideProfile ? '#4A7C59' : '#E2DED8' }}
            >
              <span className="absolute top-[2px] left-[2px] w-[18px] h-[18px] rounded-full bg-white shadow transition-transform" style={{ transform: hideProfile ? 'translateX(18px)' : 'translateX(0)' }} />
            </button>
          </label>
        </div>

        {/* 頭像區塊 */}
        <section className="rounded-2xl p-5 shadow-sm mb-3 flex items-center gap-4" style={{ background: '#fff', border: '1px solid #E2DED8' }}>
          {user?.pictureUrl ? (
            <img src={user.pictureUrl} alt="" className="w-14 h-14 rounded-full object-cover shrink-0" />
          ) : (
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold shrink-0"
              style={{ background: '#4A7C59', color: '#fff' }}
            >
              {(user?.realName || '?')[0]}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-base font-semibold truncate" style={{ color: '#2C2C2C' }}>{user?.realName}</p>
            <p className="text-xs truncate" style={{ color: '#8A8680' }}>{user?.displayName}</p>
          </div>
        </section>

        {/* 資料列表 */}
        <section>
          <div className="rounded-2xl shadow-sm overflow-hidden" style={{ background: '#fff', border: '1px solid #E2DED8' }}>
            {INFO_ITEMS.map((item, idx) => {
              const value = item.format ? item.format(user?.[item.key]) : user?.[item.key]
              return (
                <div
                  key={item.key}
                  className="flex items-center justify-between px-4 py-3.5"
                  style={{ borderBottom: idx < INFO_ITEMS.length - 1 ? '1px solid #E2DED8' : 'none' }}
                >
                  <span className="text-sm" style={{ color: '#8A8680' }}>{item.label}</span>
                  <span className="text-sm font-medium" style={{ color: '#2C2C2C' }}>{value || '未設定'}</span>
                </div>
              )
            })}
          </div>
        </section>
      </main>

      <FabNav onOpen={useCallback(() => setActiveFab('nav'), [])} />
      <FabAction
        items={fabItems}
        fabIcon={PENCIL_ICON}
        onOpen={useCallback(() => setActiveFab('action'), [])}
      />
    </div>
  )
}
