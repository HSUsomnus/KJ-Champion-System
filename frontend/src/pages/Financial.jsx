import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, useBlocker } from 'react-router-dom'
import Header from '../components/Header'
import FabNav from '../components/FabNav'
import FabAction, { PENCIL_ICON } from '../components/FabAction'
import ConfirmLeaveDialog from '../components/ConfirmLeaveDialog'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../services/api'

const AMOUNT_OPTIONS = Array.from({ length: 100 }, (_, i) => `${i + 1}00萬`)
AMOUNT_OPTIONS.push('10億')

export default function Financial() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const targetUserId = searchParams.get('userId')
  const targetUserName = searchParams.get('name')
  // 是否在檢視他人財力（從管理介面進入）
  const isViewingOther = targetUserId && targetUserId !== user?.lineId
  const viewUserId = targetUserId || user?.lineId

  const [activeFab, setActiveFab] = useState(null)
  const [hideFinancial, setHideFinancial] = useState(false)
  const [hideDocuments, setHideDocuments] = useState(false)
  const [documents, setDocuments] = useState([])
  const [financialAmount, setFinancialAmount] = useState('')
  const [showAmountPicker, setShowAmountPicker] = useState(false)
  const [canEdit, setCanEdit] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [selected, setSelected] = useState(new Set())

  // 編輯模式離開守衛
  const blocker = useBlocker(editMode)
  useEffect(() => {
    if (!editMode) return
    const handler = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [editMode])

  useEffect(() => {
    if (!viewUserId) return
    api.getFinancialList(viewUserId)
      .then(res => {
        if (res.success && res.data) {
          setDocuments(res.data)
        }
      })
      .catch(() => {})
  }, [viewUserId])

  // 檢查編輯權限 + 取得目標用戶的財力金額
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
      alert(err.message)
    }
  }

  const handleViewSheet = (doc) => {
    navigate(`/financial-preview?docId=${doc.id}&userId=${viewUserId}&filename=${encodeURIComponent(doc.original_filename)}`)
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
        alert(err.message)
        return
      }
    }
    setDocuments(prev => prev.filter(d => !selected.has(d.id)))
    setSelected(new Set())
    setEditMode(false)
  }

  const handleDownloadSelected = () => {
    for (const id of selected) {
      const url = `/api/financial/download/${id}?userId=${viewUserId}`
      window.open(url, '_blank')
    }
  }

  const selectEditItem = {
    label: '選取/編輯',
    onClick: () => { setEditMode(true); setSelected(new Set()) },
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
    ),
  }

  const normalFabItems = isViewingOther
    ? [selectEditItem]
    : [
        {
          label: '上傳財力', path: '/financial-upload',
          icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          ),
        },
        selectEditItem,
      ]

  const editFabItems = [
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
      label: '確認',
      onClick: () => { setEditMode(false); setSelected(new Set()) },
      labelBg: '#FDECEA', labelColor: '#C0392B', labelBorderColor: '#C0392B',
      btnBg: '#FDECEA', btnColor: '#C0392B', btnBorderColor: '#C0392B',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
    },
    {
      label: '取消',
      onClick: () => { setEditMode(false); setSelected(new Set()) },
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    },
  ]

  const fabItems = editMode ? editFabItems : normalFabItems

  const displayAmount = isViewingOther ? financialAmount : (user?.financialAmount || '')

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F7F5F2' }}>
      <Header user={user} />

      <main className="flex-1 overflow-y-auto pt-16 pb-28 px-4">
        <div className="flex items-center justify-between mt-4 mb-4">
          <h1 className="text-base font-semibold" style={{ color: '#2C2C2C' }}>
            {isViewingOther ? `${targetUserName || '用戶'}的財力` : '用戶財力'}
          </h1>
          {!isViewingOther && (
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-xs" style={{ color: '#8A8680' }}>隱藏</span>
              <button
                type="button" role="switch" aria-checked={hideFinancial}
                onClick={() => setHideFinancial(v => !v)}
                className="relative w-10 h-[22px] rounded-full transition-colors"
                style={{ background: hideFinancial ? '#4A7C59' : '#E2DED8' }}
              >
                <span className="absolute top-[2px] left-[2px] w-[18px] h-[18px] rounded-full bg-white shadow transition-transform" style={{ transform: hideFinancial ? 'translateX(18px)' : 'translateX(0)' }} />
              </button>
            </label>
          )}
        </div>

        {/* 財力金額 */}
        <section
          className="rounded-2xl p-4 shadow-sm mb-3 flex items-center justify-between"
          style={{ background: '#fff', border: '1px solid #E2DED8', cursor: (editMode && isViewingOther && canEdit) ? 'pointer' : 'default' }}
          onClick={() => { if (editMode && isViewingOther && canEdit) setShowAmountPicker(true) }}
        >
          <span className="text-sm" style={{ color: '#8A8680' }}>財力金額</span>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold" style={{ color: displayAmount ? '#4A7C59' : '#8A8680' }}>{displayAmount || '無資料'}</span>
            {editMode && isViewingOther && canEdit && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8A8680" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            )}
          </div>
        </section>

        {/* 金額選擇器 */}
        {showAmountPicker && (
          <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setShowAmountPicker(false)}>
            <div className="w-full max-w-md rounded-t-2xl" style={{ background: '#fff' }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: '#E2DED8' }}>
                <button className="text-sm" style={{ color: '#8A8680' }} onClick={() => setShowAmountPicker(false)}>取消</button>
                <span className="text-sm font-semibold" style={{ color: '#2C2C2C' }}>選擇財力金額</span>
                <button className="text-sm font-medium" style={{ color: '#4A7C59' }} onClick={() => handleAmountSelect('')}>清除</button>
              </div>
              <div className="overflow-y-auto" style={{ maxHeight: '60vh' }}>
                {AMOUNT_OPTIONS.map(amount => (
                  <button
                    key={amount}
                    onClick={() => handleAmountSelect(amount)}
                    className="w-full text-left px-6 py-3.5 text-sm transition-colors active:bg-gray-50 flex items-center justify-between"
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
              </div>
            </div>
          </div>
        )}

        {/* 歷史上傳記錄 */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold" style={{ color: '#8A8680', letterSpacing: '0.06em' }}>歷史上傳記錄</h2>
            <div className="flex items-center gap-3">
              <span className="text-xs" style={{ color: '#8A8680' }}>共 {documents.length} 份</span>
              {!isViewingOther && (
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <span className="text-xs" style={{ color: '#8A8680' }}>隱藏</span>
                  <button
                    type="button" role="switch" aria-checked={hideDocuments}
                    onClick={() => setHideDocuments(v => !v)}
                    className="relative w-10 h-[22px] rounded-full transition-colors"
                    style={{ background: hideDocuments ? '#4A7C59' : '#E2DED8' }}
                  >
                    <span className="absolute top-[2px] left-[2px] w-[18px] h-[18px] rounded-full bg-white shadow transition-transform" style={{ transform: hideDocuments ? 'translateX(18px)' : 'translateX(0)' }} />
                  </button>
                </label>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-3">
            {documents.map(doc => {
              const isSelected = selected.has(doc.id)
              return (
                <div
                  key={doc.id}
                  className="rounded-2xl p-4 shadow-sm transition-all active:scale-[0.98] cursor-pointer"
                  style={{ background: '#fff', border: `1px solid ${editMode && isSelected ? '#4A7C59' : '#E2DED8'}` }}
                  onClick={() => editMode ? toggleSelect(doc.id) : handleViewSheet(doc)}
                >
                  <div className="flex items-start gap-3">
                    {editMode && (
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
                    )}
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
                    {!editMode && (
                      <div className="flex items-center shrink-0 self-center">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8A8680" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9 18 15 12 9 6"/>
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </main>

      <FabNav onOpen={() => setActiveFab('nav')} />
      <FabAction items={fabItems} fabIcon={PENCIL_ICON} fabColor={editMode ? '#2C2C2C' : '#4A7C59'} onOpen={() => setActiveFab('action')} />
      <ConfirmLeaveDialog blocker={blocker} />
    </div>
  )
}
