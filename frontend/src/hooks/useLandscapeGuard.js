import { useState, useEffect } from 'react'

/**
 * 判斷目前是否應顯示橫屏提示 Overlay。
 * 觸控裝置（手機/平板）處於橫屏時回傳 true，否則 false。
 *
 * @returns {boolean}
 */
export function checkShouldShowOverlay() {
  const isLandscape = window.innerWidth > window.innerHeight
  const isTouchDevice =
    navigator.maxTouchPoints > 0 || 'ontouchstart' in window
  return isLandscape && isTouchDevice
}

/**
 * 監聽 resize 事件，當觸控裝置橫屏時回傳 showOverlay: true。
 *
 * @returns {{ showOverlay: boolean }}
 */
export default function useLandscapeGuard() {
  const [showOverlay, setShowOverlay] = useState(checkShouldShowOverlay)

  useEffect(() => {
    function handleResize() {
      setShowOverlay(checkShouldShowOverlay())
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return { showOverlay }
}
