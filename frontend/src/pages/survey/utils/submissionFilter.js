/**
 * 明細篩選邏輯（Change 20，Section 5）— 純函式，單條件互斥。
 *
 * filter 形狀：null | { type, value }
 *   - type='name'   點姓名 → 篩「推薦人=該人」+ 本人（answers.recommender===value || answers.name===value）
 *   - type='star'   點星等 → 篩該星等（answers.star_rank===value）
 *   - type='column' 點課程/樹欄位標題 → 篩該欄 Yes（answers[value]==='yes'）
 *
 * 推薦人欄位不可點（不產生 filter），由 UI 端控制。
 */

export function isSameFilter(a, b) {
  if (!a || !b) return false
  return a.type === b.type && a.value === b.value
}

/**
 * 切換篩選：同條件再點 = 取消（回 null）；新條件取代舊條件（單條件互斥）。
 */
export function toggleFilter(current, next) {
  return isSameFilter(current, next) ? null : next
}

/**
 * 套用篩選到 submissions 陣列。
 */
export function applySubmissionFilter(submissions, filter) {
  if (!filter) return submissions

  return submissions.filter((s) => {
    const a = s.answers || {}
    switch (filter.type) {
      case 'name':
        return a.recommender === filter.value || a.name === filter.value
      case 'star':
        return a.star_rank === filter.value
      case 'column':
        return a[filter.value] === 'yes'
      default:
        return true
    }
  })
}

/**
 * 產生篩選條件的人類可讀描述（供 UI 顯示目前篩選）。
 */
export function describeFilter(filter, fields) {
  if (!filter) return ''
  if (filter.type === 'name') return `推薦人／本人：${filter.value}`
  if (filter.type === 'star') return `星等：${filter.value}`
  if (filter.type === 'column') {
    const f = (fields || []).find((x) => x.key === filter.value)
    return `${f ? f.label : filter.value}：是`
  }
  return ''
}
