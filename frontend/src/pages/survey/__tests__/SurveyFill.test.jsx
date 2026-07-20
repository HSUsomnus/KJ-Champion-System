import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import SurveyFill from '../SurveyFill'

vi.mock('react-router-dom', () => ({
  useParams: () => ({ token: 'abc123' }),
}))

const FORM = {
  id: 1,
  title: '康九冠軍調查',
  fields: [
    { key: 'name', label: '姓名', type: 'searchable_select', options: { source: 'survey_members', field: 'name' } },
    { key: 'join_master', label: '天驥加盟主', type: 'yesno' },
  ],
}

const MEMBERS = [{ id: 1, name: '徐毓紘', star_rank: '橙', recommender_name: '李冠陞' }]

const mockGetFormByToken = vi.fn()
const mockGetMembersByToken = vi.fn()
const mockSubmitForm = vi.fn()

vi.mock('../../../services/surveyApi', () => ({
  getFormByToken: (...args) => mockGetFormByToken(...args),
  getMembersByToken: (...args) => mockGetMembersByToken(...args),
  submitForm: (...args) => mockSubmitForm(...args),
}))

beforeEach(() => {
  vi.clearAllMocks()
  Element.prototype.scrollIntoView = vi.fn()
})

describe('SurveyFill', () => {
  it('載入後依 fields render 正確欄位數（+ 標題）', async () => {
    mockGetFormByToken.mockResolvedValue({ success: true, data: FORM })
    mockGetMembersByToken.mockResolvedValue({ success: true, data: MEMBERS })

    render(<SurveyFill />)

    expect(await screen.findByText('康九冠軍調查')).toBeInTheDocument()
    expect(screen.getByText('姓名')).toBeInTheDocument()
    expect(screen.getByText('天驥加盟主')).toBeInTheDocument()
    expect(screen.getByAltText('KJ Champion')).toHaveAttribute('src', '/康九_logo.png')
    expect(mockGetMembersByToken).toHaveBeenCalledWith('abc123')
  })

  it('token 無效 → 顯示友善錯誤，不顯示表單', async () => {
    mockGetFormByToken.mockRejectedValue(new Error('找不到此表單'))
    mockGetMembersByToken.mockResolvedValue({ success: true, data: [] })

    render(<SurveyFill />)

    expect(await screen.findByText('找不到此表單，請確認連結是否正確')).toBeInTheDocument()
  })

  it('送出時呼叫 submitForm 並帶正確 token + answers', async () => {
    mockGetFormByToken.mockResolvedValue({ success: true, data: FORM })
    mockGetMembersByToken.mockResolvedValue({ success: true, data: MEMBERS })
    mockSubmitForm.mockResolvedValue({ success: true, data: { id: 1 } })

    render(<SurveyFill />)
    await screen.findByText('康九冠軍調查')

    fireEvent.change(screen.getByPlaceholderText('搜尋或選擇姓名'), { target: { value: '徐毓紘' } })
    fireEvent.click(screen.getByText('是'))
    fireEvent.click(screen.getByText('送出'))

    await waitFor(() =>
      expect(mockSubmitForm).toHaveBeenCalledWith('abc123', { name: '徐毓紘', join_master: 'yes' })
    )
    expect(await screen.findByText('已送出，謝謝填寫！')).toBeInTheDocument()
  })

  it('有欄位未填 → 擋下送出、顯示錯誤訊息，不呼叫 submitForm', async () => {
    mockGetFormByToken.mockResolvedValue({ success: true, data: FORM })
    mockGetMembersByToken.mockResolvedValue({ success: true, data: MEMBERS })

    render(<SurveyFill />)
    await screen.findByText('康九冠軍調查')

    // 姓名沒填，只點了是非題
    fireEvent.click(screen.getByText('是'))
    fireEvent.click(screen.getByText('送出'))

    expect(await screen.findByText(/請選擇姓名/)).toBeInTheDocument()
    expect(mockSubmitForm).not.toHaveBeenCalled()
  })

  it('補填欄位後，該欄位的錯誤訊息會消失', async () => {
    mockGetFormByToken.mockResolvedValue({ success: true, data: FORM })
    mockGetMembersByToken.mockResolvedValue({ success: true, data: MEMBERS })
    mockSubmitForm.mockResolvedValue({ success: true, data: { id: 1 } })

    render(<SurveyFill />)
    await screen.findByText('康九冠軍調查')

    fireEvent.click(screen.getByText('是'))
    fireEvent.click(screen.getByText('送出'))
    expect(await screen.findByText(/請選擇姓名/)).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('搜尋或選擇姓名'), { target: { value: '徐毓紘' } })
    expect(screen.queryByText('請選擇姓名')).not.toBeInTheDocument()
  })
})
