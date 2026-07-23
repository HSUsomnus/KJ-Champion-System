import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { vi } from 'vitest'
import SurveyAdmin from '../SurveyAdmin'
import { clearAdminToken, getAdminToken, setAdminToken } from '../../../services/adminSession'

const mockGetAdminForms = vi.fn()
const mockGetAdminSubmissions = vi.fn()
const mockGetAdminAttendance = vi.fn()
const mockCreateAdminForm = vi.fn()
const mockPatchAdminForm = vi.fn()
const mockPublishAdminForm = vi.fn()

vi.mock('../../../services/surveyApi', () => ({
  getAdminForms: (...args) => mockGetAdminForms(...args),
  getAdminSubmissions: (...args) => mockGetAdminSubmissions(...args),
  getAdminAttendance: (...args) => mockGetAdminAttendance(...args),
  downloadAdminExport: vi.fn(),
  createAdminForm: (...args) => mockCreateAdminForm(...args),
  patchAdminForm: (...args) => mockPatchAdminForm(...args),
  publishAdminForm: (...args) => mockPublishAdminForm(...args),
}))

// SurveyAdmin 內含的 FormBuilder 用 useBlocker（十二節 12.2），要跑在 data router 裡才不會 throw
const renderWithRouter = () => {
  const router = createMemoryRouter([{ path: '/', element: <SurveyAdmin /> }], { initialEntries: ['/'] })
  return render(<RouterProvider router={router} />)
}

beforeEach(() => {
  clearAdminToken()
  window.history.replaceState({}, '', '/admin')
  vi.clearAllMocks()
  mockGetAdminForms.mockResolvedValue({ success: true, data: [] })
  mockGetAdminSubmissions.mockResolvedValue({ success: true, data: [] })
  mockGetAdminAttendance.mockResolvedValue({
    success: true,
    data: { totalMembers: 0, totalFilled: 0, groups: [] },
  })
})

