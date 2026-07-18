/**
 * 任務清單側邊欄（Change 20）
 * 一張調查表單 = 一個進行中的任務。列出所有任務、顯示任務數、點選切換。
 * 單一 DOM 響應式：手機橫向捲動 chip 列，桌面固定左側直欄（md: 斷點）。
 */

export default function TaskSidebar({ forms, selectedId, onSelect, onNewTask }) {
  return (
    <aside className="w-full md:w-64 md:shrink-0">
      <div className="flex items-center justify-between mb-3">
        <span style={{ fontSize: 12, fontWeight: 600, color: '#8A8680', letterSpacing: '0.06em' }}>
          任務清單（{forms.length}）
        </span>
        {onNewTask && (
          <button
            type="button"
            onClick={onNewTask}
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: '#4A7C59',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            + 新任務
          </button>
        )}
      </div>

      {forms.length === 0 ? (
        <p style={{ fontSize: 13, color: '#8A8680' }}>尚無任務，點「新任務」建立第一張表單</p>
      ) : (
        <div className="flex gap-2 overflow-x-auto md:flex-col md:overflow-visible pb-1">
          {forms.map((f) => {
            const active = String(f.id) === String(selectedId)
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => onSelect(f.id)}
                className="whitespace-nowrap md:whitespace-normal text-left"
                style={{
                  flexShrink: 0,
                  padding: '10px 14px',
                  borderRadius: 16,
                  border: active ? '1.5px solid #4A7C59' : '1.5px solid #E2DED8',
                  background: active ? '#E8F0EB' : '#FFFFFF',
                  color: '#2C2C2C',
                  fontSize: 14,
                  fontWeight: active ? 600 : 500,
                  cursor: 'pointer',
                }}
              >
                <span style={{ display: 'block' }}>{f.title}</span>
                <span style={{ fontSize: 12, color: '#8A8680', fontWeight: 400 }}>
                  {f.status === 'published' ? '已發佈' : '草稿'} · {f.submission_count ?? 0} 筆
                </span>
              </button>
            )
          })}
        </div>
      )}
    </aside>
  )
}
