import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import FabNav from '../components/FabNav'
import FabAction, { PENCIL_ICON } from '../components/FabAction'
import ConfirmLeaveDialog, { useLeaveGuard } from '../components/ConfirmLeaveDialog'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../services/api'

export default function FinancialUpload() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [activeFab, setActiveFab] = useState(null)
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0]
    if (selected) setFile(selected)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const dropped = e.dataTransfer.files?.[0]
    if (dropped) setFile(dropped)
  }

  const [blocker, setSaved] = useLeaveGuard()

  const handleConfirm = async () => {
    if (!file || !user?.lineId) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('userId', user.lineId)
      formData.append('originalFilename', file.name)
      formData.append('originalSize', file.size)
      formData.append('mimeType', file.type)

      await api.uploadFinancial(formData)
      setSaved()
      setTimeout(() => navigate('/financial'), 0)
    } catch (err) {
      alert(err.message)
    } finally {
      setUploading(false)
    }
  }

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const fabItems = [
    {
      label: uploading ? '上傳中...' : '確認',
      onClick: handleConfirm,
      labelBg: '#FDECEA', labelColor: '#C0392B', labelBorderColor: '#C0392B',
      btnBg: '#FDECEA', btnColor: '#C0392B', btnBorderColor: '#C0392B',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
    },
    {
      label: '取消',
      onClick: () => navigate('/financial'),
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    },
  ]

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F7F5F2' }}>
      <Header user={user} />

      <main className="flex-1 overflow-y-auto pt-16 pb-28 px-4">
        <h1 className="text-base font-semibold mt-4 mb-4" style={{ color: '#2C2C2C' }}>上傳財力證明</h1>

        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
          className="rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all active:scale-[0.98] mb-4"
          style={{ background: '#fff', border: '2px dashed #E2DED8', minHeight: '180px' }}
        >
          <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3" style={{ background: '#E8F0EB' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4A7C59" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <p className="text-sm font-medium" style={{ color: '#2C2C2C' }}>點擊或拖曳上傳</p>
          <p className="text-xs mt-1" style={{ color: '#8A8680' }}>支援 Excel、CSV、PDF、JPG、PNG</p>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv,.pdf,.jpg,.jpeg,.png" onChange={handleFileChange} className="hidden" />
        </div>

        {file && (
          <div className="rounded-2xl p-4 shadow-sm flex items-center gap-3" style={{ background: '#fff', border: '1px solid #E2DED8' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#E8F0EB' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4A7C59" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: '#2C2C2C' }}>{file.name}</p>
              <p className="text-xs" style={{ color: '#8A8680' }}>{formatSize(file.size)}</p>
            </div>
            <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null) }} className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 active:scale-90 transition-all" style={{ background: '#EFEDE9' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8A8680" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        )}
      </main>

      <FabNav onOpen={useCallback(() => setActiveFab('nav'), [])} />
      <FabAction items={fabItems} fabIcon={PENCIL_ICON} onOpen={useCallback(() => setActiveFab('action'), [])} />
      <ConfirmLeaveDialog blocker={blocker} />
    </div>
  )
}
