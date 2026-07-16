import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import FormBuilder from '../FormBuilder'

const mockCreateForm = vi.fn()
const mockPublishForm = vi.fn()

vi.mock('../../../../services/surveyApi', () => ({
  createForm: (...a) => mockCreateForm(...a),
  publishForm: (...a) => mockPublishForm(...a),
}))

const fieldCount = () => screen.queryAllByTestId('field-editor').length

beforeEach(() => vi.clearAllMocks())

describe('FormBuilder', () => {
  it('新增 / 刪除欄位', () => {
    render(<FormBuilder />)
    expect(fieldCount()).toBe(1)
    fireEvent.click(screen.getByText('+ 新增欄位'))
    expect(fieldCount()).toBe(2)
    fireEvent.click(screen.getAllByText('刪除')[0])
    expect(fieldCount()).toBe(1)
  })

  it('預覽即時反映標題與欄位標題', () => {
    render(<FormBuilder />)
    fireEvent.change(screen.getByPlaceholderText('例：七月回訓出席調查'), { target: { value: '八月調查' } })
    fireEvent.change(screen.getByLabelText('欄位 1 標題'), { target: { value: '姓名' } })
    // 預覽區顯示標題與欄位 label
    expect(screen.getByText('八月調查')).toBeInTheDocument()
    expect(screen.getByText('姓名')).toBeInTheDocument()
  })

  it('缺標題 → 顯示錯誤、不呼叫 API', () => {
    render(<FormBuilder />)
    fireEvent.click(screen.getByText('發佈任務'))
    expect(screen.getByText('請填任務標題')).toBeInTheDocument()
    expect(mockCreateForm).not.toHaveBeenCalled()
  })

  it('發佈成功 → 建立→發佈→顯示連結（含 token）+ 複製按鈕', async () => {
    mockCreateForm.mockResolvedValue({ success: true, data: { id: 7 } })
    mockPublishForm.mockResolvedValue({ success: true, data: { id: 7, token: 'tok123', status: 'published' } })

    render(<FormBuilder />)
    fireEvent.change(screen.getByPlaceholderText('例：七月回訓出席調查'), { target: { value: '八月調查' } })
    fireEvent.change(screen.getByLabelText('欄位 1 標題'), { target: { value: '姓名' } })
    fireEvent.change(screen.getByLabelText('欄位 1 key'), { target: { value: 'name' } })

    fireEvent.click(screen.getByText('發佈任務'))

    await waitFor(() => expect(mockCreateForm).toHaveBeenCalledWith({
      title: '八月調查',
      fields: [{ key: 'name', label: '姓名', type: 'text' }],
    }))
    expect(mockPublishForm).toHaveBeenCalledWith(7)

    expect(await screen.findByText(/任務已發佈/)).toBeInTheDocument()
    expect(screen.getByText(/tok123/)).toBeInTheDocument()
    expect(screen.getByText('複製連結')).toBeInTheDocument()
  })

  it('searchable_select 自訂選項 → API options 帶 static values', async () => {
    mockCreateForm.mockResolvedValue({ success: true, data: { id: 8 } })
    mockPublishForm.mockResolvedValue({ success: true, data: { id: 8, token: 't', status: 'published' } })

    render(<FormBuilder />)
    fireEvent.change(screen.getByPlaceholderText('例：七月回訓出席調查'), { target: { value: '星等調查' } })
    fireEvent.change(screen.getByLabelText('欄位 1 標題'), { target: { value: '星等' } })
    fireEvent.change(screen.getByLabelText('欄位 1 key'), { target: { value: 'star' } })
    fireEvent.change(screen.getByLabelText('欄位 1 型態'), { target: { value: 'searchable_select' } })
    fireEvent.change(screen.getByLabelText('欄位 1 選項來源'), { target: { value: 'static' } })
    fireEvent.change(screen.getByLabelText('欄位 1 自訂選項'), { target: { value: '白, 綠, 橙' } })

    fireEvent.click(screen.getByText('發佈任務'))

    await waitFor(() => expect(mockCreateForm).toHaveBeenCalledWith({
      title: '星等調查',
      fields: [{ key: 'star', label: '星等', type: 'searchable_select', options: { source: 'static', values: ['白', '綠', '橙'] } }],
    }))
  })
})
