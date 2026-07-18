import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getFormByToken, getMembers, submitForm, adminRequest } from '../surveyApi'
import { clearAdminToken, setAdminToken } from '../adminSession'

beforeEach(() => {
  clearAdminToken()
  global.fetch = vi.fn()
})

afterEach(() => {
  vi.restoreAllMocks()
})

const mockJsonResponse = (body, ok = true, status = 200) => ({
  ok,
  status,
  json: async () => body,
})

describe('request（公開端點）', () => {
  it('getFormByToken 不帶 Authorization header', async () => {
    global.fetch.mockResolvedValue(mockJsonResponse({ success: true, data: {} }))

    await getFormByToken('abc123')

    const [, options] = global.fetch.mock.calls[0]
    expect(options.headers.Authorization).toBeUndefined()
  })

  it('getMembers 打 /survey-api/members', async () => {
    global.fetch.mockResolvedValue(mockJsonResponse({ success: true, data: [] }))

    await getMembers()

    expect(global.fetch).toHaveBeenCalledWith('/survey-api/members', expect.any(Object))
  })

  it('回應 !ok → throw，帶 status/data', async () => {
    global.fetch.mockResolvedValue(mockJsonResponse({ success: false, message: '找不到' }, false, 404))

    await expect(getFormByToken('bad-token')).rejects.toMatchObject({
      message: '找不到',
      status: 404,
    })
  })

  it('submitForm POST body 帶 Content-Type: application/json', async () => {
    global.fetch.mockResolvedValue(mockJsonResponse({ success: true, data: {} }))

    await submitForm('abc123', { name: '徐毓紘' })

    const [, options] = global.fetch.mock.calls[0]
    expect(options.headers['Content-Type']).toBe('application/json')
    expect(options.body).toBe(JSON.stringify({ answers: { name: '徐毓紘' } }))
  })
})

describe('adminRequest（後台端點，D-A Bearer）', () => {
  it('記憶體有 token → 帶 Authorization: Bearer', async () => {
    setAdminToken('fake.jwt.token')
    global.fetch.mockResolvedValue(mockJsonResponse({ success: true, data: [] }))

    await adminRequest('/admin/forms')

    const [url, options] = global.fetch.mock.calls[0]
    expect(url).toBe('/survey-api/admin/forms')
    expect(options.headers.Authorization).toBe('Bearer fake.jwt.token')
  })

  it('記憶體無 token → 不帶 Authorization header（讓後端回 401，不是前端假造）', async () => {
    global.fetch.mockResolvedValue(mockJsonResponse({ success: false }, false, 401))

    await expect(adminRequest('/admin/forms')).rejects.toMatchObject({ status: 401 })

    const [, options] = global.fetch.mock.calls[0]
    expect(options.headers.Authorization).toBeUndefined()
  })
})
