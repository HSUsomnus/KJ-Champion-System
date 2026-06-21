import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import FabAction, { PENCIL_ICON } from '../components/FabAction'
import ConfirmLeaveDialog, { useLeaveGuard } from '../components/ConfirmLeaveDialog'
import { BottomSheet, useToast } from '../components/feedback'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../services/api'

const AMOUNT_OPTIONS = Array.from({ length: 100 }, (_, i) => `${i + 1}00萬`)
AMOUNT_OPTIONS.push('10億')

export default function FinancialEdit() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [searchParams] = useSearchParams()
  const targetUserId = searchParams.get('userId')
  const targetUserName = searchParams.get('name')
  const isViewingOther = targetUserId && targetUserId !== user?.lineId
  const viewUserId = targetUserId || user?.lineId

  const [documents, setDocuments] = useState([])
  const [financialAmount, setFinancialAmount] = useState('')
  const [showAmountPicker, setShowAmountPicker] = useState(false)
  const [canEdit, setCanEdit] = useState(false)
  const [selected, setSelected] = useState(new Set())

  const [blocker, setSaved] = useLeaveGuard()

  useEffect(() => {
    if (!viewUserId) return
    api.getFinancialList(viewUserId)
      .then(res => {
        if (res.success && res.data) setDocuments(res.data)
      })
      .catch(() => {})
  }, [viewUserId])

  useEffect(() => {
    if (!user?.lineId || !viewUserId) return
    if (isViewingOther) {
      api.checkFinancialPermission(user.lineId, viewUserId)
        .then(res => {
          if (res.success) setCanEdit(res.data?.canEdit || false)
        })
        .catch(() => {})
      api.getMember(viewUserId)
        .then(res => {
          if (res.success && res.data) {
            setFinancialAmount(res.data.financial_amount || res.data.financialAmount || '')
          }
        })
        .catch(() => {})
    } else {
      setFinancialAmount(user?.financialAmount || '')
    }
  }, [user?.lineId, viewUserId, isViewingOther])

  const handleAmountSelect = async (amount) => {
    setShowAmountPicker(false)
    try {
      await api.updateFinancialAmount(user.lineId, viewUserId, amount)
      setFinancialAmount(amount)
    } catch (err) {
      toast.error(err.message || '更新財力金額失敗')
    }
  }

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleDeleteSelected = async () => {
    if (selected.size === 0) return
    for (const id of selected) {
      try {
        await api.deleteFinancial(id, viewUserId)
      } catch (err) {
        toast.error(err.message || '刪除失敗')
        return
      }
    }
    setDocuments(prev => prev.filter(d => !selected.has(d.id)))
    setSelected(new Set())
  }

  const handleDownloadSelected = () => {
    for (const id of selected) {
      const url = `/api/financial/download/${id}?userId=${viewUserId}`
      window.open(url, '_blank')
    }
  }

  const goBack = () => {
    const params = new URLSearchParams()
    if (targetUserId) params.set('userId', targetUserId)
    if (targetUserName) params.set('name', targetUserName)
    const qs = params.toString()
    navigate(`/financial${qs ? `?${qs}` : ''}`)
  }

  const fabItems = [
    {
      label: '刪除',
      onClick: handleDeleteSelected,
      labelBg: '#FDECEA', labelColor: '#C0392B', labelBorderColor: '#C0392B',
      btnBg: '#FDECEA', btnColor: '#C0392B', btnBorderColor: '#C0392B',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
    },
    {
      label: '下載',
      onClick: handleDownloadSelected,
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
    },
    {
      label: '確認/儲存',
      onClick: () => { setSaved(); goBack() },
      labelBg: '#FDECEA', labelColor: '#C0392B', labelBorderColor: '#C0392B',
      btnBg: '#FDECEA', btnColor: '#C0392B', btnBorderColor: '#C0392B',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
    },
    {
      label: '取消',
      onClick: () => { setSaved(); goBack() },
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    },
  ]

  const displayAmount = isViewingOther ? financialAmount : (user?.financialAmount || '')

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F7F5F2' }}>
      <main className="flex-1 overflow-y-auto pt-14 pb-28 px-4">
        <div className="flex items-center justify-between mt-4 mb-4">
          <h1 className="text-base font-semibold" style={{ color: '#2C2C2C' }}>
            {isViewingOther ? `${targetUserName || '用戶'}的財力 — 選取/編輯` : '用戶財力 — 選取/編輯'}
          </h1>
        </div>

        {/* 財力金額 */}
        <section
          className="rounded-2xl p-4 shadow-sm mb-3 flex items-center justify-between"
          style={{ background: '#fff', border: '1px solid #E2DED8', cursor: (isViewingOther && canEdit) ? 'pointer' : 'default' }}
          onClick={() => { if (isViewingOther && canEdit) setShowAmountPicker(true) }}
        >
          <span className="text-sm" style={{ color: '#8A8680' }}>財力金額</span>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold" style={{ color: displayAmount ? '#4A7C59' : '#8A8680' }}>{displayAmount || '無資料'}</span>
            {isViewingOther && canEdit && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8A8680" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            )}
          </div>
        </section>

        {/* 金額選擇器 — 消費 BottomSheet base */}
        <BottomSheet
          open={showAmountPicker}
          onClose={() => setShowAmountPicker(false)}
          title="選擇財力金額"
        >
          <button
            type="button"
            onClick={() => handleAmountSelect('')}
            className="w-full text-left px-2 py-3 text-sm font-medium transition-colors active:opacity-60"
            style={{ color: '#4A7C59', borderBottom: '1px solid #F0EDE9' }}
          >
            清除（設為無資料）
          </button>
          {AMOUNT_OPTIONS.map(amount => (
            <button
              key={amount}
              type="button"
              onClick={() => handleAmountSelect(amount)}
              className="w-full text-left px-2 py-3.5 text-sm transition-colors active:opacity-60 flex items-center justify-between"
              style={{ color: '#2C2C2C', borderBottom: '1px solid #F0EDE9' }}
            >
              <span>{amount}</span>
              {financialAmount === amount && (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4A7C59" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
            </button>
          ))}
        </BottomSheet>

        {/* 歷史上傳記錄 */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold" style={{ color: '#8A8680', letterSpacing: '0.06em' }}>歷史上傳記錄</h2>
            <span className="text-xs" style={{ color: '#8A8680' }}>共 {documents.length} 份</span>
          </div>
          <div className="flex flex-col gap-3">
            {documents.map(doc => {
              const isSelected = selected.has(doc.id)
              return (
                <div
                  key={doc.id}
                  className="relative overflow-hidden rounded-2xl p-4 shadow-sm transition-all active:scale-[0.98] cursor-pointer"
                  style={{ background: '#fff', border: `1px solid ${isSelected ? '#4A7C59' : '#E2DED8'}` }}
                  onClick={() => toggleSelect(doc.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex items-center shrink-0 self-center">
                      <div
                        className="w-5 h-5 rounded-md flex items-center justify-center transition-all"
                        style={{
                          background: isSelected ? '#4A7C59' : '#fff',
                          border: `2px solid ${isSelected ? '#4A7C59' : '#D0CCC6'}`,
                        }}
                      >
                        {isSelected && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        )}
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#E8F0EB' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4A7C59" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: '#2C2C2C' }}>{doc.original_filename}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs" style={{ color: '#8A8680' }}>{doc.uploaded_at?.slice(0, 10)}</span>
                      </div>
                      {doc.comment && <p className="text-xs mt-1.5" style={{ color: '#8A8680' }}>{doc.comment}</p>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </main>

      <FabAction items={fabItems} fabIcon={PENCIL_ICON} fabColor="#4A7C59" />
      <ConfirmLeaveDialog blocker={blocker} />
    </div>
  )
}
