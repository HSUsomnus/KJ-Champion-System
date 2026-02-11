/**
 * 新增行程頁面
 * 與舊前端 add-event.html + add-event.js 對應
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { useLiff } from '../context/LiffContext';
import { createEvent } from '../services/api';

// 將 Date 轉成 YYYY-MM-DD
function formatDate(d) {
  const pad = (n) => (n < 10 ? '0' + n : '' + n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// 將 Date 轉成 HH:MM
function formatTime(d) {
  const pad = (n) => (n < 10 ? '0' + n : '' + n);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// 依行程類型顯示不同的標題提示詞
const TITLE_HINTS = {
  '學員上課': '名字+金流課/藍圖課，ex:小陞金流課',
  '活動': '時間(選)+名稱+(財商/加盟)(選)，ex:13台北組聚(財商)、醫美茶會',
  '諮詢簽約': '時間+名字+保單諮詢/財物諮詢/保單簽約/天耀簽約，ex:13小陞財務諮詢'
};

export default function AddEventPage() {
  const { userId } = useLiff();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // 從網址參數取得預設日期（例如從行事曆點某天後跳轉）
  const urlDate = searchParams.get('date') || formatDate(new Date());

  const [form, setForm] = useState({
    title: '',
    type: '活動',
    allDay: false,
    startDate: urlDate,
    endDate: '',
    startTime: '09:00',
    endTime: '10:00',
    description: '',
  });
  const [loading, setLoading] = useState(false);

  // 更新表單欄位
  const handleChange = (field, value) => {
    setForm((prev) => {
      const newForm = { ...prev, [field]: value };
      
      // 特殊處理：選擇「學員上課」時，自動勾選整日且鎖住
      if (field === 'type') {
        if (value === '學員上課') {
          newForm.allDay = true;
          newForm.startTime = '00:00';
          newForm.endTime = '23:59';
        } else if (prev.type === '學員上課') {
          // 從「學員上課」切換到其他類型時，解除整日鎖定
          newForm.allDay = false;
          newForm.startTime = '09:00';
          newForm.endTime = '10:00';
        }
      }
      
      return newForm;
    });
  };

  // 設定日期快捷鈕（今天/明天）
  const setQuickDate = (field, daysOffset) => {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    handleChange(field, formatDate(d));
  };

  // 時間快捷鈕
  const setQuickTime = (field, time) => {
    handleChange(field, time);
  };

  // 送出表單
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.title.trim()) {
      alert('請輸入行程標題');
      return;
    }

    if (!form.startDate) {
      alert('請選擇開始日期');
      return;
    }

    setLoading(true);

    try {
      // 組合 ISO 格式的開始/結束時間
      const endDate = form.endDate || form.startDate;
      const start = form.allDay
        ? `${form.startDate}T00:00:00+08:00`
        : `${form.startDate}T${form.startTime}:00+08:00`;
      const end = form.allDay
        ? `${endDate}T23:59:59+08:00`
        : `${endDate}T${form.endTime}:00+08:00`;

      const body = {
        title: form.title.trim(),
        type: form.type,
        allDay: form.allDay,
        start,
        end,
        description: form.description.trim(),
      };

      await createEvent(userId, body);
      alert('行程新增成功 🎉');
      navigate('/');
    } catch (err) {
      console.error(err);
      alert(err.message || '新增行程失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader title="➕ 新增行程" />

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">標題 *</label>
            <input
              type="text"
              className="form-input"
              placeholder={TITLE_HINTS[form.type]}
              value={form.title}
              onChange={(e) => handleChange('title', e.target.value)}
              required
            />
            <p className="form-hint">{TITLE_HINTS[form.type]}</p>
          </div>

          <div className="form-group">
            <label className="form-label">類型 *</label>
            <select
              className="form-select"
              value={form.type}
              onChange={(e) => handleChange('type', e.target.value)}
              required
            >
              <option value="學員上課">學員上課</option>
              <option value="活動">活動</option>
              <option value="諮詢簽約">諮詢簽約</option>
            </select>
          </div>

          <div className="form-group">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={form.allDay}
                onChange={(e) => handleChange('allDay', e.target.checked)}
                disabled={form.type === '學員上課'}
              />
              <span className="form-label !mb-0">整日活動</span>
              {form.type === '學員上課' && (
                <span className="form-hint !mt-0">（學員上課固定為整日）</span>
              )}
            </label>
          </div>

          <div className="form-group">
            <label className="form-label">開始日期 *</label>
            <input
              type="date"
              className="form-input"
              value={form.startDate}
              onChange={(e) => handleChange('startDate', e.target.value)}
              required
            />
            <div className="flex gap-2 mt-2">
              <button type="button" className="btn btn-secondary !py-1.5 !px-3 text-sm" onClick={() => setQuickDate('startDate', 0)}>今天</button>
              <button type="button" className="btn btn-secondary !py-1.5 !px-3 text-sm" onClick={() => setQuickDate('startDate', 1)}>明天</button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">結束日期</label>
            <input
              type="date"
              className="form-input"
              placeholder="同一天可不填"
              value={form.endDate}
              onChange={(e) => handleChange('endDate', e.target.value)}
            />
            <div className="flex gap-2 mt-2">
              <button type="button" className="btn btn-secondary !py-1.5 !px-3 text-sm" onClick={() => setQuickDate('endDate', 0)}>今天</button>
              <button type="button" className="btn btn-secondary !py-1.5 !px-3 text-sm" onClick={() => setQuickDate('endDate', 1)}>明天</button>
            </div>
          </div>

          {!form.allDay && (
            <div className="grid grid-cols-2 gap-4 form-group">
              <div>
                <label className="form-label">開始時間 *</label>
                <input
                  type="time"
                  className="form-input"
                  value={form.startTime}
                  onChange={(e) => handleChange('startTime', e.target.value)}
                  required
                />
                <div className="flex flex-wrap gap-1 mt-2">
                  {['09:00', '10:00', '14:00', '19:00', '20:00'].map((t) => (
                    <button key={t} type="button" className="btn btn-secondary !py-1 !px-2 text-xs" onClick={() => setQuickTime('startTime', t)}>{t}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="form-label">結束時間 *</label>
                <input
                  type="time"
                  className="form-input"
                  value={form.endTime}
                  onChange={(e) => handleChange('endTime', e.target.value)}
                  required
                />
                <div className="flex flex-wrap gap-1 mt-2">
                  {['10:00', '11:00', '15:00', '20:00', '21:00'].map((t) => (
                    <button key={t} type="button" className="btn btn-secondary !py-1 !px-2 text-xs" onClick={() => setQuickTime('endTime', t)}>{t}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">備註</label>
            <textarea
              className="form-textarea"
              rows="3"
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
            />
          </div>

          <div className="flex gap-3 mt-6 event-actions">
            <button type="button" className="btn btn-secondary flex-1" onClick={() => navigate('/')} disabled={loading}>取消</button>
            <button type="submit" className="btn btn-primary flex-1" disabled={loading}>{loading ? '儲存中...' : '儲存'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
