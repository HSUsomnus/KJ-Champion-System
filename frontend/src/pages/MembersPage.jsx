/**
 * 成員列表頁（簡化版）
 * 與舊前端 members.html + members.js 對應
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
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

  return (
    <div>
      <PageHeader title="👥 成員" />
      {loading ? (
        <p className="text-text-light">載入中...</p>
      ) : members.length === 0 ? (
        <p className="text-text-light text-center py-8">暫無成員資料</p>
      ) : (
        <div className="space-y-2">
          {members.map((m) => (
            <Link
              key={m.lineId}
              to={`/member/${m.lineId}`}
              className="flex items-center gap-4 p-3 rounded-lg bg-card-bg border border-border no-underline text-text-main"
            >
              {m.pictureUrl && (
                <img
                  src={m.pictureUrl}
                  alt=""
                  className="w-12 h-12 rounded-full object-cover"
                />
              )}
              <div>
                <div className="font-medium">{m.name || m.displayName || '未填姓名'}</div>
                <div className="text-sm text-text-light">{m.starLevel || '白星'}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
