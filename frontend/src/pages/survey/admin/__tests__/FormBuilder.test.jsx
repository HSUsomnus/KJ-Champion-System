import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { vi } from 'vitest'
import FormBuilder from '../FormBuilder'
import useAdminMembers from '../useAdminMembers'

const mockCreateAdminForm = vi.fn()
const mockPatchAdminForm = vi.fn()
const mockPublishAdminForm = vi.fn()

vi.mock('../../../../services/surveyApi', () => ({
  createAdminForm: (...args) => mockCreateAdminForm(...args),
  patchAdminForm: (...args) => mockPatchAdminForm(...args),
  publishAdminForm: (...args) => mockPublishAdminForm(...args),
}))

// 20.44 獨立互動預覽：FormPreview 用 useAdminMembers，這裡不測 hook 內部（見
// useAdminMembers.test.js/FormPreview.test.jsx），只給一個 ready 狀態的假資料
vi.mock('../useAdminMembers', () => ({ default: vi.fn() }))

beforeEach(() => {
  vi.clearAllMocks()
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    configurable: true,
  })
  useAdminMembers.mockReturnValue({ members: [], status: 'ready', error: '', retry: vi.fn() })
  Element.prototype.scrollIntoView = vi.fn() // jsdom 沒實作，發布驗證失敗時會呼叫
})

// FormBuilder 用 useBlocker（十二節 12.2 dirty 攔截）必須跑在 data router 裡，
// 否則 useBlocker 會直接 throw；用 memory router 包一層才能測
const renderFormBuilder = (props) => {
  const router = createMemoryRouter(
    [{ path: '/', element: <FormBuilder {...props} /> }],
    { initialEntries: ['/'] }
  )
  return render(<RouterProvider router={router} />)
}

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

    renderFormBuilder({ form: null, onSaved })

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
    renderFormBuilder({ form: null, onSaved: () => {} })
    expect(screen.getByText('發佈表單')).toBeDisabled()
  })

  it('儲存失敗 → 顯示伺服器回傳的 field/reason', async () => {
    const err = new Error('key 格式錯誤')
    err.data = { error: 'invalid_form', field: 'fields[0].key', reason: 'key 格式錯誤' }
    mockCreateAdminForm.mockRejectedValue(err)

    renderFormBuilder({ form: null, onSaved: () => {} })
    fireEvent.click(screen.getByText('＋ 新增題目'))
    fireEvent.click(screen.getByText('儲存草稿'))

    expect(await screen.findByText('fields[0].key：key 格式錯誤')).toBeInTheDocument()
  })
})

