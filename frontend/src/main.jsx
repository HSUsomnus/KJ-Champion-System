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
  const maxPhoneRatio = Math.max(...PHONE_RATIOS)  // 9/16 = 0.5625

  // 寬高比在手機直式範圍內 → 視為手機，直接用全寬
  if (W / H <= maxPhoneRatio) return W

  // 桌機/平板（橫式）：用視窗高度反推手機直式欄寬，選最接近的標準比例
  const TARGET = 430
  let best = null, bestDiff = Infinity
  for (const r of PHONE_RATIOS) {
    const w = Math.round(H * r)
    const diff = Math.abs(w - TARGET)
    if (diff < bestDiff) { bestDiff = diff; best = w }
  }
  return best ?? Math.round(H * (9 / 19.5))
}

// React render 前同步設定，所有頁面整個 session 共用同一個值
const _colW = pickColWidth()
document.documentElement.style.setProperty('--col-max-w', `${_colW}px`)
document.documentElement.style.setProperty('--col-half-w', `${_colW / 2}px`)

// [設計決策] beforeinstallprompt 在 React mount 前就觸發，必須在這裡攔截
// 若在 useEffect 才加 listener 會 miss event，導致 PWA install 無法觸發
window.__pwaInstallPrompt = null
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  window.__pwaInstallPrompt = e
})


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
