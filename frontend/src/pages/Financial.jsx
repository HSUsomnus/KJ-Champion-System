import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import FabNav from '../components/FabNav'
import FabAction, { PENCIL_ICON } from '../components/FabAction'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../services/api'

export default function Financial() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const targetUserId = searchParams.get('userId')
  const targetUserName = searchParams.get('name')
  const isViewingOther = targetUserId && targetUserId !== user?.lineId
  const viewUserId = targetUserId || user?.lineId

  const [activeFab, setActiveFab] = useState(null)
  const [hideFinancial, setHideFinancial] = useState(false)
  const [hideDocuments, setHideDocuments] = useState(false)
  const [documents, setDocuments] = useState([])
  const [financialAmount, setFinancialAmount] = useState('')

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

  const handleOpenDoc = (doc) => {
    const url = `/api/financial/download/${doc.id}?userId=${viewUserId}`
    const opened = window.open(url, '_blank')
    if (!opened) {
      navigate(`/financial-preview?docId=${doc.id}&userId=${viewUserId}&filename=${encodeURIComponent(doc.original_filename)}`)
    }
  }

  const handleEditNav = () => {
    const params = new URLSearchParams()
    if (targetUserId) params.set('userId', targetUserId)
    if (targetUserName) params.set('name', targetUserName)
    const qs = params.toString()
    navigate(`/financial/edit${qs ? `?${qs}` : ''}`)
  }

  const fabItems = isViewingOther
    ? [
        {
          label: '選取/編輯', onClick: handleEditNav,
          icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          ),
        },
      ]
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
        {
          label: '選取/編輯', onClick: handleEditNav,
          icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          ),
        },
      ]

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
          style={{ background: '#fff', border: '1px solid #E2DED8' }}
        >
          <span className="text-sm" style={{ color: '#8A8680' }}>財力金額</span>
          <span className="text-base font-bold" style={{ color: displayAmount ? '#4A7C59' : '#8A8680' }}>{displayAmount || '無資料'}</span>
        </section>

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
            {documents.map(doc => (
              <div
                key={doc.id}
                className="relative overflow-hidden rounded-2xl p-4 shadow-sm transition-all active:scale-[0.98] cursor-pointer"
                style={{ background: '#fff', border: '1px solid #E2DED8' }}
                onClick={() => handleOpenDoc(doc)}
              >
                <div className="flex items-start gap-3">
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
                  <div className="flex items-center shrink-0 self-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8A8680" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <FabNav onOpen={() => setActiveFab('nav')} />
      <FabAction items={fabItems} fabIcon={PENCIL_ICON} fabColor="#4A7C59" onOpen={() => setActiveFab('action')} />
    </div>
  )
}
