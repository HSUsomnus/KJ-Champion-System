import { useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import EventCard from '../components/EventCard'

const TABS = ['學員上課', '活動', '諮詢簽約']

const MOCK_EVENTS = {
  學員上課: [
    { id: '1', title: '學員課程討論', type: '學員上課', start: '2023-10-05T09:00:00+08:00', end: '2023-10-05T11:00:00+08:00', allDay: false },
  ],
  活動: [
    { id: '2', title: '團隊腦力激盪會議', type: '活動', start: '2023-10-05', end: '2023-10-05', allDay: true },
  ],
  諮詢簽約: [
    { id: '3', title: '專案進度審核', type: '諮詢簽約', start: '2023-10-05T14:00:00+08:00', end: '2023-10-05T15:30:00+08:00', allDay: false },
  ],
}

export default function ListPage() {
  const [activeTab, setActiveTab] = useState('學員上課')
  const events = MOCK_EVENTS[activeTab] || []

  return (
    <>
      <PageHeader title="行程列表" onRefresh={() => window.location.reload()} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-none border-b border-slate-100 dark:border-slate-800 px-4">
          <div className="flex gap-6 min-w-max">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`flex flex-col items-center pb-3 border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-primary text-primary font-semibold'
                    : 'border-transparent text-slate-500 dark:text-gray-400 hover:text-primary'
                }`}
              >
                <span className="text-sm">{tab}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 pb-[100px]">
          <div className="sticky top-0 z-10 bg-background-light dark:bg-background-dark py-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">2023年 10月</h3>
          </div>
          <div className="space-y-4 pt-2">
            {events.length === 0 ? (
              <p className="text-slate-500 dark:text-gray-400 text-center py-8">目前沒有行程</p>
            ) : (
              events.map((ev) => <EventCard key={ev.id} event={ev} />)
            )}
          </div>
          <div className="h-8" />
        </div>
      </div>
    </>
  )
}
