import { useState, useEffect } from 'react'
import { useLiff } from '../context/LiffContext'
import PageHeader from '../components/PageHeader'

export default function DebugPage() {
  const { userId } = useLiff()
  const [results, setResults] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    runDiagnostics()
  }, [userId])

  const runDiagnostics = async () => {
    setLoading(true)
    const diagnostics = {}

    try {
      // 1. LINE Profile
      diagnostics.lineId = userId
      diagnostics.lineProfile = await liff.getProfile()

      // 2. 測試權限 API
      try {
        const roleRes = await fetch(`/api/admin/check?userId=${userId}`)
        diagnostics.roleApiStatus = roleRes.status
        diagnostics.roleApiData = await roleRes.json()
      } catch (err) {
        diagnostics.roleApiError = err.message
      }

      // 3. 測試個人資料 API
      try {
        const profileRes = await fetch(`/api/profile?userId=${userId}`)
        diagnostics.profileApiStatus = profileRes.status
        diagnostics.profileApiData = await profileRes.json()
      } catch (err) {
        diagnostics.profileApiError = err.message
      }

      // 4. 診斷結論
      const apiRole = diagnostics.roleApiData?.data?.role
      const dbRole = diagnostics.profileApiData?.data?.role
      const isAdmin = diagnostics.roleApiData?.data?.isAdmin

      diagnostics.conclusion = {
        apiRole: apiRole || '無',
        dbRole: dbRole || '無',
        isAdmin: isAdmin || false,
        shouldShowAdminPanel: isAdmin === true,
      }

      setResults(diagnostics)
    } catch (err) {
      diagnostics.fatalError = err.message
      setResults(diagnostics)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = () => {
    const text = JSON.stringify(results, null, 2)
    navigator.clipboard.writeText(text)
      .then(() => alert('診斷結果已複製到剪貼簿'))
      .catch(() => alert('複製失敗，請手動複製'))
  }

  if (loading) {
    return (
      <>
        <PageHeader title="系統診斷" />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-slate-500">診斷中...</p>
        </div>
      </>
    )
  }

  const { conclusion } = results

  return (
    <>
      <PageHeader title="系統診斷" onRefresh={runDiagnostics} />
      <div className="flex-1 overflow-y-auto p-4 pb-24">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* 診斷結論 */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4">
            <h2 className="font-bold text-lg mb-3 text-slate-900 dark:text-white">
              📋 診斷結論
            </h2>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">API 權限:</span>
                <span className={`font-bold ${conclusion?.apiRole === '開發者' ? 'text-green-600' : 'text-red-600'}`}>
                  {conclusion?.apiRole || '無'}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">資料庫權限:</span>
                <span className={`font-bold ${conclusion?.dbRole === '開發者' ? 'text-green-600' : 'text-red-600'}`}>
                  {conclusion?.dbRole || '無'}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">是否為開發者:</span>
                <span className={`font-bold ${conclusion?.isAdmin ? 'text-green-600' : 'text-red-600'}`}>
                  {conclusion?.isAdmin ? '✅ 是' : '❌ 否'}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">應該顯示開發人員區塊:</span>
                <span className={`font-bold ${conclusion?.shouldShowAdminPanel ? 'text-green-600' : 'text-red-600'}`}>
                  {conclusion?.shouldShowAdminPanel ? '✅ 是' : '❌ 否'}
                </span>
              </div>
            </div>

            {/* 問題診斷 */}
            {conclusion && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h3 className="font-bold text-blue-900 dark:text-blue-200 mb-2">
                  🔍 問題診斷
                </h3>
                {conclusion.apiRole === '開發者' ? (
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    ✅ 權限設定正確！如果前端沒顯示，請清除快取或重新開啟 LINE App。
                  </p>
                ) : (
                  <div className="text-sm text-blue-800 dark:text-blue-300 space-y-2">
                    <p className="font-bold">❌ 資料庫中的權限不是「開發者」</p>
                    <p>請到 Supabase SQL Editor 執行：</p>
                    <code className="block bg-white dark:bg-slate-800 p-2 rounded text-xs overflow-x-auto">
                      UPDATE members SET role = '開發者' WHERE line_id = '{results.lineId}';
                    </code>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* LINE 資訊 */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4">
            <h3 className="font-bold mb-2 text-slate-900 dark:text-white">👤 LINE 資訊</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">User ID:</span>
                <code className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                  {results.lineId}
                </code>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Display Name:</span>
                <span className="font-medium">{results.lineProfile?.displayName}</span>
              </div>
            </div>
          </div>

          {/* API 回應詳情 */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4">
            <h3 className="font-bold mb-2 text-slate-900 dark:text-white">🔌 API 回應</h3>
            
            <div className="mb-3">
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                權限檢查 API (Status: {results.roleApiStatus})
              </h4>
              <pre className="text-xs bg-slate-100 dark:bg-slate-700 p-2 rounded overflow-x-auto">
                {JSON.stringify(results.roleApiData || results.roleApiError, null, 2)}
              </pre>
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                個人資料 API (Status: {results.profileApiStatus})
              </h4>
              <pre className="text-xs bg-slate-100 dark:bg-slate-700 p-2 rounded overflow-x-auto">
                {JSON.stringify(results.profileApiData?.data || results.profileApiError, null, 2)}
              </pre>
            </div>
          </div>

          {/* 複製按鈕 */}
          <button
            onClick={copyToClipboard}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md"
          >
            📋 複製完整診斷結果
          </button>

          {/* 說明 */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 text-sm text-yellow-800 dark:text-yellow-200">
            <p className="font-bold mb-1">💡 如何使用</p>
            <p>1. 查看「診斷結論」區塊的問題診斷</p>
            <p>2. 按照指示到 Supabase 執行 SQL（如果需要）</p>
            <p>3. 或點選「複製完整診斷結果」傳給開發者</p>
          </div>
        </div>
      </div>
    </>
  )
}
