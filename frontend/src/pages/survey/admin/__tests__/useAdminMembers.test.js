import { renderHook, waitFor, act } from '@testing-library/react'
import { vi } from 'vitest'
import useAdminMembers from '../useAdminMembers'

const mockGetAdminMembers = vi.fn()

vi.mock('../../../../services/surveyApi', () => ({
  getAdminMembers: (...args) => mockGetAdminMembers(...args),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useAdminMembers', () => {
  it('掛載時先是 loading，成功後轉 ready 並帶回資料', async () => {
    mockGetAdminMembers.mockResolvedValue({ success: true, data: [{ name: '李冠陞', star_rank: '紫' }] })

    const { result } = renderHook(() => useAdminMembers())

    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.members).toEqual([{ name: '李冠陞', star_rank: '紫' }])
  })

  it('空名冊 → status 為 empty', async () => {
    mockGetAdminMembers.mockResolvedValue({ success: true, data: [] })

    const { result } = renderHook(() => useAdminMembers())

    await waitFor(() => expect(result.current.status).toBe('empty'))
  })

  it('API 失敗 → status 為 error 並帶錯誤訊息', async () => {
    mockGetAdminMembers.mockRejectedValue(new Error('連線失敗'))

    const { result } = renderHook(() => useAdminMembers())

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error).toBe('連線失敗')
  })

  it('retry 會重新呼叫 API 並可從 error 轉回 ready', async () => {
    mockGetAdminMembers.mockRejectedValueOnce(new Error('連線失敗'))
    mockGetAdminMembers.mockResolvedValueOnce({ success: true, data: [{ name: '徐毓紘', star_rank: '橙' }] })

    const { result } = renderHook(() => useAdminMembers())
    await waitFor(() => expect(result.current.status).toBe('error'))

    act(() => result.current.retry())

    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.members).toEqual([{ name: '徐毓紘', star_rank: '橙' }])
    expect(mockGetAdminMembers).toHaveBeenCalledTimes(2)
  })
})
