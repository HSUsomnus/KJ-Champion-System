import React from 'react'
import { render, screen } from '@testing-library/react'
import AttendanceRoster from '../AttendanceRoster'

const ATTENDANCE = {
  totalMembers: 3,
  totalFilled: 2,
  groups: [
    {
      recommender: '李冠陞',
      total: 2,
      filled: 1,
      members: [
        { name: '徐毓紘', star_rank: '橙', filled: true },
        { name: '曹琬琦', star_rank: '橙', filled: false },
      ],
    },
    {
      recommender: null,
      total: 1,
      filled: 1,
      members: [{ name: '林義淳', star_rank: '綠', filled: true }],
    },
  ],
}

describe('AttendanceRoster', () => {
  it('顯示整體進度數字', () => {
    render(<AttendanceRoster attendance={ATTENDANCE} />)

    expect(screen.getByText('整體進度')).toBeInTheDocument()
    expect(screen.getByText('2 / 3')).toBeInTheDocument()
  })

  it('依推薦人分組顯示組名與組進度', () => {
    render(<AttendanceRoster attendance={ATTENDANCE} />)

    expect(screen.getByText('李冠陞')).toBeInTheDocument()
    expect(screen.getByText('1 / 2')).toBeInTheDocument()
  })

  it('無推薦人組顯示「無推薦人」', () => {
    render(<AttendanceRoster attendance={ATTENDANCE} />)

    expect(screen.getByText('無推薦人')).toBeInTheDocument()
  })

  it('每位成員顯示姓名、星等與 ✅/❎', () => {
    render(<AttendanceRoster attendance={ATTENDANCE} />)

    expect(screen.getByText('徐毓紘')).toBeInTheDocument()
    expect(screen.getByText('曹琬琦')).toBeInTheDocument()
    expect(screen.getAllByText('橙')).toHaveLength(2)
    expect(screen.getAllByText('✅')).toHaveLength(2) // 徐毓紘 + 林義淳
    expect(screen.getAllByText('❎')).toHaveLength(1) // 曹琬琦
  })
})
