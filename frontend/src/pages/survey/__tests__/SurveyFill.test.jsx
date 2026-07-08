import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import SurveyFill from '../SurveyFill'

vi.mock('react-router-dom', () => ({
  useParams: () => ({ token: 'abc123' }),
}))

const FORM = {
  id: 1,
  title: '康九團隊調查',
  fields: [
    { key: 'name', label: '姓名', type: 'searchable_select', options: { source: 'survey_members', field: 'name' } },
    { key: 'join_master', label: '天驥加盟主', type: 'yesno' },
  ],
}

const MEMBERS = [{ id: 1, name: '徐毓紘', star_rank: '橙', recommender_name: '李冠陞' }]

const mockGetFormByToken = vi.fn()
const mockGetMembers = vi.fn()
const mockSubmitForm = vi.fn()

vi.mock('../../../services/surveyApi', () => ({
  getFormByToken: (...args) => mockGetFormByToken(...args),
  getMembers: (...args) => mockGetMembers(...args),
  submitForm: (...args) => mockSubmitForm(...args),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('SurveyFill', () => {
  it('載入後依 fields render 正確欄位數（+ 標題）', async () => {
    mockGetFormByToken.mockResolvedValue({ success: true, data: FORM })
    mockGetMembers.mockResolvedValue({ success: true, data: MEMBERS })

    render(<SurveyFill />)

    expect(await screen.findByText('康九團隊調查')).toBeInTheDocument()
    expect(screen.getByText('姓名')).toBeInTheDocument()
    expect(screen.getByText('天驥加盟主')).toBeInTheDocument()
  })

  it('token 無效 → 顯示友善錯誤，不顯示表單', async () => {
    mockGetFormByToken.mockRejectedValue(new Error('找不到此表單'))
    mockGetMembers.mockResolvedValue({ success: true, data: [] })

    render(<SurveyFill />)

    expect(await screen.findByText('找不到此表單，請確認連結是否正確')).toBeInTheDocument()
  })

  it('送出時呼叫 submitForm 並帶正確 token + answers', async () => {
    mockGetFormByToken.mockResolvedValue({ success: true, data: FORM })
    mockGetMembers.mockResolvedValue({ success: true, data: MEMBERS })
    mockSubmitForm.mockResolvedValue({ success: true, data: { id: 1 } })

    render(<SurveyFill />)
    await screen.findByText('康九團隊調查')

    fireEvent.click(screen.getByText('是'))
    fireEvent.click(screen.getByText('送出'))

    await waitFor(() => expect(mockSubmitForm).toHaveBeenCalledWith('abc123', { join_master: 'yes' }))
    expect(await screen.findByText('已送出，謝謝填寫！')).toBeInTheDocument()
  })
})
