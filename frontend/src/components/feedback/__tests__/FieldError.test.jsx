import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import FieldError from '../FieldError'

describe('FieldError', () => {
  it('renders nothing when children is empty string', () => {
    const { container } = render(<FieldError>{''}</FieldError>)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when children is null', () => {
    const { container } = render(<FieldError>{null}</FieldError>)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders message when children has value', () => {
    render(<FieldError>請輸入姓名</FieldError>)
    expect(screen.getByText('請輸入姓名')).toBeInTheDocument()
  })

  it('uses red color #C0392B for text', () => {
    render(<FieldError>x</FieldError>)
    const el = screen.getByRole('alert')
    expect(el.style.color).toBe('rgb(192, 57, 43)')
  })

  it('has role=alert for accessibility', () => {
    render(<FieldError>x</FieldError>)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('renders dot bullet with red background', () => {
    const { container } = render(<FieldError>x</FieldError>)
    const dot = container.querySelector('span[aria-hidden="true"]')
    expect(dot).toBeInTheDocument()
    expect(dot.style.background).toBe('rgb(192, 57, 43)')
  })
})
