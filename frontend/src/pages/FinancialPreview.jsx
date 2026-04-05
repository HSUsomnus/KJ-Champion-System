import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import { useAuth } from '../contexts/AuthContext'
import * as XLSX from 'xlsx'

export default function FinancialPreview() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const docId = searchParams.get('docId')
  const userId = searchParams.get('userId')
  const filename = searchParams.get('filename') || '試算表'

  const [sheets, setSheets] = useState([])
  const [activeSheet, setActiveSheet] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!docId || !userId) return
    setLoading(true)
    fetch(`/api/financial/download/${docId}?userId=${userId}`)
      .then(res => {
        if (!res.ok) throw new Error('下載失敗')
        return res.arrayBuffer()
      })
      .then(buffer => {
        const workbook = XLSX.read(buffer, { type: 'array' })
        const parsed = workbook.SheetNames.map(name => {
          const sheet = workbook.Sheets[name]
          const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
          return { name, data }
        })
        setSheets(parsed)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [docId, userId])

  const currentSheet = sheets[activeSheet]

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F7F5F2' }}>
      <Header user={user} />

      <main className="flex-1 overflow-y-auto pt-16 pb-6 px-4">
        {/* 標題列 */}
        <div className="flex items-center gap-3 mt-4 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 active:scale-90 transition-all"
            style={{ background: '#EFEDE9' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2C2C2C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <h1 className="text-sm font-semibold truncate" style={{ color: '#2C2C2C' }}>{filename}</h1>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <p className="text-sm" style={{ color: '#8A8680' }}>載入中...</p>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center py-20">
            <p className="text-sm" style={{ color: '#C0392B' }}>{error}</p>
          </div>
        )}

        {!loading && !error && sheets.length > 0 && (
          <>
            {/* Sheet tabs */}
            {sheets.length > 1 && (
              <div className="flex gap-1 mb-3 overflow-x-auto">
                {sheets.map((s, i) => (
                  <button
                    key={s.name}
                    onClick={() => setActiveSheet(i)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-all"
                    style={{
                      background: activeSheet === i ? '#4A7C59' : '#fff',
                      color: activeSheet === i ? '#fff' : '#2C2C2C',
                      border: `1px solid ${activeSheet === i ? '#4A7C59' : '#E2DED8'}`,
                    }}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            )}

            {/* 表格 */}
            <div className="rounded-2xl overflow-hidden shadow-sm" style={{ background: '#fff', border: '1px solid #E2DED8' }}>
              <div className="overflow-x-auto">
                <table className="w-full" style={{ borderCollapse: 'collapse', minWidth: '100%' }}>
                  {currentSheet?.data.map((row, ri) => (
                    <tr key={ri}>
                      {/* 行號 */}
                      <td
                        className="text-center select-none"
                        style={{
                          padding: '6px 8px',
                          fontSize: 11,
                          color: '#8A8680',
                          background: '#F7F5F2',
                          borderBottom: '1px solid #EFEDE9',
                          borderRight: '1px solid #E2DED8',
                          minWidth: 36,
                          position: 'sticky',
                          left: 0,
                          zIndex: 1,
                        }}
                      >
                        {ri + 1}
                      </td>
                      {row.map((cell, ci) => (
                        <td
                          key={ci}
                          style={{
                            padding: '6px 10px',
                            fontSize: 12,
                            color: '#2C2C2C',
                            borderBottom: '1px solid #EFEDE9',
                            borderRight: '1px solid #F0EDE9',
                            whiteSpace: 'nowrap',
                            background: ri === 0 ? '#F7F5F2' : '#fff',
                            fontWeight: ri === 0 ? 600 : 400,
                          }}
                        >
                          {cell != null ? String(cell) : ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </table>
              </div>
            </div>

            {currentSheet && (
              <p className="text-xs mt-3 text-center" style={{ color: '#8A8680' }}>
                共 {currentSheet.data.length} 列
              </p>
            )}
          </>
        )}
      </main>
    </div>
  )
}
