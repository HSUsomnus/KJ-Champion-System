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

// 點欄位表頭開啟篩選選單、再點選單裡的某個值
const filterBy = (headerLabel, optionLabel) => {
  fireEvent.click(screen.getByRole('button', { name: new RegExp(headerLabel) }))
  fireEvent.click(screen.getByRole('button', { name: optionLabel }))
}

describe('SubmissionsTable', () => {
  it('全展開所有欄位，yesno 顯示 ✅/❎，同名重複並存不去重', () => {
    render(<SubmissionsTable form={FORM} submissions={SUBMISSIONS} />)

    expect(screen.getByRole('columnheader', { name: '姓名' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /天驥加盟主/ })).toBeInTheDocument()
    expect(rowCount()).toBe(4) // 徐毓紘出現兩列，不去重

    // 兩個 yesno 欄位（join_master/tree_path）× 4 列：id1 yes/no、id2 no/yes、id3 no/no、id4 yes/no
    const checks = screen.getAllByText('✅')
    const crosses = screen.getAllByText('❎')
    expect(checks).toHaveLength(3)
    expect(crosses).toHaveLength(5)
  })

  it('姓名欄不可篩選：表頭不是按鈕，點了也不會出現選單', () => {
    render(<SubmissionsTable form={FORM} submissions={SUBMISSIONS} />)

    expect(screen.queryByRole('button', { name: /^姓名/ })).not.toBeInTheDocument()
  })

  it('推薦人篩選：點表頭選「潘暻葶」只留下該推薦人底下的列，表頭反白', () => {
    render(<SubmissionsTable form={FORM} submissions={SUBMISSIONS} />)

    filterBy('推薦人', '潘暻葶')

    expect(rowCount()).toBe(1)
    expect(within(screen.getByRole('table')).getByText('林義淳')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /推薦人/ })).toHaveStyle({ color: '#4A7C59' })
  })

  it('推薦人篩選：再點表頭選「全部」清空篩選', () => {
    render(<SubmissionsTable form={FORM} submissions={SUBMISSIONS} />)

    filterBy('推薦人', '潘暻葶')
    expect(rowCount()).toBe(1)

    filterBy('推薦人', '全部')
    expect(rowCount()).toBe(4)
  })

  it('星等篩選：點表頭選「綠」只留下星等為綠的列', () => {
    render(<SubmissionsTable form={FORM} submissions={SUBMISSIONS} />)

    filterBy('星等', '綠')

    expect(rowCount()).toBe(1)
    expect(within(screen.getByRole('table')).getByText('林義淳')).toBeInTheDocument()
  })

  it('課程篩選：點「天驥加盟主」表頭選「已完成」只留下該欄位為 yes 的列', () => {
    render(<SubmissionsTable form={FORM} submissions={SUBMISSIONS} />)

    filterBy('天驥加盟主', '已完成')

    expect(rowCount()).toBe(2) // id1, id4
  })

  it('單條件互斥：選了推薦人之後再選別欄，會取代前一個而非疊加', () => {
    render(<SubmissionsTable form={FORM} submissions={SUBMISSIONS} />)

    filterBy('推薦人', '潘暻葶') // 1 列
    expect(rowCount()).toBe(1)

    filterBy('天驥加盟主', '已完成') // 換成課程條件
    expect(rowCount()).toBe(2) // id1, id4（推薦人篩選已失效，不是疊加成 0 或交集）
    expect(within(screen.getByRole('table')).getByText('林義淳')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /推薦人/ })).toHaveStyle({ color: '#8A8680' }) // 推薦人表頭退回未選取樣式
  })

  it('點表頭之外任何地方會收起選單', () => {
    render(<SubmissionsTable form={FORM} submissions={SUBMISSIONS} />)

    fireEvent.click(screen.getByRole('button', { name: /星等/ }))
    expect(screen.getByRole('button', { name: '綠' })).toBeInTheDocument()

    fireEvent.mouseDown(document.body)
    expect(screen.queryByRole('button', { name: '綠' })).not.toBeInTheDocument()
  })

  it('篩選後無符合資料時顯示提示文字', () => {
    render(<SubmissionsTable form={FORM} submissions={SUBMISSIONS} />)

    filterBy('星等', '紫') // 沒有人是紫

    expect(screen.getByText('沒有符合條件的資料')).toBeInTheDocument()
  })
})
