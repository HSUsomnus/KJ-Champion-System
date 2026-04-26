import { createContext, useCallback, useContext, useState } from 'react'
import ToastContainer from './ToastContainer'
import ConfirmDialog from './ConfirmDialog'
import BottomSheet from './BottomSheet'

/**
 * FeedbackProvider — toast / confirm / bottomSheet 全域 context
 *
 * 包在 App.jsx 最外層後，任意 component 可用：
 *   const toast = useToast(); toast.success('已儲存')
 *   const confirm = useConfirm(); const ok = await confirm({ message:'刪除？', variant:'danger' })
 *   const sheet = useBottomSheet(); const val = await sheet.open({ title, render })
 */

const FeedbackContext = createContext(null)

const DEFAULT_DURATION = {
  success: 2000,
  info: 3000,
  error: 4000,
}
const MAX_TOASTS = 3

let _toastIdSeq = 0
const nextToastId = () => `t${++_toastIdSeq}_${Date.now()}`

export default function FeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [confirmState, setConfirmState] = useState(null)
  const [sheetState, setSheetState] = useState(null)

  const dismiss = useCallback((id) => {
    setToasts(prev => (id == null ? [] : prev.filter(t => t.id !== id)))
  }, [])

  const pushToast = useCallback((type, message, opts = {}) => {
    const id = nextToastId()
    const duration = opts.duration ?? DEFAULT_DURATION[type] ?? 3000
    setToasts(prev => [...prev, { id, type, message }].slice(-MAX_TOASTS))
    if (duration > 0) {
      setTimeout(() => dismiss(id), duration)
    }
    return id
  }, [dismiss])

  const toast = {
    success: (msg, opts) => pushToast('success', msg, opts),
    error: (msg, opts) => pushToast('error', msg, opts),
    info: (msg, opts) => pushToast('info', msg, opts),
    dismiss,
  }

  const confirm = useCallback((props) => {
    return new Promise(resolve => {
      setConfirmState({ props, resolve })
    })
  }, [])

  const resolveConfirm = (value) => {
    if (!confirmState) return
    const { resolve } = confirmState
    setConfirmState(null)
    resolve(value)
  }

  const sheet = {
    open: useCallback((props) => {
      return new Promise(resolve => {
        setSheetState({ props, resolve })
      })
    }, []),
  }

  const resolveSheet = (value) => {
    if (!sheetState) return
    const { resolve } = sheetState
    setSheetState(null)
    resolve(value ?? null)
  }

  return (
    <FeedbackContext.Provider value={{ toast, confirm, sheet }}>
      {children}
      <ToastContainer toasts={toasts} />
      <ConfirmDialog
        open={!!confirmState}
        title={confirmState?.props.title}
        message={confirmState?.props.message || ''}
        confirmText={confirmState?.props.confirmText}
        cancelText={confirmState?.props.cancelText}
        variant={confirmState?.props.variant}
        onConfirm={() => resolveConfirm(true)}
        onCancel={() => resolveConfirm(false)}
      />
      <BottomSheet
        open={!!sheetState}
        title={sheetState?.props.title || ''}
        onClose={() => resolveSheet(null)}
      >
        {sheetState?.props.render?.((val) => resolveSheet(val))}
      </BottomSheet>
    </FeedbackContext.Provider>
  )
}

const NO_PROVIDER_MSG =
  '請先在 App.jsx 最外層包 <FeedbackProvider>，再使用 useToast / useConfirm / useBottomSheet。'

export function useToast() {
  const ctx = useContext(FeedbackContext)
  if (!ctx) throw new Error(NO_PROVIDER_MSG)
  return ctx.toast
}

export function useConfirm() {
  const ctx = useContext(FeedbackContext)
  if (!ctx) throw new Error(NO_PROVIDER_MSG)
  return ctx.confirm
}

export function useBottomSheet() {
  const ctx = useContext(FeedbackContext)
  if (!ctx) throw new Error(NO_PROVIDER_MSG)
  return ctx.sheet
}
