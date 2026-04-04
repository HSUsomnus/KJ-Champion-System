/**
 * TagBadge — 彩色標籤 pill badge
 * props: { name, color, bgColor, isSystem }
 */
export default function TagBadge({ name, color, bgColor, isSystem }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
      style={{ backgroundColor: bgColor || '#EFEDE9', color: color || '#8A8680' }}
    >
      {isSystem && (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-60">
          <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      )}
      {name}
    </span>
  )
}
