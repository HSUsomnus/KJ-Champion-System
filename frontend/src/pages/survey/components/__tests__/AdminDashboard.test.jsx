import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import AdminDashboard from '../AdminDashboard'

const mockGetAdminForms = vi.fn()
const mockGetFormAttendance = vi.fn()
const mockGetFormSubmissions = vi.fn()

vi.mock('../../../../services/surveyApi', () => ({
  getAdminForms: (...a) => mockGetAdminForms(...a),
  getFormAttendance: (...a) => mockGetFormAttendance(...a),
  getFormSubmissions: (...a) => mockGetFormSubmissions(...a),
}))

const FORMS = [
  { id: 1, title: '康九冠軍調查', status: 'published', submission_count: 2 },
  { id: 2, title: '七月回訓調查', status: 'draft', submission_count: 0 },
]

const ATTENDANCE_1 = {
  form: { id: 1, title: '康九冠軍調查', status: 'published' },
  overall: { total: 4, done: 2, rate: 50 },
  groups: [
    { recommender: '李冠陞', total: 2, done: 1, members: [
      { name: '徐毓紘', star_rank: '橙', completed: true },
      { name: '曹琬琦', star_rank: '橙', completed: false },
    ] },
  ],
}

const ATTENDANCE_2 = {
  form: { id: 2, title: '七月回訓調查', status: 'draft' },
  overall: { total: 4, done: 0, rate: 0 },
  groups: [],
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('AdminDashboard', () => {
  it('載入任務清單、預設選第一個並顯示其完成狀況', async () => {
    mockGetAdminForms.mockResolvedValue({ success: true, data: FORMS })
    mockGetFormAttendance.mockResolvedValue({ success: true, data: ATTENDANCE_1 })

    render(<AdminDashboard />)

    // 側邊欄任務數
    expect(await screen.findByText('任務清單（2）')).toBeInTheDocument()
    // 首屏預設顯示第一個任務的完成率
    expect(await screen.findByText('50%')).toBeInTheDocument()
    expect(mockGetFormAttendance).toHaveBeenCalledWith(1)
  })

  it('點另一個任務 → 切換完成狀況視圖', async () => {
    mockGetAdminForms.mockResolvedValue({ success: true, data: FORMS })
    mockGetFormAttendance
      .mockResolvedValueOnce({ success: true, data: ATTENDANCE_1 })
      .mockResolvedValueOnce({ success: true, data: ATTENDANCE_2 })

    render(<AdminDashboard />)
    await screen.findByText('50%')

    fireEvent.click(screen.getByText('七月回訓調查'))

    await waitFor(() => expect(mockGetFormAttendance).toHaveBeenCalledWith(2))
    expect(await screen.findByText('0%')).toBeInTheDocument()
  })

  it('沒有任何任務 → 顯示空狀態', async () => {
    mockGetAdminForms.mockResolvedValue({ success: true, data: [] })

    render(<AdminDashboard />)

    expect(await screen.findByText('目前沒有任何任務。')).toBeInTheDocument()
    expect(mockGetFormAttendance).not.toHaveBeenCalled()
  })

  it('切到「明細」tab → 抓 submissions 並渲染明細', async () => {
    mockGetAdminForms.mockResolvedValue({ success: true, data: FORMS })
    mockGetFormAttendance.mockResolvedValue({ success: true, data: ATTENDANCE_1 })
    mockGetFormSubmissions.mockResolvedValue({
      success: true,
      data: {
        form: { id: 1, title: '康九冠軍調查', fields: [{ key: 'name', label: '姓名', type: 'searchable_select' }] },
        submissions: [{ id: 9, answers: { name: '徐毓紘' } }],
      },
    })

    render(<AdminDashboard />)
    await screen.findByText('50%')

    fireEvent.click(screen.getByText('明細'))

    await waitFor(() => expect(mockGetFormSubmissions).toHaveBeenCalledWith(1))
    expect(await screen.findByText('共 1 筆')).toBeInTheDocument()
  })
})
