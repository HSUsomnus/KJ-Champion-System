import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import FormPreview from '../FormPreview'
import useAdminMembers from '../useAdminMembers'

vi.mock('../useAdminMembers', () => ({ default: vi.fn() }))

const FIELDS = [
  { key: 'name', label: '姓名', type: 'searchable_select', options: { source: 'survey_members' }, required: true },
  { key: 'join_master', label: '天驥加盟主', type: 'yesno', required: true },
]

beforeEach(() => {
  vi.clearAllMocks()
})

describe('FormPreview（十二節 12.3 獨立互動預覽）', () => {
  it('名冊載入中 → 顯示載入提示', () => {
    useAdminMembers.mockReturnValue({ members: [], status: 'loading', error: '', retry: vi.fn() })
    render(<FormPreview title="測試表單" fields={FIELDS} />)

    expect(screen.getByText('載入成員名單中...')).toBeInTheDocument()
  })

  it('名冊載入失敗 → 顯示錯誤訊息 + 重試按鈕，點擊呼叫 retry', () => {
    const retry = vi.fn()
    useAdminMembers.mockReturnValue({ members: [], status: 'error', error: '連線失敗', retry })
    render(<FormPreview title="測試表單" fields={FIELDS} />)

    expect(screen.getByText('連線失敗')).toBeInTheDocument()
    fireEvent.click(screen.getByText('重試'))
    expect(retry).toHaveBeenCalled()
  })

  it('空名冊 → 顯示提示，但仍可看到表單其他欄位（不阻擋預覽）', () => {
    useAdminMembers.mockReturnValue({ members: [], status: 'empty', error: '', retry: vi.fn() })
    render(<FormPreview title="測試表單" fields={FIELDS} />)

    expect(screen.getByText('目前沒有 confirmed 成員資料')).toBeInTheDocument()
    expect(screen.getByText('天驥加盟主')).toBeInTheDocument()
  })

  it('可實際操作填答（非唯讀），送出鈕停用（不會建立 submission）', () => {
    useAdminMembers.mockReturnValue({
      members: [{ name: '徐毓紘', star_rank: '橙' }], status: 'ready', error: '', retry: vi.fn(),
    })
    render(<FormPreview title="測試表單" fields={FIELDS} />)

    fireEvent.click(screen.getByText('是'))
    expect(screen.getByText('是').closest('button')).toHaveStyle({ background: '#4A7C59' })
    expect(screen.getByText('送出（預覽停用）')).toBeDisabled()
  })

  it('欄位裡沒有 survey_members 題型時，不顯示名冊載入狀態', () => {
    useAdminMembers.mockReturnValue({ members: [], status: 'loading', error: '', retry: vi.fn() })
    render(<FormPreview title="測試表單" fields={[{ key: 'note', label: '備註', type: 'text', required: false }]} />)

    expect(screen.queryByText('載入成員名單中...')).not.toBeInTheDocument()
  })

  it('沒有任何問題時顯示提示文字', () => {
    useAdminMembers.mockReturnValue({ members: [], status: 'ready', error: '', retry: vi.fn() })
    render(<FormPreview title="空表單" fields={[]} />)

    expect(screen.getByText('尚未加入任何問題')).toBeInTheDocument()
  })
})
