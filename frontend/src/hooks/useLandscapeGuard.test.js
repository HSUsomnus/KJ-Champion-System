/**
 * Property-based tests for useLandscapeGuard
 *
 * Uses fast-check via @fast-check/vitest for property generation.
 */
import { describe, afterEach } from 'vitest'
import { fc, test as fcTest } from '@fast-check/vitest'
import { renderHook, act } from '@testing-library/react'
import { checkShouldShowOverlay } from './useLandscapeGuard'
import useLandscapeGuard from './useLandscapeGuard'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Override window dimensions and touch capability.
 * Returns a restore function.
 */
function mockWindowEnv({ width, height, maxTouchPoints, hasOntouchstart }) {
  const origInnerWidth = window.innerWidth
  const origInnerHeight = window.innerHeight
  const origMaxTouchPoints = navigator.maxTouchPoints

  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width })
  Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: height })
  Object.defineProperty(navigator, 'maxTouchPoints', {
    configurable: true,
    writable: true,
    value: maxTouchPoints,
  })

  if (hasOntouchstart) {
    window.ontouchstart = undefined
  } else {
    delete window.ontouchstart
  }

  return () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: origInnerWidth })
    Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: origInnerHeight })
    Object.defineProperty(navigator, 'maxTouchPoints', {
      configurable: true,
      writable: true,
      value: origMaxTouchPoints,
    })
    delete window.ontouchstart
  }
}

// ---------------------------------------------------------------------------
// Property 1: 橫屏觸控裝置顯示 Overlay
// For any 觸控裝置，W > H 時回傳 true
// Validates: Requirements 2.1, 2.2
// ---------------------------------------------------------------------------
describe('Property 1: 橫屏觸控裝置顯示 Overlay', () => {
  /**
   * Generates a landscape scenario: width strictly greater than height,
   * with at least one touch indicator active.
   */
  const landscapeTouchArb = fc.record({
    height: fc.integer({ min: 1, max: 2048 }),
    extraWidth: fc.integer({ min: 1, max: 2048 }),
    maxTouchPoints: fc.integer({ min: 1, max: 5 }),
    hasOntouchstart: fc.boolean(),
  })

  fcTest.prop([landscapeTouchArb])(
    'W > H 且 isTouchDevice → checkShouldShowOverlay() === true',
    ({ height, extraWidth, maxTouchPoints, hasOntouchstart }) => {
      const width = height + extraWidth // guarantees width > height
      const restore = mockWindowEnv({ width, height, maxTouchPoints, hasOntouchstart })
      try {
        // Property 1: Validates Requirements 2.1, 2.2
        expect(checkShouldShowOverlay()).toBe(true)
      } finally {
        restore()
      }
    }
  )
})

// ---------------------------------------------------------------------------
// Property 2: 直立模式不顯示 Overlay
// For any 裝置，W ≤ H 時回傳 false
// Validates: Requirements 3.1, 3.2, 3.5
// ---------------------------------------------------------------------------
describe('Property 2: 直立模式不顯示 Overlay', () => {
  /**
   * Portrait scenario: height >= width (any device, touch or non-touch)
   */
  const portraitArb = fc.record({
    width: fc.integer({ min: 1, max: 2048 }),
    extraHeight: fc.integer({ min: 0, max: 2048 }),
    maxTouchPoints: fc.integer({ min: 0, max: 5 }),
    hasOntouchstart: fc.boolean(),
  })

  fcTest.prop([portraitArb])(
    'W ≤ H（任何裝置）→ checkShouldShowOverlay() === false',
    ({ width, extraHeight, maxTouchPoints, hasOntouchstart }) => {
      const height = width + extraHeight // guarantees height >= width
      const restore = mockWindowEnv({ width, height, maxTouchPoints, hasOntouchstart })
      try {
        // Property 2: Validates Requirements 3.1, 3.2, 3.5
        expect(checkShouldShowOverlay()).toBe(false)
      } finally {
        restore()
      }
    }
  )
})

// ---------------------------------------------------------------------------
// Property 3: 桌機橫屏不顯示 Overlay
// For any 非觸控裝置，W > H 時仍回傳 false
// Validates: Requirements 3.3
// ---------------------------------------------------------------------------
describe('Property 3: 桌機橫屏不顯示 Overlay', () => {
  /**
   * Desktop landscape scenario: width > height, no touch capability.
   */
  const desktopLandscapeArb = fc.record({
    height: fc.integer({ min: 1, max: 2048 }),
    extraWidth: fc.integer({ min: 1, max: 2048 }),
  })

  fcTest.prop([desktopLandscapeArb])(
    '非觸控裝置 W > H → checkShouldShowOverlay() === false',
    ({ height, extraWidth }) => {
      const width = height + extraWidth // guarantees width > height
      const restore = mockWindowEnv({ width, height, maxTouchPoints: 0, hasOntouchstart: false })
      try {
        // Property 3: Validates Requirements 3.3
        expect(checkShouldShowOverlay()).toBe(false)
      } finally {
        restore()
      }
    }
  )
})

// ---------------------------------------------------------------------------
// Property 4: 方向切換即時更新
// 模擬 resize 事件後，hook 狀態與 checkShouldShowOverlay() 回傳值一致
// Validates: Requirements 2.2, 2.3
// ---------------------------------------------------------------------------
describe('Property 4: 方向切換即時更新', () => {
  const envArb = fc.record({
    width: fc.integer({ min: 1, max: 1000 }),
    height: fc.integer({ min: 1, max: 1000 }),
    maxTouchPoints: fc.integer({ min: 0, max: 5 }),
    hasOntouchstart: fc.boolean(),
  })

  fcTest.prop([envArb, envArb])(
    'resize 後 showOverlay 與 checkShouldShowOverlay() 一致',
    async (initial, after) => {
      // 設定初始環境並渲染 hook
      const restoreInitial = mockWindowEnv(initial)
      const { result } = renderHook(() => useLandscapeGuard())
      restoreInitial()

      // 切換到 after 環境，觸發 resize
      const restoreAfter = mockWindowEnv(after)
      try {
        await act(async () => {
          window.dispatchEvent(new Event('resize'))
        })

        // Property 4: Validates Requirements 2.2, 2.3
        const expected = checkShouldShowOverlay()
        expect(result.current.showOverlay).toBe(expected)
      } finally {
        restoreAfter()
      }
    }
  )
})