describe('FormBuilder — 編輯既有草稿', () => {
  it('帶入既有 title/fields，修改後儲存呼叫 patchAdminForm 帶 id', async () => {
    mockPatchAdminForm.mockResolvedValue({ success: true, data: { ...DRAFT_FORM, title: '改過的標題' } })
    const onSaved = vi.fn()

    renderFormBuilder({ form: DRAFT_FORM, onSaved })

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

    renderFormBuilder({ form: DRAFT_FORM, onSaved })
    fireEvent.click(screen.getByText('發佈表單'))
    fireEvent.click(await screen.findByText('確認發佈'))

    await waitFor(() => expect(mockPublishAdminForm).toHaveBeenCalledWith(5))
    expect(await screen.findByText('已發佈')).toBeInTheDocument()
    expect(screen.getByText(/\/f\/tok-abc$/)).toBeInTheDocument()

    fireEvent.click(screen.getByText('複製連結'))
    await waitFor(() =>
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('/f/tok-abc'))
    )
    expect(await screen.findByText('已複製')).toBeInTheDocument()
  })

  it('點刪除 → 出現確認對話框，點「取消」不刪除', () => {
    renderFormBuilder({ form: DRAFT_FORM, onSaved: () => {} })

    fireEvent.click(screen.getByText('刪除'))
    expect(screen.getByText('刪除這個問題？')).toBeInTheDocument()

    fireEvent.click(screen.getByText('取消'))
    expect(screen.queryByText('刪除這個問題？')).not.toBeInTheDocument()
    expect(screen.getByDisplayValue('name')).toBeInTheDocument()
  })

  it('十二節 12.6：確認對話框開啟時按 Escape 等同取消，焦點回到觸發按鈕', () => {
    renderFormBuilder({ form: DRAFT_FORM, onSaved: () => {} })

    const deleteButton = screen.getByText('刪除')
    deleteButton.focus()
    fireEvent.click(deleteButton)
    expect(screen.getByText('刪除這個問題？')).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByText('刪除這個問題？')).not.toBeInTheDocument()
    expect(document.activeElement).toBe(deleteButton)
  })

  it('點刪除 → 確認對話框點「刪除問題」才真的移除該欄位', () => {
    renderFormBuilder({ form: DRAFT_FORM, onSaved: () => {} })
    expect(screen.getByDisplayValue('name')).toBeInTheDocument()

    fireEvent.click(screen.getByText('刪除'))
    fireEvent.click(screen.getByText('刪除問題'))

    expect(screen.queryByText('刪除這個問題？')).not.toBeInTheDocument()
    expect(screen.queryByDisplayValue('name')).not.toBeInTheDocument()
  })

  it('複製題目 → 新副本成為焦點、key 原樣保留（會重複）並顯示重複錯誤', () => {
    renderFormBuilder({ form: DRAFT_FORM, onSaved: () => {} })

    fireEvent.click(screen.getByText('複製'))

    expect(screen.getByDisplayValue('name')).toBeInTheDocument() // 副本的 key 輸入框可見、值原樣保留
    expect(screen.getByText('● key 重複，請修改成唯一值')).toBeInTheDocument()
  })

  it('題目上移/下移 → 交換順序', () => {
    const twoFields = {
      ...DRAFT_FORM,
      fields: [
        { key: 'a', label: '第一題', type: 'text', required: true },
        { key: 'b', label: '第二題', type: 'text', required: true },
      ],
    }
    renderFormBuilder({ form: twoFields, onSaved: () => {} })

    // 第一題預設展開，第二題是摘要卡；點第一張卡的「題目下移」讓第一題往下移
    fireEvent.click(screen.getAllByLabelText('題目下移')[0])

    // 焦點跟著「題目」走、不是跟著位置走：第一題移到後面仍然是展開編輯中，
    // 第二題遞補到第一位、變成摘要卡
    expect(screen.getByDisplayValue('第一題')).toBeInTheDocument()
    const summaries = screen.getAllByText(/第.題/)
    expect(summaries[0]).toHaveTextContent('第二題')
  })

  it('拖曳排序：把手 dragStart + 卡片 drop → 換位置', () => {
    const twoFields = {
      ...DRAFT_FORM,
      fields: [
        { key: 'a', label: '第一題', type: 'text', required: true },
        { key: 'b', label: '第二題', type: 'text', required: true },
      ],
    }
    renderFormBuilder({ form: twoFields, onSaved: () => {} })

    const handles = screen.getAllByLabelText('拖曳排序')
    const secondCard = screen.getByTestId('question-card-1')

    fireEvent.dragStart(handles[0]) // 抓住「第一題」
    fireEvent.drop(secondCard) // 丟到「第二題」的卡片上

    // 焦點跟著「題目」走：第一題仍是展開編輯中，只是換到後面；第二題遞補第一位變摘要卡
    expect(screen.getByDisplayValue('第一題')).toBeInTheDocument()
    const summaries = screen.getAllByText(/第.題/)
    expect(summaries[0]).toHaveTextContent('第二題')
  })
})

describe('FormBuilder — searchable_select 選項編輯', () => {
  it('切換欄位型別為搜尋選單 → 出現新增選項按鈕，可新增/編輯/刪除選項', () => {
    renderFormBuilder({ form: null, onSaved: () => {} })
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

    renderFormBuilder({ form: null, onSaved: () => {} })
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

    renderFormBuilder({ form: null, onSaved: () => {} })
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
    renderFormBuilder({ form: TWO_FIELD_FORM, onSaved: () => {} })

    expect(screen.getByDisplayValue('name')).toBeInTheDocument() // 第一題展開中
    expect(screen.queryByDisplayValue('note')).not.toBeInTheDocument() // 第二題還是摘要卡
    expect(screen.getByText('備註')).toBeInTheDocument() // 摘要卡顯示題目標題
  })

  it('點摘要卡 → 該題展開、原本展開的題目收回摘要', () => {
    renderFormBuilder({ form: TWO_FIELD_FORM, onSaved: () => {} })

    fireEvent.click(screen.getByText('備註'))

    expect(screen.getByDisplayValue('note')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('name')).not.toBeInTheDocument()
    expect(screen.getByText('姓名')).toBeInTheDocument() // 姓名變摘要卡
  })
})

