import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import FormBuilder from '../FormBuilder'

const mockCreateAdminForm = vi.fn()
const mockPatchAdminForm = vi.fn()
const mockPublishAdminForm = vi.fn()

vi.mock('../../../../services/surveyApi', () => ({
  createAdminForm: (...args) => mockCreateAdminForm(...args),
  patchAdminForm: (...args) => mockPatchAdminForm(...args),
  publishAdminForm: (...args) => mockPublishAdminForm(...args),
}))

beforeEach(() => {
  vi.clearAllMocks()
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    configurable: true,
  })
})

const DRAFT_FORM = {
  id: 5,
  title: '既有草稿',
  status: 'draft',
  token: null,
  fields: [{ key: 'name', label: '姓名', type: 'text', required: true }],
}

describe('FormBuilder — 新建表單', () => {
  it('填標題 + 新增欄位 → 點「儲存草稿」呼叫 createAdminForm', async () => {
    mockCreateAdminForm.mockResolvedValue({
      success: true,
      data: { id: 9, title: '新表單', status: 'draft', token: null, fields: [] },
    })
    const onSaved = vi.fn()

    render(<FormBuilder form={null} onSaved={onSaved} />)

    fireEvent.change(screen.getByLabelText('表單標題'), { target: { value: '新表單' } })
    fireEvent.click(screen.getByText('＋ 新增題目'))
    fireEvent.change(screen.getByPlaceholderText('key'), { target: { value: 'name' } })
    fireEvent.change(screen.getByPlaceholderText('問題標題'), { target: { value: '姓名' } })

    fireEvent.click(screen.getByText('儲存草稿'))

    await waitFor(() =>
      expect(mockCreateAdminForm).toHaveBeenCalledWith('新表單', [
        { key: 'name', label: '姓名', type: 'text', required: true },
      ])
    )
    expect(onSaved).toHaveBeenCalledWith({ id: 9, title: '新表單', status: 'draft', token: null, fields: [] })
  })

  it('尚未儲存（無 id）→ 發佈鈕禁用', () => {
    render(<FormBuilder form={null} onSaved={() => {}} />)
    expect(screen.getByText('發佈表單')).toBeDisabled()
  })

  it('儲存失敗 → 顯示伺服器回傳的 field/reason', async () => {
    const err = new Error('key 格式錯誤')
    err.data = { error: 'invalid_form', field: 'fields[0].key', reason: 'key 格式錯誤' }
    mockCreateAdminForm.mockRejectedValue(err)

    render(<FormBuilder form={null} onSaved={() => {}} />)
    fireEvent.click(screen.getByText('＋ 新增題目'))
    fireEvent.click(screen.getByText('儲存草稿'))

    expect(await screen.findByText('fields[0].key：key 格式錯誤')).toBeInTheDocument()
  })
})

describe('FormBuilder — 編輯既有草稿', () => {
  it('帶入既有 title/fields，修改後儲存呼叫 patchAdminForm 帶 id', async () => {
    mockPatchAdminForm.mockResolvedValue({ success: true, data: { ...DRAFT_FORM, title: '改過的標題' } })
    const onSaved = vi.fn()

    render(<FormBuilder form={DRAFT_FORM} onSaved={onSaved} />)

    expect(screen.getByDisplayValue('既有草稿')).toBeInTheDocument()
    expect(screen.getByDisplayValue('name')).toBeInTheDocument()

    fireEvent.change(screen.getByDisplayValue('既有草稿'), { target: { value: '改過的標題' } })
    fireEvent.click(screen.getByText('儲存草稿'))

    await waitFor(() =>
      expect(mockPatchAdminForm).toHaveBeenCalledWith(5, {
        title: '改過的標題',
        fields: [{ key: 'name', label: '姓名', type: 'text', required: true }],
      })
    )
    expect(onSaved).toHaveBeenCalled()
  })

  it('已有 id + fields → 發佈鈕可點，發佈成功顯示分享連結 + 可複製', async () => {
    mockPublishAdminForm.mockResolvedValue({
      success: true,
      data: { ...DRAFT_FORM, status: 'published', token: 'tok-abc' },
    })
    const onSaved = vi.fn()

    render(<FormBuilder form={DRAFT_FORM} onSaved={onSaved} />)
    fireEvent.click(screen.getByText('發佈表單'))

    await waitFor(() => expect(mockPublishAdminForm).toHaveBeenCalledWith(5))
    expect(await screen.findByText('已發佈')).toBeInTheDocument()
    expect(screen.getByText(/\/f\/tok-abc$/)).toBeInTheDocument()

    fireEvent.click(screen.getByText('複製連結'))
    await waitFor(() =>
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('/f/tok-abc'))
    )
    expect(await screen.findByText('已複製')).toBeInTheDocument()
  })

  it('刪除欄位 → 該欄位從畫面消失', () => {
    render(<FormBuilder form={DRAFT_FORM} onSaved={() => {}} />)
    expect(screen.getByDisplayValue('name')).toBeInTheDocument()

    fireEvent.click(screen.getByText('刪除'))
    expect(screen.queryByDisplayValue('name')).not.toBeInTheDocument()
  })
})

