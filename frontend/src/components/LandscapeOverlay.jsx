export default function LandscapeOverlay() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#F7F5F2',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
      }}
    >
      {/* 旋轉手機 SVG 圖示 */}
      <svg
        width="64"
        height="64"
        viewBox="0 0 64 64"
        fill="none"
        stroke="#2C2C2C"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {/* 手機外框（橫向） */}
        <rect x="8" y="20" width="36" height="22" rx="4" />
        {/* 手機按鈕 */}
        <circle cx="44" cy="31" r="1.5" fill="#2C2C2C" stroke="none" />
        {/* 旋轉箭頭（順時針，從橫向旋回直立） */}
        <path d="M50 18 A18 18 0 0 1 50 46" />
        <polyline points="46,14 50,18 54,14" />
      </svg>

      <p style={{ fontSize: 16, color: '#2C2C2C', margin: 0 }}>
        請旋轉至直立模式
      </p>
    </div>
  )
}
