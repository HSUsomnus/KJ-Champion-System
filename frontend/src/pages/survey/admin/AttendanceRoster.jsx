function ProgressBar({ filled, total }) {
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, borderRadius: 3, background: '#EFEDE9', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: '#4A7C59', borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 12, color: '#8A8680', fontWeight: 500, flexShrink: 0 }}>
        {filled} / {total}
      </span>
    </div>
  )
}

function GroupCard({ group }) {
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 16, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#2C2C2C', margin: 0 }}>
          {group.recommender || '無推薦人'}
        </h3>
      </div>
      <div style={{ marginBottom: 12 }}>
        <ProgressBar filled={group.filled} total={group.total} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {group.members.map((member) => (
          <div
            key={member.name}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}
          >
            <span style={{ fontSize: 13, color: '#2C2C2C' }}>
              {member.name}
              {member.star_rank && (
                <span style={{ fontSize: 11, color: '#8A8680', marginLeft: 6 }}>{member.star_rank}</span>
              )}
            </span>
            <span style={{ fontSize: 14 }}>{member.filled ? '✅' : '❎'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AttendanceRoster({ attendance }) {
  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: '#8A8680', margin: '0 0 6px' }}>整體進度</p>
        <ProgressBar filled={attendance.totalFilled} total={attendance.totalMembers} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {attendance.groups.map((group) => (
          <GroupCard key={group.recommender || '__none__'} group={group} />
        ))}
      </div>
    </div>
  )
}
