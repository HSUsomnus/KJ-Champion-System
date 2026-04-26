import { createPortal } from 'react-dom'
import Toast from './Toast'

/**
 * ToastContainer — toast 堆疊容器
 * 視覺遵循 UIDESIGN.md：fixed bottom-24，避開右下 FAB
 * z-[70]：高於 Dialog z-[60]，可在彈窗上方顯示
 */
export default function ToastContainer({ toasts }) {
  if (!toasts || toasts.length === 0) return null
  return createPortal(
    <div
      className="fixed bottom-24 left-1/2 z-[70] flex flex-col gap-2 items-center pointer-events-none"
      style={{ transform: 'translateX(-50%)' }}
    >
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto">
          <Toast type={t.type} message={t.message} />
        </div>
      ))}
    </div>,
    document.body
  )
}
