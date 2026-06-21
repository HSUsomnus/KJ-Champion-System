import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import LandscapeOverlay from './LandscapeOverlay'

/**
 * Example tests for LandscapeOverlay
 * Validates: Requirements 2.4
 */
describe('LandscapeOverlay', () => {
  it('renders the rotate hint text', () => {
    render(<LandscapeOverlay />)
    expect(screen.getByText('請旋轉至直立模式')).toBeInTheDocument()
  })

  it('renders an SVG element', () => {
    const { container } = render(<LandscapeOverlay />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })
})
