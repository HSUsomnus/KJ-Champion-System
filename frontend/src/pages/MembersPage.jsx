/**
 * 成員列表頁（簡化版）
 * 與舊前端 members.html + members.js 對應
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import StarBadge from '../components/StarBadge';
import { getMembers } from '../services/api';

export default function MembersPage() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMembers()
      .then(setMembers)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleInvite = async () => {
    try {
      // 取得邀請訊息
      const res = await fetch('/api/line/invite-message?minimal=1');
      const data = await res.json();
      if (!data.success) throw new Error('取得邀請訊息失敗');

      // 使用 LIFF 分享
      if (window.liff && window.liff.isInClient()) {
        await window.liff.shareTargetPicker([
          {
            type: 'flex',
            altText: data.data.message,
            contents: data.data.flexMessage,
          },
        ]);
      } else {
        alert('請在 LINE 應用程式中使用此功能');
      }
    } catch (err) {
      console.error(err);
      alert(err.message || '邀請失敗');
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    getMembers()
      .then(setMembers)
      .finally(() => setLoading(false));
  };

  return (
    <div>
      <PageHeader title="👥 成員列表" onRefresh={handleRefresh} />

      <div className="mb-4">
        <button type="button" onClick={handleInvite} className="btn btn-primary btn-block">
          ➕ 邀請新夥伴
        </button>
      </div>
      {loading ? (
        <p className="text-[#666]">載入中...</p>
      ) : members.length === 0 ? (
        <p className="text-[#666] text-center py-10">暫無成員資料</p>
      ) : (
        <div className="space-y-3">
          {members.map((m) => (
            <Link key={m.lineId} to={`/member/${m.lineId}`} className="member-card flex items-center gap-4">
              {m.pictureUrl ? (
                <img src={m.pictureUrl} alt="" className="w-12 h-12 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-[#E0E0E0] flex items-center justify-center text-[#666] shrink-0">👤</div>
              )}
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-[#333] mb-1">{m.name || m.displayName || '未填姓名'}</div>
                <StarBadge level={m.starLevel || '白星'} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