describe('FormBuilder — 已發佈表單唯讀（十二節 12.1：乾淨摘要，不顯示 disabled 編輯框）', () => {
  it('published 表單：標題輸入 disabled，不顯示儲存/發佈鈕，題目改成乾淨摘要而非 disabled input', () => {
    const published = { ...DRAFT_FORM, status: 'published', token: 'tok-xyz' }
    renderFormBuilder({ form: published, onSaved: () => {} })

    expect(screen.getByDisplayValue('既有草稿')).toBeDisabled()
    expect(screen.queryByText('儲存草稿')).not.toBeInTheDocument()
    expect(screen.queryByText('發佈表單')).not.toBeInTheDocument()
    expect(screen.getByText('已發佈')).toBeInTheDocument()
    expect(screen.getByText(/\/f\/tok-xyz$/)).toBeInTheDocument()

    // 題目不再是 disabled 的 key/label input，改成乾淨摘要（標題 + 題型）
    expect(screen.queryByPlaceholderText('key')).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText('問題標題')).not.toBeInTheDocument()
    expect(screen.getByText('姓名')).toBeInTheDocument()
    expect(screen.getByText('文字')).toBeInTheDocument()
    // 沒有拖曳把手、上移/下移、複製/刪除這些編輯專用操作
    expect(screen.queryByLabelText('拖曳排序')).not.toBeInTheDocument()
    expect(screen.queryByText('複製')).not.toBeInTheDocument()
    expect(screen.queryByText('刪除')).not.toBeInTheDocument()
  })
})

describe('FormBuilder — 發布前驗證（十二節 12.2）', () => {
  it('標題空白 → 點發佈不開確認對話框、不呼叫 API，顯示 inline 錯誤', () => {
    const emptyTitleForm = { ...DRAFT_FORM, title: '' }
    renderFormBuilder({ form: emptyTitleForm, onSaved: () => {} })

    fireEvent.click(screen.getByText('發佈表單'))

    expect(screen.queryByText('發布這份表單？')).not.toBeInTheDocument()
    expect(screen.getByText('● 請輸入表單標題')).toBeInTheDocument()
    expect(mockPublishAdminForm).not.toHaveBeenCalled()
  })

  it('題目 key 缺漏 → 點發佈不開確認對話框，該題自動展開並顯示錯誤', () => {
    const badKeyForm = {
      ...DRAFT_FORM,
      fields: [{ key: '', label: '姓名', type: 'text', required: true }],
    }
    renderFormBuilder({ form: badKeyForm, onSaved: () => {} })

    fireEvent.click(screen.getByText('發佈表單'))

    expect(screen.queryByText('發布這份表單？')).not.toBeInTheDocument()
    expect(screen.getByText(/key 格式錯誤/)).toBeInTheDocument()
    expect(mockPublishAdminForm).not.toHaveBeenCalled()
  })

  it('驗證通過 → 開確認對話框，點「取消」不呼叫 API', async () => {
    renderFormBuilder({ form: DRAFT_FORM, onSaved: () => {} })

    fireEvent.click(screen.getByText('發佈表單'))
    expect(await screen.findByText('發布這份表單？')).toBeInTheDocument()

    fireEvent.click(screen.getByText('取消'))

    expect(screen.queryByText('發布這份表單？')).not.toBeInTheDocument()
    expect(mockPublishAdminForm).not.toHaveBeenCalled()
  })
})

