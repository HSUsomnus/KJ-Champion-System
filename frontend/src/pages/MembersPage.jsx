import { useState } from 'react'
import PageHeader from '../components/PageHeader'

const MOCK_MEMBERS = [
  { id: '1', name: 'Alex Johnson', star: '綠星', status: '2 分鐘前在線', avatar: null, online: true },
  { id: '2', name: 'Sarah Lee', star: '紅星', status: '東京分部', avatar: null },
  { id: '3', name: 'Michael Chen', star: '橙星', status: '', avatar: null },
  { id: '4', name: 'Emily Davis', star: '白星', status: '', avatar: null },
  { id: '5', name: 'Daniel Kim', star: '紫星', status: '', avatar: null, initials: 'DK' },
]

const STAR_CLASS = {
  白星: 'bg-star-white text-gray-600 dark:text-gray-400',
  綠星: 'bg-star-green text-green-800 dark:text-green-300',
  橙星: 'bg-star-orange text-orange-800 dark:text-orange-300',
  紅星: 'bg-star-red text-red-800 dark:text-red-300',
  紫星: 'bg-star-purple text-purple-800 dark:text-purple-300',
}

export default function MembersPage() {
  const [search, setSearch] = useState('')

  const filtered = MOCK_MEMBERS.filter(
    (m) => !search.trim() || m.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <PageHeader title="成員列表" onRefresh={() => window.location.reload()} />
      <div className="flex-1 overflow-y-auto no-scrollbar pb-24 bg-background-light dark:bg-background-dark">
        <div className="px-5 pt-6 pb-2">
          <button
            type="button"
            className="w-full flex items-center justify-center gap-2 h-12 bg-primary hover:bg-primary-dark active:scale-[0.98] transition-all rounded-lg text-white font-bold text-[15px] shadow-sm"
          >
            <span className="material-symbols-outlined text-[20px]">add_circle</span>
            <span>邀請新夥伴</span>
          </button>
        </div>
        <div className="px-5 py-3 sticky top-0 z-10 bg-background-light dark:bg-background-dark">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
              <span className="material-symbols-outlined text-[20px]">search</span>
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜尋姓名、電話或 ID"
              className="block w-full pl-10 pr-3 py-3 rounded-lg border-none bg-surface-light dark:bg-surface-dark text-sm font-medium text-slate-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
        <div className="px-5 pt-2 pb-1">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400">
            所有成員 ({filtered.length})
          </h3>
        </div>
        <div className="flex flex-col">
          {filtered.map((m) => (
            <div
              key={m.id}
              className="group flex items-center gap-4 px-5 py-3.5 active:bg-gray-50 dark:active:bg-white/5 transition-colors cursor-pointer border-b border-slate-100 dark:border-white/5"
            >
              <div className="relative shrink-0">
                {m.avatar ? (
                  <img
                    src={m.avatar}
                    alt=""
                    className="w-12 h-12 rounded-full bg-slate-200 bg-cover bg-center shadow-inner"
                  />
                ) : (
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                      m.initials ? 'bg-primary/10 text-primary' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {m.initials || m.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                {m.online && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-background-dark rounded-full" />
                )}
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <p className="text-[15px] font-semibold text-slate-900 dark:text-white truncate">{m.name}</p>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                      STAR_CLASS[m.star] || 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[10px] mr-1 fill-icon">star</span>
                    {m.star}
                  </span>
                  {m.status && (
                    <span className="text-xs text-slate-500 dark:text-gray-500 truncate">• {m.status}</span>
                  )}
                </div>
              </div>
              <span className="material-symbols-outlined text-[20px] text-slate-300 dark:text-slate-600 group-active:text-primary transition-colors">
                arrow_forward_ios
              </span>
            </div>
          ))}
        </div>
        <div className="h-8" />
      </div>
    </>
  )
}
