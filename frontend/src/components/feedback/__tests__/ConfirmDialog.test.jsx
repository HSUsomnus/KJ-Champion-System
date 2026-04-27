import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ConfirmDialog from '../ConfirmDialog'

const base = {
  open: true,
  onConfirm: () => {},
  onCancel: () => {},
  message: '確定嗎？',
}

describe('ConfirmDialog', () => {
  it('renders message', () => {
    render(<ConfirmDialog {...base} />)
    expect(screen.getByText('確定嗎？')).toBeInTheDocument()
  })

  it('renders title when provided', () => {
    render(<ConfirmDialog {...base} title="確認刪除" />)
    expect(screen.getByRole('heading', { name: '確認刪除' })).toBeInTheDocument()
  })

  it('does not render heading without title', () => {
    render(<ConfirmDialog {...base} />)
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })

  it('uses default 確認 / 取消 button text', () => {
    render(<ConfirmDialog {...base} />)
    expect(screen.getByRole('button', { name: '確認' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '取消' })).toBeInTheDocument()
  })

  it('uses custom button text', () => {
    render(<ConfirmDialog {...base} confirmText="刪除" cancelText="放棄" />)
    expect(screen.getByRole('button', { name: '刪除' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '放棄' })).toBeInTheDocument()
  })

  it('default variant: confirm button has dark background', () => {
    render(<ConfirmDialog {...base} variant="default" />)
    const btn = screen.getByRole('button', { name: '確認' })
    expect(btn.style.background).toBe('rgb(44, 44, 44)')
    expect(btn.style.color).toBe('rgb(255, 255, 255)')
  })

  it('danger variant: confirm button has red background + red border', () => {
    render(<ConfirmDialog {...base} variant="danger" confirmText="刪除" />)
    const btn = screen.getByRole('button', { name: '刪除' })
    expect(btn.style.background).toBe('rgb(253, 236, 234)') // #FDECEA
    expect(btn.style.color).toBe('rgb(192, 57, 43)') // #C0392B
    expect(btn.style.border).toContain('rgb(192, 57, 43)')
  })

  it('cancel button always uses muted style regardless of variant', () => {
    render(<ConfirmDialog {...base} variant="danger" />)
    const btn = screen.getByRole('button', { name: '取消' })
    expect(btn.style.background).toBe('rgb(239, 237, 233)') // #EFEDE9
    expect(btn.style.color).toBe('rgb(138, 134, 128)') // #8A8680
  })

  it('calls onConfirm when confirm clicked', () => {
    const onConfirm = vi.fn()
    render(<ConfirmDialog {...base} onConfirm={onConfirm} />)
    fireEvent.click(screen.getByRole('button', { name: '確認' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('calls onCancel when cancel clicked', () => {
    const onCancel = vi.fn()
    render(<ConfirmDialog {...base} onCancel={onCancel} />)
    fireEvent.click(screen.getByRole('button', { name: '取消' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('not rendered when open=false', () => {
    render(<ConfirmDialog {...base} open={false} />)
    expect(screen.queryByText('確定嗎？')).not.toBeInTheDocument()
  })
})
