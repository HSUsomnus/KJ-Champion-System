import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import SurveyAdmin from '../SurveyAdmin'

let mockSearchParams = new URLSearchParams()
vi.mock('react-router-dom', () => ({
  useSearchParams: () => [mockSearchParams],
}))

const mockGetAdminMe = vi.fn()
const mockAdminLogout = vi.fn()

vi.mock('../../../services/surveyApi', () => ({
  getAdminMe: (...args) => mockGetAdminMe(...args),
  adminLogout: (...args) => mockAdminLogout(...args),
  ADMIN_LOGIN_URL: '/survey-api/admin-auth/line-login',
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockSearchParams = new URLSearchParams()
})

describe('SurveyAdmin', () => {
  it('未登入 → 顯示 LINE 登入按鈕，連結正確', async () => {
    mockGetAdminMe.mockRejectedValue(new Error('請先登入'))

    render(<SurveyAdmin />)

    const link = await screen.findByText('使用 LINE 登入')
    expect(link.closest('a')).toHaveAttribute('href', '/survey-api/admin-auth/line-login')
  })

  it('authError=forbidden → 顯示權限不足訊息', async () => {
    mockGetAdminMe.mockRejectedValue(new Error('請先登入'))
    mockSearchParams = new URLSearchParams('authError=forbidden')

    render(<SurveyAdmin />)

    expect(await screen.findByText(/沒有後台權限/)).toBeInTheDocument()
  })

  it('已登入 → 顯示身分與後台內容', async () => {
    mockGetAdminMe.mockResolvedValue({ success: true, data: { lineId: 'U1234', role: '管理者' } })

    render(<SurveyAdmin />)

    expect(await screen.findByText('調查表單後台')).toBeInTheDocument()
    expect(screen.getByText(/管理者/)).toBeInTheDocument()
  })

  it('點登出 → 呼叫 adminLogout，畫面回到登入畫面', async () => {
    mockGetAdminMe.mockResolvedValue({ success: true, data: { lineId: 'U1234', role: '管理者' } })
    mockAdminLogout.mockResolvedValue({ success: true })

    render(<SurveyAdmin />)
    await screen.findByText('調查表單後台')

    fireEvent.click(screen.getByText('登出'))

    await waitFor(() => expect(mockAdminLogout).toHaveBeenCalled())
    expect(await screen.findByText('使用 LINE 登入')).toBeInTheDocument()
  })
})
