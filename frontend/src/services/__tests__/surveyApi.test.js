import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getFormByToken, getMembersByToken, submitForm, adminRequest, downloadAdminExport, getAdminMembers } from '../surveyApi'
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

  it('getMembersByToken 打 /survey-api/forms/:token/members（D-D 綁 token，不再打無 token 的 /members）', async () => {
    global.fetch.mockResolvedValue(mockJsonResponse({ success: true, data: [] }))

    await getMembersByToken('abc123')

    expect(global.fetch).toHaveBeenCalledWith('/survey-api/forms/abc123/members', expect.any(Object))
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

  it('getAdminMembers 打 /admin/members（十二節 12.4，草稿預覽用）', async () => {
    setAdminToken('fake.jwt.token')
    global.fetch.mockResolvedValue(mockJsonResponse({ success: true, data: [{ name: '李冠陞', star_rank: '紫' }] }))

    await getAdminMembers()

    const [url, options] = global.fetch.mock.calls[0]
    expect(url).toBe('/survey-api/admin/members')
    expect(options.headers.Authorization).toBe('Bearer fake.jwt.token')
  })
})

describe('downloadAdminExport（匯出，回應是 blob 不是 JSON）', () => {
  const mockBlobResponse = (headers = {}) => ({
    ok: true,
    status: 200,
    blob: async () => new Blob(['csv content']),
    headers: { get: (key) => headers[key] ?? null },
  })

  it('帶 Authorization: Bearer，打對應 export.<format> 路徑', async () => {
    setAdminToken('fake.jwt.token')
    global.fetch.mockResolvedValue(mockBlobResponse())

    await downloadAdminExport(7, 'csv')

    const [url, options] = global.fetch.mock.calls[0]
    expect(url).toBe('/survey-api/admin/forms/7/export.csv')
    expect(options.headers.Authorization).toBe('Bearer fake.jwt.token')
  })

  it('從 Content-Disposition 的 filename* 取出 UTF-8 檔名', async () => {
    global.fetch.mockResolvedValue(
      mockBlobResponse({ 'Content-Disposition': `attachment; filename="export.csv"; filename*=UTF-8''%E5%BA%B7%E4%B9%9D.csv` })
    )

    const { filename } = await downloadAdminExport(7, 'csv')

    expect(filename).toBe('康九.csv')
  })

  it('沒有 filename* 時退回 export.<format>', async () => {
    global.fetch.mockResolvedValue(mockBlobResponse())

    const { filename } = await downloadAdminExport(7, 'xlsx')

    expect(filename).toBe('export.xlsx')
  })

  it('回應 !ok → throw 帶 status', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ success: false, message: '找不到此表單' }),
    })

    await expect(downloadAdminExport(999, 'csv')).rejects.toMatchObject({
      status: 404,
      message: '找不到此表單',
    })
  })
})
