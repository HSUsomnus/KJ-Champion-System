import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SurveyAdmin from '../SurveyAdmin'
import { clearAdminToken, getAdminToken, setAdminToken } from '../../../services/adminSession'

beforeEach(() => {
  clearAdminToken()
  window.history.replaceState({}, '', '/admin')
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
})
