import React from 'react'
import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import Home from '../Home'

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))

vi.mock('../../components/FabAction', () => ({
  default: () => null,
}))

const mockGetEvents = vi.fn().mockResolvedValue({ success: true, data: [] })
const mockGetSystemLinks = vi.fn().mockResolvedValue({
  success: true,
  data: { lineAddFriendUrl: 'https://line.me/R/ti/p/@test', calendarAddUrl: 'https://calendar.google.com' },
})

vi.mock('../../services/api', () => ({
  api: {
    getEvents: (...args) => mockGetEvents(...args),
    getSystemLinks: (...args) => mockGetSystemLinks(...args),
  },
  mapEvent: (e) => e,
}))

const mockUseAuth = vi.fn()
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

beforeEach(() => {
  vi.clearAllMocks()
  // 預設非 standalone 模式
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockReturnValue({ matches: false }),
  })
})

describe('Home — 財力金額', () => {
  it('財力有值時顯示金額', async () => {
    mockUseAuth.mockReturnValue({ user: { realName: '王小明', financialAmount: '500000' } })
    render(<Home />)
    const el = await screen.findByTestId('financial-amount')
    expect(el.textContent).toContain('500,000')
  })

  it('財力空字串時顯示「尚未填寫」', async () => {
    mockUseAuth.mockReturnValue({ user: { realName: '王小明', financialAmount: '' } })
    render(<Home />)
    const el = await screen.findByTestId('financial-amount')
    expect(el.textContent).toBe('尚未填寫')
  })

  it('財力為 null 時顯示「尚未填寫」', async () => {
    mockUseAuth.mockReturnValue({ user: { realName: '王小明', financialAmount: null } })
    render(<Home />)
    const el = await screen.findByTestId('financial-amount')
    expect(el.textContent).toBe('尚未填寫')
  })
})

describe('Home — 系統連結', () => {
  it('lineAddFriendUrl null 時 LINE 方塊不渲染', async () => {
    mockGetSystemLinks.mockResolvedValueOnce({
      success: true,
      data: { lineAddFriendUrl: null, calendarAddUrl: 'https://calendar.google.com' },
    })
    mockUseAuth.mockReturnValue({ user: { realName: '王小明', financialAmount: null } })
    render(<Home />)
    // 等待 getSystemLinks resolve
    await screen.findByTestId('financial-amount')
    expect(screen.queryByTestId('link-line')).toBeNull()
  })

  it('lineAddFriendUrl 有值時 LINE 方塊渲染', async () => {
    mockUseAuth.mockReturnValue({ user: { realName: '王小明', financialAmount: null } })
    render(<Home />)
    expect(await screen.findByTestId('link-line')).toBeTruthy()
  })
})

describe('Home — PWA 安裝按鈕', () => {
  it('standalone 模式時安裝按鈕為 disabled', async () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockReturnValue({ matches: true }),
    })
    mockUseAuth.mockReturnValue({ user: { realName: '王小明', financialAmount: null } })
    render(<Home />)
    const btn = await screen.findByTestId('link-pwa')
    expect(btn).toBeDisabled()
  })

  it('非 standalone 模式時安裝按鈕可點擊', async () => {
    mockUseAuth.mockReturnValue({ user: { realName: '王小明', financialAmount: null } })
    render(<Home />)
    const btn = await screen.findByTestId('link-pwa')
    expect(btn).not.toBeDisabled()
  })
})
