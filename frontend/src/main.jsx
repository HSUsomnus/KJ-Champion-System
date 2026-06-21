import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext'

// 市面上常見手機直式比例（寬/高），由窄到寬
const PHONE_RATIOS = [9 / 21, 9 / 20, 9 / 19.5, 9 / 19, 9 / 18, 9 / 16]

function pickColWidth() {
  const W = window.innerWidth
  const H = window.innerHeight
  if (W <= 520) return W  // 手機：直接用視窗寬
  // 桌機/平板：用視窗高度模擬手機直式，選最接近 430px 的標準比例
  const TARGET = 430
  let best = null, bestDiff = Infinity
  for (const r of PHONE_RATIOS) {
    const w = Math.round(H * r)
    if (w < 375 || w > 520) continue
    const diff = Math.abs(w - TARGET)
    if (diff < bestDiff) { bestDiff = diff; best = w }
  }
  return best ?? Math.min(500, Math.max(375, Math.round(H * (9 / 19.5))))
}

// React render 前同步設定，所有頁面整個 session 共用同一個值
const _colW = pickColWidth()
document.documentElement.style.setProperty('--col-max-w', `${_colW}px`)
document.documentElement.style.setProperty('--col-half-w', `${_colW / 2}px`)


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
