import { useState, useEffect, useCallback } from 'react'
import Header from '../components/Header'
import FabNav from '../components/FabNav'
import FabAction, { PENCIL_ICON } from '../components/FabAction'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../services/api'

const STATUS_CONFIG = {
  approved: { label: '已審核', bg: '#E8F0EB', color: '#4A7C59' },
  pending: { label: '審核中', bg: '#FFF3E0', color: '#C7A33A' },
  rejected: { label: '退回', bg: '#FDECEC', color: '#C75B3A' },
}

export default function Financial() {
  const { user } = useAuth()
  const [activeFab, setActiveFab] = useState(null)
  const [hideFinancial, setHideFinancial] = useState(false)
  const [hideDocuments, setHideDocuments] = useState(false)
  const [documents, setDocuments] = useState([])

  useEffect(() => {
    if (!user?.lineId) return
    api.getFinancialList(user.lineId)
      .then(res => {
        if (res.success && res.data) {
          setDocuments(res.data)
        }
      })
      .catch(() => {})
  }, [user?.lineId])

  const fabItems = [
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
  ]

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F7F5F2' }}>
      <Header user={user} />

      <main className="flex-1 overflow-y-auto pt-16 pb-28 px-4">
        <div className="flex items-center justify-between mt-4 mb-4">
          <h1 className="text-base font-semibold" style={{ color: '#2C2C2C' }}>用戶財力</h1>
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
        </div>

        {/* 財力金額 */}
        <section className="rounded-2xl p-4 shadow-sm mb-3 flex items-center justify-between" style={{ background: '#fff', border: '1px solid #E2DED8' }}>
          <span className="text-sm" style={{ color: '#8A8680' }}>財力金額</span>
          <span className="text-base font-bold" style={{ color: user?.financialAmount ? '#4A7C59' : '#8A8680' }}>{user?.financialAmount || '無資料'}</span>
        </section>

        {/* 歷史上傳記錄 */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold" style={{ color: '#8A8680', letterSpacing: '0.06em' }}>歷史上傳記錄</h2>
            <div className="flex items-center gap-3">
              <span className="text-xs" style={{ color: '#8A8680' }}>共 {documents.length} 份</span>
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
            </div>
          </div>
          <div className="flex flex-col gap-3">
            {documents.map(doc => {
              const st = STATUS_CONFIG[doc.status] || STATUS_CONFIG.pending
              return (
                <div key={doc.id} className="rounded-2xl p-4 shadow-sm transition-all active:scale-[0.98]" style={{ background: '#fff', border: '1px solid #E2DED8' }}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#EFEDE9' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8A8680" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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

      <FabNav onOpen={useCallback(() => setActiveFab('nav'), [])} />
      <FabAction items={fabItems} fabIcon={PENCIL_ICON} onOpen={useCallback(() => setActiveFab('action'), [])} />
    </div>
  )
}