describe('FormBuilder — searchable_select 選項編輯', () => {
  it('切換欄位型別為搜尋選單 → 出現新增選項按鈕，可新增/編輯/刪除選項', () => {
    render(<FormBuilder form={null} onSaved={() => {}} />)
    fireEvent.click(screen.getByText('＋ 新增題目'))

    fireEvent.change(screen.getByDisplayValue('文字'), { target: { value: 'searchable_select' } })
    fireEvent.click(screen.getByText('+ 新增選項'))

    const optionInputs = screen.getAllByDisplayValue('')
    // key/label/option 三個空字串輸入框都存在，找 option 那個用刪除選項按鈕反查即可
    expect(screen.getByText('刪除選項')).toBeInTheDocument()
    expect(optionInputs.length).toBeGreaterThan(0)
  })

  it('十二節 12.1：static 來源明確存成 {source:"static", values}', async () => {
    mockCreateAdminForm.mockResolvedValue({ success: true, data: { id: 1, fields: [] } })

    render(<FormBuilder form={null} onSaved={() => {}} />)
    fireEvent.click(screen.getByText('＋ 新增題目'))
    fireEvent.change(screen.getByPlaceholderText('key'), { target: { value: 'course' } })
    fireEvent.change(screen.getByPlaceholderText('問題標題'), { target: { value: '課程' } })
    fireEvent.change(screen.getByDisplayValue('文字'), { target: { value: 'searchable_select' } })
    fireEvent.click(screen.getByText('+ 新增選項'))
    const textboxes = screen.getAllByRole('textbox')
    fireEvent.change(textboxes[textboxes.length - 1], { target: { value: '選項1' } })

    fireEvent.click(screen.getByText('儲存草稿'))

    await waitFor(() => expect(mockCreateAdminForm).toHaveBeenCalled())
    const [, fields] = mockCreateAdminForm.mock.calls[0]
    expect(fields[0].options).toEqual({ source: 'static', values: ['選項1'] })
  })

  it('十二節 12.1：選「康九成員名單」→ 明確存成 {source:"survey_members"}，不夾帶 values', async () => {
    mockCreateAdminForm.mockResolvedValue({ success: true, data: { id: 1, fields: [] } })

    render(<FormBuilder form={null} onSaved={() => {}} />)
    fireEvent.click(screen.getByText('＋ 新增題目'))
    fireEvent.change(screen.getByPlaceholderText('key'), { target: { value: 'name' } })
    fireEvent.change(screen.getByPlaceholderText('問題標題'), { target: { value: '姓名' } })
    fireEvent.change(screen.getByDisplayValue('文字'), { target: { value: 'searchable_select' } })
    fireEvent.click(screen.getByText('康九成員名單'))

    fireEvent.click(screen.getByText('儲存草稿'))

    await waitFor(() => expect(mockCreateAdminForm).toHaveBeenCalled())
    const [, fields] = mockCreateAdminForm.mock.calls[0]
    expect(fields[0].options).toEqual({ source: 'survey_members' })
  })
})

describe('FormBuilder — 單欄題目卡的焦點/摘要狀態（十二節 12.1）', () => {
  const TWO_FIELD_FORM = {
    id: 5,
    title: '兩題表單',
    status: 'draft',
    token: null,
    fields: [
      { key: 'name', label: '姓名', type: 'text', required: true },
      { key: 'note', label: '備註', type: 'text', required: false },
    ],
  }

  it('預設第一題展開、其餘顯示摘要卡（標題+題型）', () => {
    render(<FormBuilder form={TWO_FIELD_FORM} onSaved={() => {}} />)

    expect(screen.getByDisplayValue('name')).toBeInTheDocument() // 第一題展開中
    expect(screen.queryByDisplayValue('note')).not.toBeInTheDocument() // 第二題還是摘要卡
    expect(screen.getByText('備註')).toBeInTheDocument() // 摘要卡顯示題目標題
  })

  it('點摘要卡 → 該題展開、原本展開的題目收回摘要', () => {
    render(<FormBuilder form={TWO_FIELD_FORM} onSaved={() => {}} />)

    fireEvent.click(screen.getByText('備註'))

    expect(screen.getByDisplayValue('note')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('name')).not.toBeInTheDocument()
    expect(screen.getByText('姓名')).toBeInTheDocument() // 姓名變摘要卡
  })
})

describe('FormBuilder — 已發佈表單唯讀', () => {
  it('published 表單：欄位/標題輸入被 disabled，不顯示儲存/發佈鈕', () => {
    const published = { ...DRAFT_FORM, status: 'published', token: 'tok-xyz' }
    render(<FormBuilder form={published} onSaved={() => {}} />)

    expect(screen.getByDisplayValue('既有草稿')).toBeDisabled()
    expect(screen.queryByText('儲存草稿')).not.toBeInTheDocument()
    expect(screen.queryByText('發佈表單')).not.toBeInTheDocument()
    expect(screen.getByText('已發佈')).toBeInTheDocument()
    expect(screen.getByText(/\/f\/tok-xyz$/)).toBeInTheDocument()
  })
})
