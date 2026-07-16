import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import SurveyAdmin from '../SurveyAdmin'

const mockGetAdminMe = vi.fn()
const mockGetAdminForms = vi.fn()
const mockGetFormAttendance = vi.fn()
const mockGetFormSubmissions = vi.fn()

vi.mock('../../../services/surveyApi', () => ({
  getAdminMe: (...args) => mockGetAdminMe(...args),
  getAdminForms: (...args) => mockGetAdminForms(...args),
  getFormAttendance: (...args) => mockGetFormAttendance(...args),
  getFormSubmissions: (...args) => mockGetFormSubmissions(...args),
}))

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  window.history.replaceState({}, '', '/admin')
  // AdminDashboard 掛載時會抓任務清單；預設回空清單，避免 authed 測試噴未 mock 錯誤
  mockGetAdminForms.mockResolvedValue({ success: true, data: [] })
  mockGetFormAttendance.mockResolvedValue({ success: true, data: null })
  mockGetFormSubmissions.mockResolvedValue({ success: true, data: { form: { fields: [] }, submissions: [] } })
})

describe('SurveyAdmin', () => {
  it('沒有 lineUserId → 顯示 LINE 登入按鈕，連結指向主系統既有登入流程', async () => {
    render(<SurveyAdmin />)

    const link = await screen.findByText('LINE 登入驗證')
    expect(link.closest('a')).toHaveAttribute('href', '/api/auth/line-login?returnUrl=/admin')
    expect(mockGetAdminMe).not.toHaveBeenCalled()
  })

  it('URL 帶 userId（主系統 OAuth 回調）→ 存進 localStorage 並清掉網址參數', async () => {
    window.history.replaceState({}, '', '/admin?userId=U1234&displayName=%E5%BE%90%E6%AF%93%E7%B4%98&auth=1')
    mockGetAdminMe.mockResolvedValue({ success: true, data: { lineId: 'U1234', role: '管理者' } })

    render(<SurveyAdmin />)

    await screen.findByText('調查表單後台')
    expect(localStorage.getItem('lineUserId')).toBe('U1234')
    expect(window.location.search).toBe('')
  })

  it('有 lineUserId 但角色不足（403）→ 顯示權限不足訊息 + 切換帳號按鈕', async () => {
    localStorage.setItem('lineUserId', 'U9999')
    const err = new Error('此帳號沒有後台權限')
    err.status = 403
    mockGetAdminMe.mockRejectedValue(err)

    render(<SurveyAdmin />)

    expect(await screen.findByText(/沒有後台權限/)).toBeInTheDocument()
    expect(screen.getByText('切換帳號')).toBeInTheDocument()
  })

  it('角色足夠 → 顯示身分與後台內容', async () => {
    localStorage.setItem('lineUserId', 'U1234')
    mockGetAdminMe.mockResolvedValue({ success: true, data: { lineId: 'U1234', role: '管理者' } })

    render(<SurveyAdmin />)

    expect(await screen.findByText('調查表單後台')).toBeInTheDocument()
    expect(screen.getByText(/管理者/)).toBeInTheDocument()
  })

  it('點登出 → 清空 localStorage，畫面回到登入畫面', async () => {
    localStorage.setItem('lineUserId', 'U1234')
    mockGetAdminMe.mockResolvedValue({ success: true, data: { lineId: 'U1234', role: '管理者' } })

    render(<SurveyAdmin />)
    await screen.findByText('調查表單後台')

    fireEvent.click(screen.getByText('登出'))

    await waitFor(() => expect(screen.getByText('LINE 登入驗證')).toBeInTheDocument())
    expect(localStorage.getItem('lineUserId')).toBeNull()
  })
})
