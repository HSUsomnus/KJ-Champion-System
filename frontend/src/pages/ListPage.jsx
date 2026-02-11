/**
 * 行程列表頁（簡化版）
 * 與舊前端 list.html + list.js 對應
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { useLiff } from '../context/LiffContext';
import { getEvents } from '../services/api';

function formatYMD(d) {
  const pad = (n) => (n < 10 ? '0' + n : '' + n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// 將 ISO 時間字符串轉成 HH:MM 格式（正確處理時區）
function formatTime(isoString) {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch (e) {
    console.error('formatTime error:', e);
    return '';
  }
}

// 格式化行程日期時間顯示
function formatEventDisplay(event) {
  if (!event || !event.start) return '';
  try {
    const startDate = new Date(event.start);
    const endDate = new Date(event.end || event.start);
    
    if (isNaN(startDate.getTime())) return '';
    
    const startDateStr = `${startDate.getMonth() + 1}/${startDate.getDate()}`;
    
    if (event.allDay) {
      const endDateStr = `${endDate.getMonth() + 1}/${endDate.getDate()}`;
      if (startDateStr === endDateStr) {
        return `${startDateStr} 全天`;
      }
      return `${startDateStr} ~ ${endDateStr} 全天`;
    }
    
    const startTime = formatTime(event.start);
    const endTime = formatTime(event.end);
    return `${startDateStr} ${startTime} ~ ${endTime}`;
  } catch (e) {
    console.error('formatEventDisplay error:', e, event);
    return '';
  }
}

export default function ListPage() {
  const { userId } = useLiff();
  const navigate = useNavigate();
  const [date, setDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('全部');

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const tabs = ['全部', '學員上課', '活動', '諮詢簽約'];
  const startDate = formatYMD(new Date(year, month - 1, 1));
  const lastDay = new Date(year, month, 0);
  const endDate = formatYMD(lastDay);

  useEffect(() => {
    getEvents(startDate, endDate)
      .then(setEvents)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [startDate, endDate]);

  const prevMonth = () => setDate(new Date(year, month - 2));
  const nextMonth = () => setDate(new Date(year, month));

  const handleRefresh = () => {
    setLoading(true);
    getEvents(startDate, endDate)
      .then(setEvents)
      .finally(() => setLoading(false));
  };

  // 過濾行程
  const filteredEvents = activeTab === '全部' 
    ? events 
    : events.filter(e => e.type === activeTab);

  return (
    <div>
      <PageHeader title="📋 行程列表" onRefresh={handleRefresh} />

      {/* 月份切換：與舊版 .month-nav-bar 一致 */}
      <div
        className="flex items-center justify-between py-3 px-4 mb-4 rounded-xl bg-white"
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
      >
        <button
          type="button"
          onClick={prevMonth}
          className="w-10 h-10 flex items-center justify-center rounded-[10px] bg-[#06C755] text-white border-0 cursor-pointer transition-all hover:scale-105 active:scale-95"
          aria-label="上一個月"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="text-lg font-semibold text-[#333] text-center flex-1 tracking-wide">
          {year}年{month}月
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="w-10 h-10 flex items-center justify-center rounded-[10px] bg-[#06C755] text-white border-0 cursor-pointer transition-all hover:scale-105 active:scale-95"
          aria-label="下一個月"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* 分頁切換：與舊版 .tab-header / .tab-btn 一致 */}
      <div className="bg-white rounded-xl mb-4 overflow-hidden" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div className="flex border-b border-[#E0E0E0]">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 px-2 text-[15px] font-medium border-0 bg-transparent cursor-pointer transition-colors relative min-h-9 inline-flex items-center justify-center ${
                activeTab === tab ? 'text-[#06C755] font-semibold' : 'text-[#666]'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#06C755]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 新增行程按鈕 */}
      <div className="mb-4">
        <button
          type="button"
          onClick={() => navigate(userId ? `/add-event?date=${formatYMD(new Date(year, month - 1, 1))}` : '/add-event')}
          className="btn btn-primary btn-block"
        >
          ➕ 新增行程
        </button>
      </div>

      {/* 行程列表：與舊版 .event-card 一致 */}
      <div className="pt-1">
        {loading ? (
          <div className="flex justify-center py-12 text-[#666]">載入中...</div>
        ) : (
          <div className="space-y-3">
            {filteredEvents.length === 0 ? (
              <p className="text-[#666] text-center py-10">
                本月暫無{activeTab === '全部' ? '' : activeTab}行程
              </p>
            ) : (
              filteredEvents.map((ev) => (
                <Link key={ev.id} to={`/event/${ev.id}`} className="event-card">
                  <div className="event-card-header">
                    <span className="event-title">{ev.title || '無標題'}</span>
                    {ev.type && <span className={`event-type-badge ${ev.type}`}>{ev.type}</span>}
                  </div>
                  <div className="event-info-item">
                    <span>📅</span>
                    <span>{formatEventDisplay(ev)}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
