import { describe, it, expect } from 'vitest'
import {
  isSameFilter,
  toggleFilter,
  applySubmissionFilter,
  describeFilter,
} from '../submissionFilter'

const SUBS = [
  { id: 1, answers: { name: '徐毓紘', star_rank: '橙', recommender: '李冠陞', join_master: 'yes' } },
  { id: 2, answers: { name: '曹琬琦', star_rank: '橙', recommender: '李冠陞', join_master: 'no' } },
  { id: 3, answers: { name: '黃仲龍', star_rank: '綠', recommender: '曹琬琦', join_master: 'yes' } },
  { id: 4, answers: { name: '李冠陞', star_rank: '紫', recommender: '', join_master: 'no' } },
]

const FIELDS = [
  { key: 'name', label: '姓名', type: 'searchable_select' },
  { key: 'star_rank', label: '夥伴星等', type: 'searchable_select' },
  { key: 'recommender', label: '推薦人', type: 'searchable_select' },
  { key: 'join_master', label: '天驥加盟主', type: 'yesno' },
]

describe('isSameFilter', () => {
  it('type + value 皆同 → true', () => {
    expect(isSameFilter({ type: 'star', value: '橙' }, { type: 'star', value: '橙' })).toBe(true)
  })
  it('任一不同或有 null → false', () => {
    expect(isSameFilter({ type: 'star', value: '橙' }, { type: 'star', value: '綠' })).toBe(false)
    expect(isSameFilter(null, { type: 'star', value: '橙' })).toBe(false)
  })
})

describe('toggleFilter（單條件互斥）', () => {
  it('點相同條件 → 取消（null）', () => {
    const cur = { type: 'star', value: '橙' }
    expect(toggleFilter(cur, { type: 'star', value: '橙' })).toBeNull()
  })
  it('點新條件 → 取代', () => {
    const cur = { type: 'star', value: '橙' }
    expect(toggleFilter(cur, { type: 'column', value: 'join_master' })).toEqual({
      type: 'column',
      value: 'join_master',
    })
  })
})

describe('applySubmissionFilter', () => {
  it('null → 全部', () => {
    expect(applySubmissionFilter(SUBS, null)).toHaveLength(4)
  })

  it('點姓名「李冠陞」→ 推薦人=李冠陞 + 本人', () => {
    const res = applySubmissionFilter(SUBS, { type: 'name', value: '李冠陞' })
    const names = res.map((s) => s.answers.name)
    // 徐毓紘/曹琬琦（推薦人=李冠陞）+ 李冠陞本人
    expect(names).toEqual(['徐毓紘', '曹琬琦', '李冠陞'])
  })

  it('點星等「橙」→ 只留橙星', () => {
    const res = applySubmissionFilter(SUBS, { type: 'star', value: '橙' })
    expect(res.map((s) => s.id)).toEqual([1, 2])
  })

  it('點課程欄 join_master → 只留該欄 Yes', () => {
    const res = applySubmissionFilter(SUBS, { type: 'column', value: 'join_master' })
    expect(res.map((s) => s.id)).toEqual([1, 3])
  })
})

describe('describeFilter', () => {
  it('column 型態顯示欄位 label + 是', () => {
    expect(describeFilter({ type: 'column', value: 'join_master' }, FIELDS)).toBe('天驥加盟主：是')
  })
  it('star / name 型態', () => {
    expect(describeFilter({ type: 'star', value: '橙' }, FIELDS)).toBe('星等：橙')
    expect(describeFilter({ type: 'name', value: '李冠陞' }, FIELDS)).toBe('推薦人／本人：李冠陞')
  })
  it('null → 空字串', () => {
    expect(describeFilter(null, FIELDS)).toBe('')
  })
})
