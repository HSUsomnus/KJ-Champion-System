import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Toast from '../Toast'

describe('Toast', () => {
  it('renders message', () => {
    render(<Toast type="info" message="提示訊息" />)
    expect(screen.getByText('提示訊息')).toBeInTheDocument()
  })

  it('success → green color bar #4A7C59', () => {
    const { container } = render(<Toast type="success" message="x" />)
    const bar = container.querySelector('.w-1')
    expect(bar.style.background).toBe('rgb(74, 124, 89)')
  })

  it('info → muted color bar #8A8680', () => {
    const { container } = render(<Toast type="info" message="x" />)
    const bar = container.querySelector('.w-1')
    expect(bar.style.background).toBe('rgb(138, 134, 128)')
  })

  it('error → red color bar #C0392B', () => {
    const { container } = render(<Toast type="error" message="x" />)
    const bar = container.querySelector('.w-1')
    expect(bar.style.background).toBe('rgb(192, 57, 43)')
  })

  it('falls back to info color when type unknown', () => {
    const { container } = render(<Toast type="weird" message="x" />)
    const bar = container.querySelector('.w-1')
    expect(bar.style.background).toBe('rgb(138, 134, 128)')
  })

  it('has role=status for screen readers', () => {
    render(<Toast type="success" message="x" />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})
