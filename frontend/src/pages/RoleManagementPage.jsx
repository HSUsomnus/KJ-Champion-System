import { useState, useEffect } from 'react'
import { useLiff } from '../context/LiffContext'
import PageHeader from '../components/PageHeader'
import { fetchAllMembersWithRole, updateMemberRole } from '../api'

export default function RoleManagementPage() {
  const { userId } = useLiff()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [updating, setUpdating] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (!userId) return
    loadMembers()
  }, [userId])

  const loadMembers = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const data = await fetchAllMembersWithRole(userId)
      setMembers(data)
    } catch (err) {
      setError(err.message || '載入失敗')
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = async (member, newRole) => {
    if (!confirm(`確定要將 ${member.name} 的權限改為「${newRole}」嗎？`)) {
      return
    }

    setUpdating(member.lineId)
    setError(null)

    try {
      await updateMemberRole(userId, member.lineId, newRole)
      // 更新本地狀態
      setMembers(prev => prev.map(m => 
        m.lineId === member.lineId ? { ...m, role: newRole } : m
      ))
    } catch (err) {
      setError(err.message || '更新失敗')
    } finally {
      setUpdating(null)
    }
  }

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case '開發者': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case '管理者': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case '負責人': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    }
  }

  const filteredMembers = members.filter(m => 
    m.name.includes(searchTerm) || 
    m.displayName.includes(searchTerm) ||
    m.email.includes(searchTerm)
  )

  const roleOptions = ['開發者', '管理者', '負責人', '一般人']

  if (loading) {
    return (
      <>
        <PageHeader title="權限管理" onRefresh={loadMembers} />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-slate-500 dark:text-gray-400">載入中...</p>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader title="權限管理" onRefresh={loadMembers} />
      <div className="flex-1 overflow-y-auto p-4 pb-24">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* 搜尋框 */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜尋成員姓名、Email..."
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg">
              {error}
            </div>
          )}

          {/* 統計 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {members.filter(m => m.role === '開發者').length}
              </div>
              <div className="text-xs text-purple-600 dark:text-purple-400">開發者</div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {members.filter(m => m.role === '管理者').length}
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400">管理者</div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {members.filter(m => m.role === '負責人').length}
              </div>
              <div className="text-xs text-green-600 dark:text-green-400">負責人</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                {members.filter(m => m.role === '一般人').length}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">一般人</div>
            </div>
          </div>

          {/* 成員列表 */}
          <div className="space-y-2">
            {filteredMembers.map((member) => (
              <div 
                key={member.lineId}
                className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4"
              >
                <div className="flex items-start gap-3">
                  {member.pictureUrl && (
                    <img
                      src={member.pictureUrl}
                      alt={member.name}
                      className="w-12 h-12 rounded-full"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-slate-900 dark:text-white">
                        {member.name}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getRoleBadgeColor(member.role)}`}>
                        {member.role}
                      </span>
                    </div>
                    {member.displayName && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {member.displayName}
                      </p>
                    )}
                    {member.email && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {member.email}
                      </p>
                    )}
                    
                    {/* 權限選擇 */}
                    <div className="mt-3">
                      <label className="text-xs text-slate-600 dark:text-slate-400 mb-1 block">
                        變更權限
                      </label>
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member, e.target.value)}
                        disabled={updating === member.lineId}
                        className="w-full sm:w-48 px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white disabled:opacity-50"
                      >
                        {roleOptions.map(role => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredMembers.length === 0 && (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              找不到符合的成員
            </div>
          )}
        </div>
      </div>
    </>
  )
}
