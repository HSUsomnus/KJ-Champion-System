import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Dialog from '../Dialog'

describe('Dialog', () => {
  it('renders nothing when open=false', () => {
    render(<Dialog open={false} onClose={() => {}}>Hello</Dialog>)
    expect(screen.queryByText('Hello')).not.toBeInTheDocument()
  })

  it('renders content via portal when open=true', () => {
    render(<Dialog open={true} onClose={() => {}}>Hello</Dialog>)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('calls onClose on ESC key', () => {
    const onClose = vi.fn()
    render(<Dialog open={true} onClose={onClose}>x</Dialog>)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not listen ESC when closed', () => {
    const onClose = vi.fn()
    render(<Dialog open={false} onClose={onClose}>x</Dialog>)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('does not call onClose when clicking card content (stopPropagation)', () => {
    const onClose = vi.fn()
    render(
      <Dialog open={true} onClose={onClose}>
        <span data-testid="card-content">content</span>
      </Dialog>
    )
    fireEvent.click(screen.getByTestId('card-content'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('default maxWidth uses max-w-xs', () => {
    const { container } = render(
      <Dialog open={true} onClose={() => {}}>
        <span data-testid="content">x</span>
      </Dialog>
    )
    const card = screen.getByTestId('content').parentElement
    expect(card.className).toContain('max-w-xs')
  })

  it('maxWidth=md applies max-w-md', () => {
    render(
      <Dialog open={true} onClose={() => {}} maxWidth="md">
        <span data-testid="content">x</span>
      </Dialog>
    )
    const card = screen.getByTestId('content').parentElement
    expect(card.className).toContain('max-w-md')
  })
})
