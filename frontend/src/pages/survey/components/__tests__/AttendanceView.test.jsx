import React from 'react'
import { render, screen, within } from '@testing-library/react'
import AttendanceView from '../AttendanceView'

const ATTENDANCE = {
  form: { id: 1, title: '康九冠軍調查', status: 'published' },
  overall: { total: 4, done: 2, rate: 50 },
  groups: [
    {
      recommender: '李冠陞',
      total: 2,
      done: 1,
      members: [
        { name: '徐毓紘', star_rank: '橙', completed: true },
        { name: '曹琬琦', star_rank: '橙', completed: false },
      ],
    },
    {
      recommender: '曹琬琦',
      total: 1,
      done: 1,
      members: [{ name: '黃仲龍', star_rank: '綠', completed: true }],
    },
  ],
}

describe('AttendanceView', () => {
  it('attendance 為 null → 不渲染', () => {
    const { container } = render(<AttendanceView attendance={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('頂部顯示整體完成率 hero', () => {
    render(<AttendanceView attendance={ATTENDANCE} />)
    expect(screen.getByText('50%')).toBeInTheDocument()
    expect(screen.getByText('2 / 4 人已完成')).toBeInTheDocument()
    expect(screen.getByText(/康九冠軍調查/)).toBeInTheDocument()
  })

  it('按推薦人分組渲染卡片 + 進度', () => {
    render(<AttendanceView attendance={ATTENDANCE} />)
    expect(screen.getByText('李冠陞')).toBeInTheDocument()
    // 曹琬琦 既是一組推薦人（組標題），也是李冠陞組內的被推薦成員 → 出現 2 次
    expect(screen.getAllByText('曹琬琦')).toHaveLength(2)
    expect(screen.getByText('徐毓紘')).toBeInTheDocument()
    expect(screen.getByText('黃仲龍')).toBeInTheDocument()
  })

  it('每位成員依 completed 顯示 ✅ / ❎', () => {
    render(<AttendanceView attendance={ATTENDANCE} />)
    // 已完成的有 aria-label「已完成」，未完成的「未完成」
    expect(screen.getAllByLabelText('已完成')).toHaveLength(2) // 徐毓紘 + 黃仲龍
    expect(screen.getAllByLabelText('未完成')).toHaveLength(1) // 曹琬琦（作為被推薦成員）
  })

  it('groups 為空 → 顯示尚無名單資料', () => {
    render(<AttendanceView attendance={{ ...ATTENDANCE, groups: [] }} />)
    expect(screen.getByText('尚無名單資料')).toBeInTheDocument()
  })
})