describe('SurveyAdmin', () => {
  it('沒有 token → 顯示 LINE 登入按鈕，連結指向 kj-survey-server 自己的 line-login', async () => {
    render(<SurveyAdmin />)

    const link = await screen.findByText('LINE 登入驗證')
    expect(link.closest('a')).toHaveAttribute('href', '/survey-api/admin-auth/line-login')
  })

  it('URL 帶 #token=xxx（line-callback 導回）→ 存進記憶體並清掉 fragment，顯示後台內容', async () => {
    window.history.replaceState({}, '', '/admin#token=fake.jwt.token')

    render(<SurveyAdmin />)

    await screen.findByText('調查表單後台')
    expect(getAdminToken()).toBe('fake.jwt.token')
    expect(window.location.hash).toBe('')
  })

  it('authError=forbidden → 顯示權限不足訊息 + 切換帳號按鈕', async () => {
    window.history.replaceState({}, '', '/admin?authError=forbidden')

    render(<SurveyAdmin />)

    expect(await screen.findByText(/沒有後台權限/)).toBeInTheDocument()
    expect(screen.getByText('切換帳號')).toBeInTheDocument()
    expect(window.location.search).toBe('')
  })

  it('authError=invalid_state → 顯示對應錯誤訊息 + 一般登入按鈕（不是切換帳號）', async () => {
    window.history.replaceState({}, '', '/admin?authError=invalid_state')

    render(<SurveyAdmin />)

    expect(await screen.findByText(/登入逾時或狀態已失效/)).toBeInTheDocument()
    expect(screen.getByText('LINE 登入驗證')).toBeInTheDocument()
  })

  it('已在記憶體中有 token（同一 SPA session 內導覽回來，網址無 fragment）→ 直接顯示後台內容', async () => {
    setAdminToken('already.stored.token')

    render(<SurveyAdmin />)

    await screen.findByText('調查表單後台')
  })

  it('點登出 → 清空記憶體 token，畫面回到登入畫面', async () => {
    window.history.replaceState({}, '', '/admin#token=fake.jwt.token')
    render(<SurveyAdmin />)
    await screen.findByText('調查表單後台')

    fireEvent.click(screen.getByText('登出'))

    await waitFor(() => expect(screen.getByText('LINE 登入驗證')).toBeInTheDocument())
    expect(getAdminToken()).toBeNull()
  })

  it('登入後載入表單清單，預設選第一筆並顯示對應 Table 1', async () => {
    mockGetAdminForms.mockResolvedValue({
      success: true,
      data: [
        { id: 1, title: '康九冠軍調查', token: 'abc', status: 'published', fields: [{ key: 'name', label: '姓名', type: 'text' }] },
        { id: 2, title: '另一份表單', token: 'def', status: 'draft', fields: [] },
      ],
    })
    mockGetAdminSubmissions.mockResolvedValue({
      success: true,
      data: [{ id: 100, answers: { name: '徐毓紘' } }],
    })

    setAdminToken('fake.jwt.token')
    render(<SurveyAdmin />)

    await screen.findByText('康九冠軍調查')
    expect(screen.getByText('另一份表單')).toBeInTheDocument()
    expect(mockGetAdminSubmissions).toHaveBeenCalledWith(1)
    const table = await screen.findByRole('table')
    expect(within(table).getByText('徐毓紘')).toBeInTheDocument()
  })

  it('token 過期（getAdminForms 回 401）→ 視同登出，回到登入畫面', async () => {
    const err = new Error('登入已過期')
    err.status = 401
    mockGetAdminForms.mockRejectedValue(err)

    setAdminToken('expired.token')
    render(<SurveyAdmin />)

    await waitFor(() => expect(screen.getByText('LINE 登入驗證')).toBeInTheDocument())
    expect(getAdminToken()).toBeNull()
  })

  it('尚無表單時顯示提示文字', async () => {
    setAdminToken('fake.jwt.token')
    render(<SurveyAdmin />)

    expect(await screen.findByText('尚無表單，請先到建立器新增一份')).toBeInTheDocument()
  })

  it('已發佈表單的 Table 檢視也能複製分享連結（不只建立器畫面才有）', async () => {
    mockGetAdminForms.mockResolvedValue({
      success: true,
      data: [{ id: 1, title: '康九冠軍調查', token: 'abc', status: 'published', fields: [{ key: 'name', label: '姓名', type: 'text' }] }],
    })
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })

    setAdminToken('fake.jwt.token')
    render(<SurveyAdmin />)

    const button = await screen.findByText('複製連結')
    fireEvent.click(button)

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/f/abc`))
    expect(await screen.findByText('已複製')).toBeInTheDocument()
  })

  it('點「未填名冊」切換鈕 → 顯示點名表而非送出紀錄表格', async () => {
    mockGetAdminForms.mockResolvedValue({
      success: true,
      data: [{ id: 1, title: '康九冠軍調查', token: 'abc', status: 'published', fields: [{ key: 'name', label: '姓名', type: 'text' }] }],
    })
    mockGetAdminSubmissions.mockResolvedValue({
      success: true,
      data: [{ id: 100, answers: { name: '徐毓紘' } }],
    })
    mockGetAdminAttendance.mockResolvedValue({
      success: true,
      data: {
        totalMembers: 1,
        totalFilled: 0,
        groups: [{ recommender: null, total: 1, filled: 0, members: [{ name: '徐毓紘', star_rank: '橙', filled: false }] }],
      },
    })

    setAdminToken('fake.jwt.token')
    render(<SurveyAdmin />)

    await screen.findByRole('table') // 預設先看到送出紀錄表格
    fireEvent.click(screen.getByText('未填名冊'))

    expect(await screen.findByText('整體進度')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})

describe('SurveyAdmin — dirty state 攔截（十二節 12.2，FormBuilder onDirtyChange 回報給父層）', () => {
  it('建立器有未儲存變更時切換表單 → 跳確認對話框；取消保留內容，確認才真的切換', async () => {
    mockGetAdminForms.mockResolvedValue({
      success: true,
      data: [{ id: 1, title: '康九冠軍調查', token: 'abc', status: 'published', fields: [] }],
    })
    setAdminToken('fake.jwt.token')
    renderWithRouter()

    await screen.findByText('康九冠軍調查')
    fireEvent.click(screen.getByLabelText('新增表單'))

    fireEvent.change(screen.getByLabelText('表單標題'), { target: { value: '未儲存的新表單' } })
    fireEvent.click(screen.getByText('康九冠軍調查')) // 切去既有表單，應被攔截

    expect(await screen.findByText('尚未儲存資料，確認離開？')).toBeInTheDocument()

    fireEvent.click(screen.getByText('取消'))
    expect(screen.queryByText('尚未儲存資料，確認離開？')).not.toBeInTheDocument()
    expect(screen.getByDisplayValue('未儲存的新表單')).toBeInTheDocument() // 內容還在

    fireEvent.click(screen.getByText('康九冠軍調查'))
    fireEvent.click(await screen.findByText('確認離開'))

    await waitFor(() => expect(screen.getByRole('table')).toBeInTheDocument())
  })
})
