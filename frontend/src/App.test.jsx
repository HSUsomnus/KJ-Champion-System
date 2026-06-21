import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AuthProvider } from './contexts/AuthContext'
import App from './App'

/**
 * Integration smoke tests for App + LandscapeOverlay
 * Validates: Requirements 2.1, 3.1
 */

// Mock the api service so AuthProvider's useEffect doesn't make real network calls
vi.mock('./services/api', () => ({
  api: {
    getProfile: () => Promise.reject(new Error('no network in tests')),
  },
  mapMember: (data) => data,
}))

function renderApp() {
  return render(
    <AuthProvider>
      <App />
    </AuthProvider>
  )
}

describe('App — LandscapeOverlay integration smoke test', () => {
  let originalInnerWidth
  let originalInnerHeight
  let originalMaxTouchPoints

  beforeEach(() => {
    originalInnerWidth = window.innerWidth
    originalInnerHeight = window.innerHeight
    originalMaxTouchPoints = navigator.maxTouchPoints
  })

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', { value: originalInnerWidth, writable: true, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: originalInnerHeight, writable: true, configurable: true })
    Object.defineProperty(navigator, 'maxTouchPoints', { value: originalMaxTouchPoints, writable: true, configurable: true })
  })

  it('shows LandscapeOverlay when touch device is in landscape (W=800, H=400)', () => {
    Object.defineProperty(window, 'innerWidth', { value: 800, writable: true, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: 400, writable: true, configurable: true })
    Object.defineProperty(navigator, 'maxTouchPoints', { value: 1, writable: true, configurable: true })

    renderApp()

    expect(screen.getByText('請旋轉至直立模式')).toBeInTheDocument()
  })

  it('does not show LandscapeOverlay when device is in portrait (W=390, H=844)', () => {
    Object.defineProperty(window, 'innerWidth', { value: 390, writable: true, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: 844, writable: true, configurable: true })
    Object.defineProperty(navigator, 'maxTouchPoints', { value: 1, writable: true, configurable: true })

    renderApp()

    expect(screen.queryByText('請旋轉至直立模式')).not.toBeInTheDocument()
  })
})
