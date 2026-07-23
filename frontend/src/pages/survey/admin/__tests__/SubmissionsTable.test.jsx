import React from 'react'
import { render, screen, fireEvent, within } from '@testing-library/react'
import SubmissionsTable from '../SubmissionsTable'

const FORM = {
  id: 1,
  fields: [
    { key: 'name', label: '姓名', type: 'searchable_select', options: { source: 'survey_members' } },
    { key: 'star_rank', label: '星等', type: 'searchable_select', options: { source: 'static', values: ['白', '綠', '橙', '紅', '紫'] } },
    { key: 'recommender', label: '推薦人', type: 'searchable_select', options: { source: 'survey_members' } },
    { key: 'join_master', label: '天驥加盟主', type: 'yesno' },
    { key: 'tree_path', label: '實踐路徑樹', type: 'yesno' },
  ],
}

const SUBMISSIONS = [
  { id: 1, answers: { name: '徐毓紘', star_rank: '橙', recommender: '李冠陞', join_master: 'yes', tree_path: 'no' } },
  { id: 2, answers: { name: '曹琬琦', star_rank: '橙', recommender: '李冠陞', join_master: 'no', tree_path: 'yes' } },
  { id: 3, answers: { name: '徐毓紘', star_rank: '橙', recommender: '李冠陞', join_master: 'no', tree_path: 'no' } },
  { id: 4, answers: { name: '林義淳', star_rank: '綠', recommender: '潘暻葶', join_master: 'yes', tree_path: 'no' } },
]

const rowCount = () => screen.getAllByRole('row').length - 1 // 扣掉表頭那一列

describe('SubmissionsTable', () => {
  it('全展開所有欄位，yesno 顯示 ✅/❎，同名重複並存不去重', () => {
    render(<SubmissionsTable form={FORM} submissions={SUBMISSIONS} />)

    expect(screen.getByRole('columnheader', { name: '姓名' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: '天驥加盟主' })).toBeInTheDocument()
    expect(rowCount()).toBe(4) // 徐毓紘出現兩列，不去重

    // 兩個 yesno 欄位（join_master/tree_path）× 4 列：id1 yes/no、id2 no/yes、id3 no/no、id4 yes/no
    const checks = screen.getAllByText('✅')
    const crosses = screen.getAllByText('❎')
    expect(checks).toHaveLength(3)
    expect(crosses).toHaveLength(5)
  })

  it('推薦人篩選：用下拉選「潘暻葶」只留下該推薦人底下的列', () => {
    render(<SubmissionsTable form={FORM} submissions={SUBMISSIONS} />)

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '潘暻葶' } })

    expect(rowCount()).toBe(1)
    expect(within(screen.getByRole('table')).getByText('林義淳')).toBeInTheDocument()
  })

  it('推薦人篩選：選回「全部」清空篩選', () => {
    render(<SubmissionsTable form={FORM} submissions={SUBMISSIONS} />)

    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: '潘暻葶' } })
    expect(rowCount()).toBe(1)

    fireEvent.change(select, { target: { value: '' } })
    expect(rowCount()).toBe(4)
  })

  it('星等篩選：點「綠」只留下星等為綠的列', () => {
    render(<SubmissionsTable form={FORM} submissions={SUBMISSIONS} />)

    fireEvent.click(screen.getByRole('button', { name: '綠' }))

    expect(rowCount()).toBe(1)
    expect(within(screen.getByRole('table')).getByText('林義淳')).toBeInTheDocument()
  })

  it('課程篩選：點「天驥加盟主」只留下該欄位為 yes 的列', () => {
    render(<SubmissionsTable form={FORM} submissions={SUBMISSIONS} />)

    fireEvent.click(screen.getByRole('button', { name: '天驥加盟主' }))

    expect(rowCount()).toBe(2) // id1, id4
  })

  it('單條件互斥：推薦人下拉選了之後再點按鈕型篩選，會取代前一個而非疊加', () => {
    render(<SubmissionsTable form={FORM} submissions={SUBMISSIONS} />)

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '潘暻葶' } }) // 1 列
    expect(rowCount()).toBe(1)

    fireEvent.click(screen.getByRole('button', { name: '天驥加盟主' })) // 換成課程條件
    expect(rowCount()).toBe(2) // id1, id4（推薦人篩選已失效，不是疊加成 0 或交集）
    expect(within(screen.getByRole('table')).getByText('林義淳')).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toHaveValue('') // 下拉也應退回「全部」
  })

  it('同鈕取消：再點一次目前生效的按鈕會清空篩選、回到全部', () => {
    render(<SubmissionsTable form={FORM} submissions={SUBMISSIONS} />)

    fireEvent.click(screen.getByRole('button', { name: '天驥加盟主' }))
    expect(rowCount()).toBe(2)

    fireEvent.click(screen.getByRole('button', { name: '天驥加盟主' }))
    expect(rowCount()).toBe(4)
  })

  it('篩選後無符合資料時顯示提示文字', () => {
    render(<SubmissionsTable form={FORM} submissions={SUBMISSIONS} />)

    fireEvent.click(screen.getByRole('button', { name: '紫' })) // 沒有人是紫

    expect(screen.getByText('沒有符合條件的資料')).toBeInTheDocument()
  })
})
