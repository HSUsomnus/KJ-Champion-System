import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import ExportButtons from '../ExportButtons'

const mockDownloadAdminExport = vi.fn()

vi.mock('../../../../services/surveyApi', () => ({
  downloadAdminExport: (...args) => mockDownloadAdminExport(...args),
}))

beforeEach(() => {
  vi.clearAllMocks()
  global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  global.URL.revokeObjectURL = vi.fn()
})

describe('ExportButtons', () => {
  it('點「匯出 CSV」→ 呼叫 downloadAdminExport 帶正確 formId/format 並觸發瀏覽器下載', async () => {
    const blob = new Blob(['csv'])
    mockDownloadAdminExport.mockResolvedValue({ blob, filename: '康九.csv' })
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    render(<ExportButtons formId={7} />)
    fireEvent.click(screen.getByText('匯出 CSV'))

    await waitFor(() => expect(mockDownloadAdminExport).toHaveBeenCalledWith(7, 'csv'))
    expect(clickSpy).toHaveBeenCalled()
    expect(global.URL.createObjectURL).toHaveBeenCalledWith(blob)
  })

  it('匯出中該按鈕顯示「匯出中...」，另一顆按鈕被禁用', async () => {
    let resolveDownload
    mockDownloadAdminExport.mockReturnValue(new Promise((resolve) => { resolveDownload = resolve }))
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    render(<ExportButtons formId={7} />)
    fireEvent.click(screen.getByText('匯出 CSV'))

    expect(await screen.findByText('匯出中...')).toBeInTheDocument()
    expect(screen.getByText('匯出 Excel')).toBeDisabled()

    resolveDownload({ blob: new Blob(['csv']), filename: 'export.csv' })
    await waitFor(() => expect(screen.getByText('匯出 CSV')).toBeInTheDocument())
  })

  it('下載失敗 → 顯示錯誤訊息', async () => {
    mockDownloadAdminExport.mockRejectedValue(new Error('匯出失敗 500'))

    render(<ExportButtons formId={7} />)
    fireEvent.click(screen.getByText('匯出 Excel'))

    expect(await screen.findByText('匯出失敗 500')).toBeInTheDocument()
  })
})
