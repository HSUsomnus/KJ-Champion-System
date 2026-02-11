/**
 * 行事曆主頁
 * 與舊前端 index.html + calendar.js 對應
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { useLiff } from '../context/LiffContext';
import { getEvents, getTodayEvents } from '../services/api';

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

    Promise.all([
      getEvents(startDate, endDate),
      getTodayEvents(formatYMD(selectedDate)),
    ])
      .then(([events, today]) => {
        setMonthEvents(events);
        setTodayEvents(today);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [year, month, selectedDate]);

  const handleRefresh = () => {
    setLoading(true);
    const lastDay = new Date(year, month, 0);
    const startDate = formatYMD(new Date(year, month - 1, 1));
    const endDate = formatYMD(lastDay);
    Promise.all([
      getEvents(startDate, endDate),
      getTodayEvents(formatYMD(selectedDate)),
    ])
      .then(([events, today]) => {
        setMonthEvents(events);
        setTodayEvents(today);
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
      return start === dateStr;
    });
  };

  const selectedStr = formatYMD(selectedDate);
  const isSelectedToday = selectedStr === formatYMD(new Date());

  const addEventUrl = userId ? `/add-event?date=${selectedStr}` : '/add-event';

  return (
    <div>
      <PageHeader title="📅 行事曆" onRefresh={handleRefresh} />

      {/* 月曆 */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <button
            type="button"
            onClick={prevMonth}
            className="p-2 text-xl text-text-light hover:text-primary"
          >
            ‹
          </button>
          <h2 className="text-lg font-semibold">
            {year}年{month}月
          </h2>
          <button
            type="button"
            onClick={nextMonth}
            className="p-2 text-xl text-text-light hover:text-primary"
          >
            ›
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-sm">
          {['日', '一', '二', '三', '四', '五', '六'].map((w) => (
            <div key={w} className="text-text-light font-medium py-1">
              {w}
            </div>
          ))}
          {days.map((d, i) => {
            if (!d) return <div key={`empty-${i}`} />;
            const count = getEventsForDay(d).length;
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isSel = dateStr === selectedStr;
            const isToday = dateStr === formatYMD(new Date());
            return (
              <button
                key={d}
                type="button"
                onClick={() => setSelectedDate(new Date(year, month - 1, d))}
                className={`p-1 rounded-lg ${
                  isSel ? 'bg-primary text-white' : isToday ? 'ring-2 ring-primary' : ''
                }`}
              >
                {d}
                {count > 0 && (
                  <span className="block text-[10px] opacity-80">{count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 今日行程標題 + 新增按鈕 */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">
          {isSelectedToday ? '今日行程' : `${selectedStr} 行程`}
        </h2>
        <Link
          to={addEventUrl}
          className="px-3 py-2 rounded-lg bg-primary text-white text-sm no-underline"
        >
          ➕ 新增行程
        </Link>
      </div>

      {/* 行程字卡 */}
      <div className="min-h-[120px]">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-text-light">載入中...</p>
          </div>
        ) : todayEvents.length === 0 ? (
          <div className="text-center py-8 text-text-light">暫無行程</div>
        ) : (
          <div className="space-y-2">
            {todayEvents.map((ev) => (
              <Link
                key={ev.id}
                to={`/event/${ev.id}`}
                className="block p-3 rounded-lg bg-card-bg border border-border shadow-sm no-underline text-text-main hover:shadow-md transition-shadow"
              >
                <div className="font-medium">{ev.title || '無標題'}</div>
                <div className="text-sm text-text-light mt-1">
                  {ev.allDay ? '全天' : (ev.start || '').slice(11, 16)}
                  {ev.type && ` · ${ev.type}`}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
