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
        <div className="flex justify-center items-center py-12">
          <p className="text-text-light">載入中...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div>
        <PageHeader title="📅 行程詳情" />
        <p className="text-center text-text-light py-8">找不到該行程</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="📅 行程詳情" />

      {!isEditing ? (
        // 查看模式
        <div className="card">
          <div className="mb-4">
            <div className="flex items-start justify-between mb-2">
              <h2 className="text-xl font-semibold">{event.title}</h2>
              <span className="px-2 py-1 text-xs bg-primary/10 text-primary rounded">
                {event.type || '活動'}
              </span>
            </div>
            {event.isBirthdayEvent && (
              <p className="text-xs text-text-light mb-2">🎂 系統生成的生日行程</p>
            )}
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex items-start gap-2">
              <span className="text-lg">📅</span>
              <span className="text-text-main">{formatEventDateTime(event)}</span>
            </div>

            {event.description && (
              <div className="flex items-start gap-2">
                <span className="text-lg">📝</span>
                <div className="text-text-main whitespace-pre-wrap">
                  {event.description}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <button
              type="button"
              className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
              onClick={handleShare}
            >
              🔗 分享
            </button>

            {!event.isBirthdayEvent && (
              <>
                <button
                  type="button"
                  className="w-full px-4 py-2 border border-border text-text-main rounded-lg hover:bg-gray-50"
                  onClick={startEdit}
                >
                  ✏️ 編輯
                </button>
                <button
                  type="button"
                  className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                  onClick={handleDelete}
                >
                  🗑️ 刪除
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        // 編輯模式
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">編輯行程</h2>
          <form onSubmit={saveEdit}>
            {/* 標題 */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">標題 *</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder={TITLE_HINTS[form.type]}
                value={form.title}
                onChange={(e) => handleChange('title', e.target.value)}
                required
              />
              <p className="text-xs text-gray-500 mt-1">{TITLE_HINTS[form.type]}</p>
            </div>

            {/* 類型 */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">類型 *</label>
              <select
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.type}
                onChange={(e) => handleChange('type', e.target.value)}
                required
              >
                <option value="學員上課">學員上課</option>
                <option value="活動">活動</option>
                <option value="諮詢簽約">諮詢簽約</option>
              </select>
            </div>

            {/* 整日活動切換 */}
            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="mr-2"
                  checked={form.allDay}
                  onChange={(e) => handleChange('allDay', e.target.checked)}
                  disabled={form.type === '學員上課'}
                />
                <span className="text-sm">整日活動</span>
                {form.type === '學員上課' && (
                  <span className="ml-2 text-xs text-gray-500">（學員上課固定為整日）</span>
                )}
              </label>
            </div>

            {/* 開始日期 */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">開始日期 *</label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
                required
              />
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
                  onClick={() => setQuickDate('startDate', 0)}
                >
                  今天
                </button>
                <button
                  type="button"
                  className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
                  onClick={() => setQuickDate('startDate', 1)}
                >
                  明天
                </button>
              </div>
            </div>

            {/* 結束日期 */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                結束日期
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="同一天可不填"
                value={form.endDate}
                onChange={(e) => handleChange('endDate', e.target.value)}
              />
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
                  onClick={() => setQuickDate('endDate', 0)}
                >
                  今天
                </button>
                <button
                  type="button"
                  className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
                  onClick={() => setQuickDate('endDate', 1)}
                >
                  明天
                </button>
              </div>
            </div>

            {/* 時間（非整日時顯示） */}
            {!form.allDay && (
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    開始時間 *
                  </label>
                  <input
                    type="time"
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    value={form.startTime}
                    onChange={(e) => handleChange('startTime', e.target.value)}
                    required
                  />
                  <div className="flex flex-wrap gap-1 mt-2">
                    {['09:00', '10:00', '14:00', '19:00', '20:00'].map((t) => (
                      <button
                        key={t}
                        type="button"
                        className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
                        onClick={() => setQuickTime('startTime', t)}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    結束時間 *
                  </label>
                  <input
                    type="time"
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    value={form.endTime}
                    onChange={(e) => handleChange('endTime', e.target.value)}
                    required
                  />
                  <div className="flex flex-wrap gap-1 mt-2">
                    {['10:00', '11:00', '15:00', '20:00', '21:00'].map((t) => (
                      <button
                        key={t}
                        type="button"
                        className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
                        onClick={() => setQuickTime('endTime', t)}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 備註 */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">備註</label>
              <textarea
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                rows="3"
                value={form.description}
                onChange={(e) => handleChange('description', e.target.value)}
              />
            </div>

            {/* 操作按鈕 */}
            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 px-4 py-2 border border-border rounded-lg text-text-main hover:bg-gray-50"
                onClick={cancelEdit}
                disabled={saving}
              >
                取消
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                disabled={saving}
              >
                {saving ? '儲存中...' : '儲存'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
