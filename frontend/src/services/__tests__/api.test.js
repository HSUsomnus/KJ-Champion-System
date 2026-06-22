import { vi, describe, it, expect, beforeEach } from 'vitest'
import { api } from '../api'

describe('api.getSystemLinks', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('呼叫 /api/line/system-links 並回傳資料', async () => {
    const mockData = {
      success: true,
      data: {
        lineAddFriendUrl: 'https://line.me/R/ti/p/@test',
        calendarAddUrl: 'https://calendar.google.com/calendar/render?cid=abc%40group.calendar.google.com',
      },
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    })

    const result = await api.getSystemLinks()

    expect(fetch).toHaveBeenCalledWith('/api/line/system-links', expect.objectContaining({}))
    expect(result.data.lineAddFriendUrl).toBe('https://line.me/R/ti/p/@test')
    expect(result.data.calendarAddUrl).toContain('calendar.google.com')
  })

  it('兩個欄位為 null 時正常回傳', async () => {
    const mockData = {
      success: true,
      data: { lineAddFriendUrl: null, calendarAddUrl: null },
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    })

    const result = await api.getSystemLinks()

    expect(result.data.lineAddFriendUrl).toBeNull()
    expect(result.data.calendarAddUrl).toBeNull()
  })
})
