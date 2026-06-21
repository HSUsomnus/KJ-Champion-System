import React from 'react'
import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import FabAction from '../FabAction'

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))

vi.mock('react-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, createPortal: (node) => node }
})

describe('FabAction', () => {
  it('renders fixed-position FAB container', () => {
    render(<FabAction />)
    const container = screen.getByTestId('fab-container')
    expect(container.style.position).toBe('fixed')
    expect(container.style.bottom).toBe('24px')
    // right: max(16px, calc(50% - 208px)) — jsdom 不支援 CSS max()，由 dev 站目測驗收
  })
})
