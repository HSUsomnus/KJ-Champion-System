import React from 'react'
import { render, screen } from '@testing-library/react'
import FormFieldsPreview from '../FormFieldsPreview'

const FIELDS = [
  { key: 'name', label: '姓名', type: 'text' },
  { key: 'note', label: '備註', type: 'text', required: false },
]

describe('FormFieldsPreview（十二節 12.5 共用逐題卡片 renderer）', () => {
  it('每題各自一張卡片，不是共用一張大卡', () => {
    render(<FormFieldsPreview fields={FIELDS} />)

    const nameLabel = screen.getByText('姓名')
    const noteLabel = screen.getByText('備註')
    // 各自的卡片容器（label 的曾祖父層）不相同
    expect(nameLabel.closest('div')).not.toBe(noteLabel.closest('div'))
  })

  it('required:true 或缺少 required → label 顯示必填星號', () => {
    render(<FormFieldsPreview fields={FIELDS} />)

    expect(screen.getByText('姓名').parentElement).toHaveTextContent('姓名 *')
  })

  it('required:false → label 不顯示必填星號', () => {
    render(<FormFieldsPreview fields={FIELDS} />)

    expect(screen.getByText('備註').parentElement).not.toHaveTextContent('備註 *')
  })
})
