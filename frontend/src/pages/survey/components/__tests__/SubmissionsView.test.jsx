import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import SubmissionsView from '../SubmissionsView'

const FORM = {
  id: 1,
  title: '康九冠軍調查',
  fields: [
    { key: 'name', label: '姓名', type: 'searchable_select' },
    { key: 'star_rank', label: '夥伴星等', type: 'searchable_select' },
    { key: 'recommender', label: '推薦人', type: 'searchable_select' },
    { key: 'join_master', label: '天驥加盟主', type: 'yesno' },
  ],
}

const SUBS = [
  { id: 1, answers: { name: '徐毓紘', star_rank: '橙', recommender: '李冠陞', join_master: 'yes' } },
  { id: 2, answers: { name: '曹琬琦', star_rank: '橙', recommender: '李冠陞', join_master: 'no' } },
  { id: 3, answers: { name: '黃仲龍', star_rank: '綠', recommender: '曹琬琦', join_master: 'yes' } },
  { id: 4, answers: { name: '李冠陞', star_rank: '紫', recommender: '', join_master: 'no' } },
]

const cardCount = () => screen.queryAllByTestId('submission-card').length

describe('SubmissionsView', () => {
  it('渲染所有明細卡片', () => {
    render(<SubmissionsView form={FORM} submissions={SUBS} />)
    expect(cardCount()).toBe(4)
    expect(screen.getByText('共 4 筆')).toBeInTheDocument()
  })

  it('點課程欄 chip「天驥加盟主」→ 只留該欄 Yes（2 筆）', () => {
    render(<SubmissionsView form={FORM} submissions={SUBS} />)
    // chip 與欄位 label 同名，取第一個（篩選列 chip）
    fireEvent.click(screen.getAllByText('天驥加盟主')[0])
    expect(cardCount()).toBe(2)
    expect(screen.getByText(/已篩選/)).toBeInTheDocument()
  })

  it('點姓名「李冠陞」→ 推薦人=李冠陞 + 本人（3 筆）', () => {
    render(<SubmissionsView form={FORM} submissions={SUBS} />)
    fireEvent.click(screen.getByRole('button', { name: '李冠陞' }))
    expect(cardCount()).toBe(3)
  })

  it('點星等「綠」→ 只留綠星（1 筆）', () => {
    render(<SubmissionsView form={FORM} submissions={SUBS} />)
    fireEvent.click(screen.getByRole('button', { name: '綠' }))
    expect(cardCount()).toBe(1)
  })

  it('同一 chip 再點 → 取消篩選（回 4 筆）', () => {
    render(<SubmissionsView form={FORM} submissions={SUBS} />)
    const chip = screen.getAllByText('天驥加盟主')[0]
    fireEvent.click(chip)
    expect(cardCount()).toBe(2)
    fireEvent.click(chip)
    expect(cardCount()).toBe(4)
  })

  it('清除篩選按鈕 → 回全部', () => {
    render(<SubmissionsView form={FORM} submissions={SUBS} />)
    fireEvent.click(screen.getByRole('button', { name: '綠' }))
    expect(cardCount()).toBe(1)
    fireEvent.click(screen.getByText('清除篩選'))
    expect(cardCount()).toBe(4)
  })

  it('無填寫資料 → 顯示尚無填寫資料', () => {
    render(<SubmissionsView form={FORM} submissions={[]} />)
    expect(screen.getByText('尚無填寫資料')).toBeInTheDocument()
  })
})
