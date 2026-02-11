/**
 * 行程詳情頁面
 * 與舊前端 event-detail.html + event-detail.js 對應
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { useLiff } from '../context/LiffContext';
import { getEventById, updateEvent, deleteEvent } from '../services/api';

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

// 格式化顯示日期時間
function formatEventDateTime(event) {
  if (!event.start) return '無日期';
  const startDate = new Date(event.start);
  const endDate = new Date(event.end);

  if (event.allDay) {
    const sd = formatDate(startDate);
    const ed = formatDate(endDate);
    if (sd === ed) {
      return `${sd}（全天）`;
    }
    return `${sd} ~ ${ed}（全天）`;
  }

  const sd = formatDate(startDate);
  const ed = formatDate(endDate);
  const st = formatTime(startDate);
  const et = formatTime(endDate);

  if (sd === ed) {
    return `${sd} ${st} ~ ${et}`;
  }
  return `${sd} ${st} ~ ${ed} ${et}`;
}

// 依行程類型顯示不同的標題提示詞
const TITLE_HINTS = {
  '學員上課': '名字+金流課/藍圖課，ex:小陞金流課',
  '活動': '時間(選)+名稱+(財商/加盟)(選)，ex:13台北組聚(財商)、醫美茶會',
  '諮詢簽約': '時間+名字+保單諮詢/財物諮詢/保單簽約/天耀簽約，ex:13小陞財務諮詢'
};

export default function EventDetailPage() {
  const { userId } = useLiff();
  const { id } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    title: '',
    type: '活動',
    allDay: false,
    startDate: '',
    endDate: '',
    startTime: '09:00',
    endTime: '10:00',
    description: '',
  });
  const [saving, setSaving] = useState(false);

  // 載入行程詳情
  useEffect(() => {
    getEventById(id)
      .then((data) => {
        setEvent(data);
        // 初始化編輯表單
        const startDate = new Date(data.start);
        const endDate = new Date(data.end);
        setForm({
          title: data.title || '',
          type: data.type || '活動',
          allDay: !!data.allDay,
          startDate: formatDate(startDate),
          endDate: formatDate(endDate),
          startTime: formatTime(startDate),
          endTime: formatTime(endDate),
          description: data.description || '',
        });
      })
      .catch((err) => {
        console.error(err);
        alert(err.message || '載入行程失敗');
        navigate('/');
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

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

  // 設定日期快捷鈕
  const setQuickDate = (field, daysOffset) => {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    handleChange(field, formatDate(d));
  };

  // 時間快捷鈕
  const setQuickTime = (field, time) => {
    handleChange(field, time);
  };

  // 進入編輯模式
  const startEdit = () => {
    if (event.isBirthdayEvent) {
      alert('系統生成的生日行程不可編輯');
      return;
    }
    setIsEditing(true);
  };

  // 取消編輯
  const cancelEdit = () => {
    setIsEditing(false);
    // 恢復原始值
    const startDate = new Date(event.start);
    const endDate = new Date(event.end);
    setForm({
      title: event.title || '',
      type: event.type || '活動',
      allDay: !!event.allDay,
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      startTime: formatTime(startDate),
      endTime: formatTime(endDate),
      description: event.description || '',
    });
  };

  // 儲存編輯
  const saveEdit = async (e) => {
    e.preventDefault();

    if (!form.title.trim()) {
      alert('請輸入行程標題');
      return;
    }

    setSaving(true);

    try {
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

      const updated = await updateEvent(userId, id, body);
      setEvent(updated);
      setIsEditing(false);
      alert('行程更新成功 🎉');
    } catch (err) {
      console.error(err);
      alert(err.message || '更新行程失敗');
    } finally {
      setSaving(false);
    }
  };

  // 刪除行程
  const handleDelete = async () => {
    if (event.isBirthdayEvent) {
      alert('系統生成的生日行程不可刪除');
      return;
    }

    if (!confirm(`確定要刪除「${event.title}」嗎？`)) {
      return;
    }

    try {
      await deleteEvent(userId, id);
      alert('行程刪除成功 🗑️');
      navigate('/');
    } catch (err) {
      console.error(err);
      alert(err.message || '刪除行程失敗');
    }
  };

  // 分享行程
  const handleShare = async () => {
    if (!window.liff) {
      alert('LIFF 尚未初始化');
      return;
    }

    try {
      const dateTime = formatEventDateTime(event);
      const text = `📅 ${event.title}\n${dateTime}${
        event.description ? `\n📝 ${event.description}` : ''
      }`;

      await window.liff.shareTargetPicker([
        {
          type: 'text',
          text,
        },
      ]);
    } catch (err) {
      console.error('分享失敗:', err);
      if (err.code !== 'CANCEL') {
        alert(err.message || '分享失敗');
      }
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader title="📅 行程詳情" />
        <div className="flex justify-center items-center py-12 text-[#666]">載入中...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div>
        <PageHeader title="📅 行程詳情" />
        <p className="text-center text-[#666] py-10">找不到該行程</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="📅 行程詳情" />

      {!isEditing ? (
        /* 查看模式：與舊版 .event-card / .event-actions 一致 */
        <div className="card">
          <div className="event-card-header">
            <h2 className="event-title !text-lg">{event.title}</h2>
            {event.type && <span className={`event-type-badge ${event.type}`}>{event.type}</span>}
          </div>
          {event.isBirthdayEvent && (
            <p className="text-xs text-[#666] mb-3">🎂 系統生成的生日行程</p>
          )}

          <div className="space-y-2 mb-6">
            <div className="event-info-item">
              <span>📅</span>
              <span>{formatEventDateTime(event)}</span>
            </div>
            {event.description && (
              <div className="event-info-item items-start">
                <span>📝</span>
                <div className="text-[#333] whitespace-pre-wrap">{event.description}</div>
              </div>
            )}
          </div>

          <div className="event-actions flex-col gap-2">
            <button type="button" className="btn btn-primary btn-block" onClick={handleShare}>🔗 分享</button>
            {!event.isBirthdayEvent && (
              <>
                <button type="button" className="btn btn-secondary btn-block" onClick={startEdit}>✏️ 編輯</button>
                <button type="button" className="btn btn-danger btn-block" onClick={handleDelete}>🗑️ 刪除</button>
              </>
            )}
          </div>
        </div>
      ) : (
        /* 編輯模式：與新增行程表單一致 */
        <div className="card">
          <h2 className="text-lg font-semibold mb-4 text-[#333]">編輯行程</h2>
          <form onSubmit={saveEdit}>
            <div className="form-group">
              <label className="form-label">標題 *</label>
              <input type="text" className="form-input" placeholder={TITLE_HINTS[form.type]} value={form.title} onChange={(e) => handleChange('title', e.target.value)} required />
              <p className="form-hint">{TITLE_HINTS[form.type]}</p>
            </div>
            <div className="form-group">
              <label className="form-label">類型 *</label>
              <select className="form-select" value={form.type} onChange={(e) => handleChange('type', e.target.value)} required>
                <option value="學員上課">學員上課</option>
                <option value="活動">活動</option>
                <option value="諮詢簽約">諮詢簽約</option>
              </select>
            </div>
            <div className="form-group">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4" checked={form.allDay} onChange={(e) => handleChange('allDay', e.target.checked)} disabled={form.type === '學員上課'} />
                <span className="form-label !mb-0">整日活動</span>
                {form.type === '學員上課' && <span className="form-hint !mt-0">（學員上課固定為整日）</span>}
              </label>
            </div>
            <div className="form-group">
              <label className="form-label">開始日期 *</label>
              <input type="date" className="form-input" value={form.startDate} onChange={(e) => handleChange('startDate', e.target.value)} required />
              <div className="flex gap-2 mt-2">
                <button type="button" className="btn-date-shortcut" onClick={() => setQuickDate('startDate', 0)}>今天</button>
                <button type="button" className="btn-date-shortcut" onClick={() => setQuickDate('startDate', 1)}>明天</button>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">結束日期</label>
              <input type="date" className="form-input" placeholder="同一天可不填" value={form.endDate} onChange={(e) => handleChange('endDate', e.target.value)} />
              <div className="flex gap-2 mt-2">
                <button type="button" className="btn-date-shortcut" onClick={() => setQuickDate('endDate', 0)}>今天</button>
                <button type="button" className="btn-date-shortcut" onClick={() => setQuickDate('endDate', 1)}>明天</button>
              </div>
            </div>
            {!form.allDay && (
              <div className="grid grid-cols-2 gap-4 form-group">
                <div>
                  <label className="form-label">開始時間 *</label>
                  <input type="time" className="form-input" value={form.startTime} onChange={(e) => handleChange('startTime', e.target.value)} required />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {['09:00', '10:00', '14:00', '19:00', '20:00'].map((t) => (
                      <button key={t} type="button" className="time-chip" onClick={() => setQuickTime('startTime', t)}>{t}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="form-label">結束時間 *</label>
                  <input type="time" className="form-input" value={form.endTime} onChange={(e) => handleChange('endTime', e.target.value)} required />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {['10:00', '11:00', '15:00', '20:00', '21:00'].map((t) => (
                      <button key={t} type="button" className="time-chip" onClick={() => setQuickTime('endTime', t)}>{t}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">備註</label>
              <textarea className="form-textarea" rows="3" value={form.description} onChange={(e) => handleChange('description', e.target.value)} />
            </div>
            <div className="event-actions">
              <button type="button" className="btn btn-secondary flex-1" onClick={cancelEdit} disabled={saving}>取消</button>
              <button type="submit" className="btn btn-primary flex-1" disabled={saving}>{saving ? '儲存中...' : '儲存'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
