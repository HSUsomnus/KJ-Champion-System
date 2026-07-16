/**
 * 完成度 meter（Change 20 儀表板）
 * 單一色調 magnitude meter：done/total → 墨綠填色軌道 + 「done/total」文字。
 * 非多序列分類圖，無配色 CVD 問題；用設計系統 accent(#4A7C59) 填色、border 作軌道。
 */

export default function ProgressMeter({ done, total, height = 8, showLabel = true }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div
        role="progressbar"
        aria-valuenow={done}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`完成 ${done} / ${total}`}
        style={{
          flex: 1,
          height,
          background: '#EFEDE9',
          borderRadius: height,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: '#4A7C59',
            borderRadius: height,
            transition: 'width 0.25s ease',
          }}
        />
      </div>
      {showLabel && (
        <span style={{ fontSize: 12, fontWeight: 500, color: '#8A8680', whiteSpace: 'nowrap' }}>
          {done}/{total}
        </span>
      )}
    </div>
  )
}
