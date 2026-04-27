import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import FeedbackProvider, { useToast, useConfirm } from '../FeedbackProvider'

// 透過子元件把 hook API 暴露出來給測試操作
function ToastTrigger({ onReady }) {
  const toast = useToast()
  if (onReady) onReady(toast)
  return null
}

function ConfirmTrigger({ onReady }) {
  const confirm = useConfirm()
  if (onReady) onReady(confirm)
  return null
}

describe('FeedbackProvider', () => {
  describe('useToast', () => {
    it('throws friendly error when used outside Provider', () => {
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      expect(() => render(<ToastTrigger />)).toThrow(/FeedbackProvider/)
      errSpy.mockRestore()
    })

    it('shows success toast', () => {
      let api
      render(
        <FeedbackProvider>
          <ToastTrigger onReady={t => { api = t }} />
        </FeedbackProvider>
      )
      act(() => { api.success('已儲存') })
      expect(screen.getByText('已儲存')).toBeInTheDocument()
    })

    it('shows error toast', () => {
      let api
      render(
        <FeedbackProvider>
          <ToastTrigger onReady={t => { api = t }} />
        </FeedbackProvider>
      )
      act(() => { api.error('儲存失敗') })
      expect(screen.getByText('儲存失敗')).toBeInTheDocument()
    })

    it('caps toast stack at 3 — oldest dropped when 4th added', () => {
      let api
      render(
        <FeedbackProvider>
          <ToastTrigger onReady={t => { api = t }} />
        </FeedbackProvider>
      )
      act(() => {
        api.info('第1個')
        api.info('第2個')
        api.info('第3個')
        api.info('第4個')
      })
      expect(screen.queryByText('第1個')).not.toBeInTheDocument()
      expect(screen.getByText('第2個')).toBeInTheDocument()
      expect(screen.getByText('第3個')).toBeInTheDocument()
      expect(screen.getByText('第4個')).toBeInTheDocument()
    })

    it('auto dismisses success toast after 2s', () => {
      vi.useFakeTimers()
      let api
      render(
        <FeedbackProvider>
          <ToastTrigger onReady={t => { api = t }} />
        </FeedbackProvider>
      )
      act(() => { api.success('msg-2s') })
      expect(screen.getByText('msg-2s')).toBeInTheDocument()
      act(() => { vi.advanceTimersByTime(2000) })
      expect(screen.queryByText('msg-2s')).not.toBeInTheDocument()
      vi.useRealTimers()
    })

    it('auto dismisses error toast after 4s (longer than success)', () => {
      vi.useFakeTimers()
      let api
      render(
        <FeedbackProvider>
          <ToastTrigger onReady={t => { api = t }} />
        </FeedbackProvider>
      )
      act(() => { api.error('error-4s') })
      // 2s 後還在
      act(() => { vi.advanceTimersByTime(2000) })
      expect(screen.getByText('error-4s')).toBeInTheDocument()
      // 再 2s 才消失
      act(() => { vi.advanceTimersByTime(2000) })
      expect(screen.queryByText('error-4s')).not.toBeInTheDocument()
      vi.useRealTimers()
    })

    it('toast.dismiss() with no id clears all', () => {
      let api
      render(
        <FeedbackProvider>
          <ToastTrigger onReady={t => { api = t }} />
        </FeedbackProvider>
      )
      act(() => {
        api.info('a')
        api.info('b')
      })
      expect(screen.getByText('a')).toBeInTheDocument()
      expect(screen.getByText('b')).toBeInTheDocument()
      act(() => { api.dismiss() })
      expect(screen.queryByText('a')).not.toBeInTheDocument()
      expect(screen.queryByText('b')).not.toBeInTheDocument()
    })
  })

  describe('useConfirm', () => {
    it('throws friendly error when used outside Provider', () => {
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      expect(() => render(<ConfirmTrigger />)).toThrow(/FeedbackProvider/)
      errSpy.mockRestore()
    })

    it('shows dialog with message when called', async () => {
      let api
      render(
        <FeedbackProvider>
          <ConfirmTrigger onReady={c => { api = c }} />
        </FeedbackProvider>
      )
      act(() => { api({ message: '確定刪除？' }) })
      expect(await screen.findByText('確定刪除？')).toBeInTheDocument()
    })

    it('resolves true when confirm clicked', async () => {
      let api
      render(
        <FeedbackProvider>
          <ConfirmTrigger onReady={c => { api = c }} />
        </FeedbackProvider>
      )
      let promise
      act(() => { promise = api({ message: '?' }) })
      fireEvent.click(await screen.findByRole('button', { name: '確認' }))
      await expect(promise).resolves.toBe(true)
    })

    it('resolves false when cancel clicked', async () => {
      let api
      render(
        <FeedbackProvider>
          <ConfirmTrigger onReady={c => { api = c }} />
        </FeedbackProvider>
      )
      let promise
      act(() => { promise = api({ message: '?' }) })
      fireEvent.click(await screen.findByRole('button', { name: '取消' }))
      await expect(promise).resolves.toBe(false)
    })

    it('hides dialog after resolution', async () => {
      let api
      render(
        <FeedbackProvider>
          <ConfirmTrigger onReady={c => { api = c }} />
        </FeedbackProvider>
      )
      act(() => { api({ message: 'will-disappear' }) })
      expect(await screen.findByText('will-disappear')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: '確認' }))
      await waitFor(() => {
        expect(screen.queryByText('will-disappear')).not.toBeInTheDocument()
      })
    })

    it('passes danger variant to underlying ConfirmDialog', async () => {
      let api
      render(
        <FeedbackProvider>
          <ConfirmTrigger onReady={c => { api = c }} />
        </FeedbackProvider>
      )
      act(() => { api({ message: '刪除？', variant: 'danger', confirmText: '刪除' }) })
      const btn = await screen.findByRole('button', { name: '刪除' })
      expect(btn.style.background).toBe('rgb(253, 236, 234)') // #FDECEA
      expect(btn.style.color).toBe('rgb(192, 57, 43)') // #C0392B
    })

    it('passes custom title to dialog', async () => {
      let api
      render(
        <FeedbackProvider>
          <ConfirmTrigger onReady={c => { api = c }} />
        </FeedbackProvider>
      )
      act(() => { api({ title: '危險操作', message: 'x' }) })
      expect(await screen.findByRole('heading', { name: '危險操作' })).toBeInTheDocument()
    })
  })
})
