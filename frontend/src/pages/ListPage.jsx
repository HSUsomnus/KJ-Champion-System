/**
 * 行程列表頁（簡化版）
 * 與舊前端 list.html + list.js 對應
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { getEvents } from '../services/api';

function formatYMD(d) {
  const pad = (n) => (n < 10 ? '0' + n : '' + n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function ListPage() {
  const [date, setDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
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

  return (
    <div>
      <PageHeader title="📋 列表" />
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={prevMonth}
          className="p-2 text-text-light hover:text-primary"
        >
          ‹
        </button>
        <span className="font-semibold">
          {year}年{month}月
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="p-2 text-text-light hover:text-primary"
        >
          ›
        </button>
      </div>
      {loading ? (
        <p className="text-text-light">載入中...</p>
      ) : (
        <div className="space-y-2">
          {events.length === 0 ? (
            <p className="text-text-light text-center py-8">本月暫無行程</p>
          ) : (
            events.map((ev) => (
              <Link
                key={ev.id}
                to={`/event/${ev.id}`}
                className="block p-3 rounded-lg bg-card-bg border border-border no-underline text-text-main"
              >
                <div className="font-medium">{ev.title || '無標題'}</div>
                <div className="text-sm text-text-light">
                  {(ev.start || '').split('T')[0]} {ev.allDay ? '全天' : (ev.start || '').slice(11, 16)}{' '}
                  · {ev.type || '活動'}
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
