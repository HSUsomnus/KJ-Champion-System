/**
 * 完成狀況儀表板（Change 20，副總核心，首屏預設視圖）
 * 頂部整體完成率（hero）+ 按推薦人分組的進度卡片。
 * 手機單欄堆疊、桌面多欄（grid auto-fill）。純呈現，資料由 prop 傳入。
 */

import ProgressMeter from './ProgressMeter'

// 星等對應暖調色點（僅作辨識，非圖表配色）
const STAR_COLOR = {
  白: '#B9B4AC',
  綠: '#4A7C59',
  橙: '#C9843E',
  紅: '#B5483D',
  紫: '#6B5B95',
}

function StarDot({ rank }) {
  return (
    <span
      title={`${rank}星`}
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: STAR_COLOR[rank] || '#B9B4AC',
        marginRight: 6,
        flexShrink: 0,
      }}
    />
  )
}

function MemberRow({ member }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 0',
        borderTop: '1px solid #F0EEEA',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', fontSize: 14, color: '#2C2C2C' }}>
        <StarDot rank={member.star_rank} />
        {member.name}
      </span>
      <span
        aria-label={member.completed ? '已完成' : '未完成'}
        style={{ fontSize: 14, color: member.completed ? '#4A7C59' : '#C9A9A5' }}
      >
        {member.completed ? '✅' : '❎'}
      </span>
    </div>
  )
}

function GroupCard({ group }) {
  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E2DED8',
        borderRadius: 16,
        padding: 16,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#2C2C2C' }}>{group.recommender}</span>
      </div>
      <div style={{ marginBottom: 8 }}>
        <ProgressMeter done={group.done} total={group.total} />
      </div>
      <div>
        {group.members.map((m) => (
          <MemberRow key={m.name} member={m} />
        ))}
      </div>
    </div>
  )
}

export default function AttendanceView({ attendance }) {
  if (!attendance) return null
  const { form, overall, groups } = attendance

  return (
    <div>
      {/* 頂部整體完成率（hero，打開即見） */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2DED8',
          borderRadius: 16,
          padding: 20,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          marginBottom: 16,
        }}
      >
        <p style={{ fontSize: 12, fontWeight: 600, color: '#8A8680', letterSpacing: '0.06em', margin: '0 0 4px' }}>
          {form.title} · 整體完成率
        </p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 40, fontWeight: 600, color: '#2C2C2C', lineHeight: 1 }}>
            {overall.rate}%
          </span>
          <span style={{ fontSize: 14, color: '#8A8680' }}>
            {overall.done} / {overall.total} 人已完成
          </span>
        </div>
        <ProgressMeter done={overall.done} total={overall.total} height={10} showLabel={false} />
      </div>

      {/* 按推薦人分組的進度卡片：手機單欄、桌面多欄 */}
      {groups.length === 0 ? (
        <p style={{ fontSize: 14, color: '#8A8680', textAlign: 'center', padding: '24px 0' }}>
          尚無名單資料
        </p>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 12,
          }}
        >
          {groups.map((g) => (
            <GroupCard key={g.recommender} group={g} />
          ))}
        </div>
      )}
    </div>
  )
}
