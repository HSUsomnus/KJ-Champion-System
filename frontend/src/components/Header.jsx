import { useNavigate } from 'react-router-dom'

export default function Header({ user }) {
  const navigate = useNavigate()

  const handleRefresh = () => {
    window.location.reload()
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3"
      style={{ background: 'rgba(247,245,242,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #E2DED8' }}>
      {/* 左上角：Logo + 重新整理 */}
      <div className="flex items-center gap-2">
        <img
          src="/康九_logo.png"
          alt="KJ Champion"
          className="h-8 w-auto object-contain"
        />
        <button
          onClick={handleRefresh}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
          style={{ background: '#EFEDE9', color: '#8A8680' }}
          aria-label="重新整理"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
          </svg>
        </button>
      </div>

      {/* 右上角：用戶頭像 + 真實姓名 */}
      {user ? (
        <button
          onClick={() => navigate('/profile')}
          className="flex items-center gap-2 rounded-full px-3 py-1 transition-all active:scale-95"
          style={{ background: '#EFEDE9' }}
        >
          {user.pictureUrl ? (
            <img
              src={user.pictureUrl}
              alt={user.realName || user.displayName}
              className="w-7 h-7 rounded-full object-cover"
            />
          ) : (
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium"
              style={{ background: '#4A7C59', color: '#fff' }}>
              {(user.realName || user.displayName || '?')[0]}
            </div>
          )}
          <span className="text-sm font-medium" style={{ color: '#2C2C2C', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.realName || user.displayName}
          </span>
        </button>
      ) : (
        <button
          onClick={() => navigate('/login')}
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: '#EFEDE9', color: '#8A8680' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4"/>
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
          </svg>
        </button>
      )}
    </header>
  )
}