describe('FormBuilder — dirty state 與離頁攔截（十二節 12.2）', () => {
  it('修改標題後未儲存就重新整理/關閉 → beforeunload 被攔截', () => {
    renderFormBuilder({ form: DRAFT_FORM, onSaved: () => {} })

    fireEvent.change(screen.getByDisplayValue('既有草稿'), { target: { value: '改過但沒存' } })

    const event = new Event('beforeunload', { cancelable: true })
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault')
    window.dispatchEvent(event)

    expect(preventDefaultSpy).toHaveBeenCalled()
  })

  it('沒有未儲存變更時，重新整理/關閉不會被攔截', () => {
    renderFormBuilder({ form: DRAFT_FORM, onSaved: () => {} })

    const event = new Event('beforeunload', { cancelable: true })
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault')
    window.dispatchEvent(event)

    expect(preventDefaultSpy).not.toHaveBeenCalled()
  })

  it('儲存成功後 dirty 清除，不再攔截 beforeunload', async () => {
    mockPatchAdminForm.mockResolvedValue({ success: true, data: DRAFT_FORM })
    renderFormBuilder({ form: DRAFT_FORM, onSaved: () => {} })

    fireEvent.change(screen.getByDisplayValue('既有草稿'), { target: { value: '改過的標題' } })
    fireEvent.click(screen.getByText('儲存草稿'))
    // 等到 saving flow 整個跑完（含 finally setSaving(false)）才確定 setSavedSnapshot 也已套用，
    // 不能只等 mock 被呼叫——那一刻 await 內的後續狀態更新可能都還沒 flush
    await waitFor(() => expect(screen.queryByText('儲存中...')).not.toBeInTheDocument())

    const event = new Event('beforeunload', { cancelable: true })
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault')
    window.dispatchEvent(event)

    expect(preventDefaultSpy).not.toHaveBeenCalled()
  })

  it('儲存失敗時仍保留 dirty（不清除未儲存狀態）', async () => {
    const err = new Error('儲存失敗')
    err.data = { error: 'invalid_form', field: 'title', reason: '儲存失敗' }
    mockPatchAdminForm.mockRejectedValue(err)
    renderFormBuilder({ form: DRAFT_FORM, onSaved: () => {} })

    fireEvent.change(screen.getByDisplayValue('既有草稿'), { target: { value: '改過的標題' } })
    fireEvent.click(screen.getByText('儲存草稿'))
    await screen.findByText('title：儲存失敗')

    const event = new Event('beforeunload', { cancelable: true })
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault')
    window.dispatchEvent(event)

    expect(preventDefaultSpy).toHaveBeenCalled()
  })

  it('十二節 12.3：切到「預覽」→ 不再顯示題目編輯輸入框，改顯示互動預覽；切回「問題編輯」恢復', () => {
    renderFormBuilder({ form: DRAFT_FORM, onSaved: () => {} })

    fireEvent.click(screen.getByText('預覽'))

    expect(screen.queryByPlaceholderText('key')).not.toBeInTheDocument()
    expect(screen.getByText('送出（預覽停用）')).toBeInTheDocument()

    fireEvent.click(screen.getByText('問題編輯'))
    expect(screen.getByPlaceholderText('key')).toBeInTheDocument()
    expect(screen.queryByText('送出（預覽停用）')).not.toBeInTheDocument()
  })

  it('十二節 12.3：關閉再開預覽會重置答案（不會殘留上次填的值）', () => {
    useAdminMembers.mockReturnValue({
      members: [], status: 'ready', error: '', retry: vi.fn(),
    })
    const yesnoForm = {
      ...DRAFT_FORM,
      fields: [{ key: 'join_master', label: '天驥加盟主', type: 'yesno', required: true }],
    }
    renderFormBuilder({ form: yesnoForm, onSaved: () => {} })

    fireEvent.click(screen.getByText('預覽'))
    fireEvent.click(screen.getByText('是')) // 填一個答案

    fireEvent.click(screen.getByText('問題編輯'))
    fireEvent.click(screen.getByText('預覽')) // 重新打開預覽

    // 重新打開後「是」不應該還停留在已選取的樣式（背景變 accent 色）
    expect(screen.getByText('是').closest('button')).not.toHaveStyle({ background: '#4A7C59' })
  })

  it('onDirtyChange 會回報目前的 dirty 狀態給父層', () => {
    const onDirtyChange = vi.fn()
    renderFormBuilder({ form: DRAFT_FORM, onSaved: () => {}, onDirtyChange })

    expect(onDirtyChange).toHaveBeenCalledWith(false)

    fireEvent.change(screen.getByDisplayValue('既有草稿'), { target: { value: '改過但沒存' } })

    expect(onDirtyChange).toHaveBeenLastCalledWith(true)
  })
})
