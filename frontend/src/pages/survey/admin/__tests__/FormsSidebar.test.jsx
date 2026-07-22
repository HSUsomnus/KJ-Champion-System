import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import FormsSidebar from '../FormsSidebar'

const FORMS = [
  { id: 1, title: '康九冠軍調查', status: 'published' },
  { id: 2, title: '另一份表單', status: 'draft' },
]

describe('FormsSidebar', () => {
  it('列出所有表單標題與狀態標籤', () => {
    render(<FormsSidebar forms={FORMS} selectedId={1} onSelect={() => {}} />)

    expect(screen.getByText('康九冠軍調查')).toBeInTheDocument()
    expect(screen.getByText('已發佈')).toBeInTheDocument()
    expect(screen.getByText('另一份表單')).toBeInTheDocument()
    expect(screen.getByText('草稿')).toBeInTheDocument()
  })

  it('點擊表單 → 呼叫 onSelect 帶正確 id', () => {
    const onSelect = vi.fn()
    render(<FormsSidebar forms={FORMS} selectedId={1} onSelect={onSelect} />)

    fireEvent.click(screen.getByText('另一份表單'))

    expect(onSelect).toHaveBeenCalledWith(2)
  })

  it('沒有表單時顯示提示', () => {
    render(<FormsSidebar forms={[]} selectedId={null} onSelect={() => {}} />)

    expect(screen.getByText('尚無表單')).toBeInTheDocument()
  })
})
