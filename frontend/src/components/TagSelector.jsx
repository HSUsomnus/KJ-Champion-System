/**
 * TagSelector — 多選標籤選擇器
 * props: { allTags, selectedTagIds, onChange, onClose }
 */
import { useState } from 'react'
import TagBadge from './TagBadge'

const CATEGORIES = ['身份', '技能', '成就', '自訂']

export default function TagSelector({ allTags = [], selectedTagIds = [], onChange, onClose }) {
  const [search, setSearch] = useState('')

  const filtered = allTags.filter(t =>
    !t.isSystem && t.name.toLowerCase().includes(search.toLowerCase())
  )

  const grouped = CATEGORIES.map(cat => ({
    category: cat,
    tags: filtered.filter(t => t.category === cat),
  })).filter(g => g.tags.length > 0)

  const toggle = (tagId) => {
    const isSelected = selectedTagIds.includes(tagId)
    const next = isSelected
      ? selectedTagIds.filter(id => id !== tagId)
      : [...selectedTagIds, tagId]
    onChange(next)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="relative w-full max-w-md rounded-t-2xl shadow-lg max-h-[70vh] flex flex-col"
        style={{ background: '#F7F5F2' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #E2DED8' }}>
          <p className="text-sm font-semibold" style={{ color: '#2C2C2C' }}>選擇標籤</p>
          <button onClick={onClose} className="text-xs px-3 py-1.5 rounded-full font-medium transition-all active:scale-95" style={{ background: '#4A7C59', color: '#fff' }}>
            完成
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-2">
          <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: '#fff', border: '1px solid #E2DED8' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8A8680" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜尋標籤"
              className="flex-1 text-sm outline-none bg-transparent"
              style={{ color: '#2C2C2C' }}
            />
          </div>
        </div>

        {/* Tag list */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {grouped.length === 0 && (
            <p className="text-center text-xs py-8" style={{ color: '#8A8680' }}>沒有可選的標籤</p>
          )}
          {grouped.map(g => (
            <div key={g.category} className="mb-3">
              <p className="text-xs font-medium mb-2" style={{ color: '#8A8680' }}>{g.category}</p>
              <div className="flex flex-wrap gap-2">
                {g.tags.map(tag => {
                  const selected = selectedTagIds.includes(tag.id)
                  return (
                    <button
                      key={tag.id}
                      onClick={() => toggle(tag.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all active:scale-95"
                      style={{
                        backgroundColor: selected ? tag.bgColor : '#fff',
                        color: selected ? tag.color : '#8A8680',
                        border: `1.5px solid ${selected ? tag.color : '#E2DED8'}`,
                      }}
                    >
                      {selected && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                      {tag.name}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
