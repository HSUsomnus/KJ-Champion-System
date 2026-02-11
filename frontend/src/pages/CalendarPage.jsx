/**
 * 行事曆主頁
 * 與舊前端 index.html + calendar.js 對應
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { useLiff } from '../context/LiffContext';
import { getEvents } from '../services/api';

// 將 Date 轉成 YYYY-MM-DD
function formatYMD(d) {
  const pad = (n) => (n < 10 ? '0' + n : '' + n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function CalendarPage() {
  const { userId } = useLiff();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [monthEvents, setMonthEvents] = useState([]);
  const [todayEvents, setTodayEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  useEffect(() => {
    const lastDay = new Date(year, month, 0);
    const startDate = formatYMD(new Date(year, month - 1, 1));
    const endDate = formatYMD(lastDay);

    getEvents(startDate, endDate)
      .then((events) => {
        setMonthEvents(events);
        // 從月行程中過濾出當日行程（包含跨日）
        const selectedStr = formatYMD(selectedDate);
        const todayEventsFiltered = events.filter((e) => {
          const start = (e.start || '').split('T')[0];
          const end = (e.end || '').split('T')[0];
          return selectedStr >= start && selectedStr <= end;
        });
        setTodayEvents(todayEventsFiltered);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [year, month, selectedDate]);

  const handleRefresh = () => {
    setLoading(true);
    const lastDay = new Date(year, month, 0);
    const startDate = formatYMD(new Date(year, month - 1, 1));
    const endDate = formatYMD(lastDay);
    getEvents(startDate, endDate)
      .then((events) => {
        setMonthEvents(events);
        const selectedStr = formatYMD(selectedDate);
        const todayEventsFiltered = events.filter((e) => {
          const start = (e.start || '').split('T')[0];
          const end = (e.end || '').split('T')[0];
          return selectedStr >= start && selectedStr <= end;
        });
        setTodayEvents(todayEventsFiltered);
      })
      .finally(() => {
        setLoading(false);
        window.location.reload();
      });
  };

  const prevMonth = () => setCurrentDate(new Date(year, month - 2));
  const nextMonth = () => setCurrentDate(new Date(year, month));

  // 計算月曆格子
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const startPadding = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  const totalCells = Math.ceil((startPadding + daysInMonth) / 7) * 7;
  const days = [];
  for (let i = 0; i < startPadding; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  while (days.length < totalCells) days.push(null);

  const getEventsForDay = (d) => {
    if (!d) return [];
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    return monthEvents.filter((e) => {
      const start = (e.start || '').split('T')[0];
      const end = (e.end || '').split('T')[0];
      // 跨日行程：日期在 start 和 end 之間（含頭尾）
      return dateStr >= start && dateStr <= end;
    });
  };

  const selectedStr = formatYMD(selectedDate);
  const isSelectedToday = selectedStr === formatYMD(new Date());

  const addEventUrl = userId ? `/add-event?date=${selectedStr}` : '/add-event';

  return (
    <div>
      <PageHeader title="📅 行事曆" onRefresh={handleRefresh} />

      {/* 月曆卡片：與舊版 .calendar 一致 */}
      <div className="card mb-4">
        <div className="flex justify-between items-center mb-4">
          <button
            type="button"
            onClick={prevMonth}
            className="p-2 text-xl text-[#666] hover:text-[#06C755] transition-colors border-0 bg-transparent cursor-pointer"
          >
            ‹
          </button>
          <h2 className="text-[15px] font-semibold text-[#333] m-0">
            {year}年{month}月
          </h2>
          <button
            type="button"
            onClick={nextMonth}
            className="p-2 text-xl text-[#666] hover:text-[#06C755] transition-colors border-0 bg-transparent cursor-pointer"
          >
            ›
          </button>
        </div>
        <div className="grid grid-cols-7 gap-0.5 text-center">
          {['日', '一', '二', '三', '四', '五', '六'].map((w) => (
            <div key={w} className="text-[10px] font-semibold text-[#666] py-0.5">
              {w}
            </div>
          ))}
          {days.map((d, i) => {
            if (!d) return <div key={`empty-${i}`} />;
            const dayEvents = getEventsForDay(d);
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isSel = dateStr === selectedStr;
            const isToday = dateStr === formatYMD(new Date());
            
            // 收集當日所有行程類型（去重）並按順序排列，最多顯示 4 個
            const typeOrder = ['學員上課', '活動', '諮詢簽約', '個人行程'];
            const uniqueTypes = [...new Set(dayEvents.map(e => e.type || '其他'))];
            const sortedTypes = uniqueTypes
              .sort((a, b) => {
                const aIdx = typeOrder.indexOf(a);
                const bIdx = typeOrder.indexOf(b);
                if (aIdx === -1 && bIdx === -1) return 0;
                if (aIdx === -1) return 1;
                if (bIdx === -1) return -1;
                return aIdx - bIdx;
              })
              .slice(0, 4);
            
            // 類型對應顏色
            const getTypeColor = (type) => {
              switch (type) {
                case '學員上課': return 'bg-[#F57F17]';
                case '活動': return 'bg-[#C62828]';
                case '諮詢簽約': return 'bg-[#2E7D32]';
                case '個人行程': return 'bg-[#1976D2]'; // 藍色
                default: return 'bg-[#999]';
              }
            };
            
            return (
              <button
                key={d}
                type="button"
                onClick={() => setSelectedDate(new Date(year, month - 1, d))}
                className={`min-h-0 aspect-square flex flex-col items-center justify-center rounded text-[11px] transition-all ${
                  isSel
                    ? 'bg-transparent text-[#06C755] border-2 border-[#06C755] font-semibold'
                    : isToday
                    ? 'bg-transparent text-[#333] border border-[#E0E0E0] font-semibold'
                    : 'border border-transparent hover:bg-[#F5F5F5] text-[#333]'
                } ${sortedTypes.length > 0 ? 'relative' : ''}`}
              >
                {d}
                {sortedTypes.length > 0 && (
                  <div className="absolute bottom-0.5 flex gap-0.5">
                    {sortedTypes.map((type, idx) => (
                      <span
                        key={idx}
                        className={`w-1 h-1 rounded-full ${getTypeColor(type)}`}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 今日行程標題 + 新增按鈕：與舊版 .today-section-header / .btn-add-inline 一致 */}
      <div className="flex items-center justify-between gap-3 mt-4 mb-2 min-h-9">
        <h2 className="text-[17px] font-semibold text-[#333] m-0 leading-tight">
          {isSelectedToday ? '今日行程' : `${selectedStr} 行程`}
        </h2>
        <Link
          to={addEventUrl}
          className="btn btn-primary !py-1.5 !px-3.5 text-sm !min-h-0 inline-flex"
        >
          ➕ 新增行程
        </Link>
      </div>

      {/* 行程字卡：與舊版 .event-card 一致 */}
      <div className="min-h-[120px]">
        {loading ? (
          <div className="flex justify-center items-center py-10 text-[#666]">
            載入中...
          </div>
        ) : todayEvents.length === 0 ? (
          <div className="text-center py-10 text-[#666]">暫無行程</div>
        ) : (
          <div className="space-y-3">
            {todayEvents.map((ev) => (
              <Link
                key={ev.id}
                to={`/event/${ev.id}`}
                className="event-card"
              >
                <div className="event-card-header">
                  <span className="event-title">{ev.title || '無標題'}</span>
                  {ev.type && (
                    <span className={`event-type-badge ${ev.type}`}>{ev.type}</span>
                  )}
                </div>
                <div className="event-info-item">
                  <span>📅</span>
                  <span>
                    {ev.allDay ? '全天' : (ev.start || '').slice(11, 16)}
                    {ev.type && ` · ${ev.type}`}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
