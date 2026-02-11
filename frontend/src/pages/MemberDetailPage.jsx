/**
 * 成員詳情頁（只讀）
 * 與舊前端 member-detail.html 對應
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';

export default function MemberDetailPage() {
  const { lineId } = useParams();
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMember = async () => {
      try {
        const res = await fetch(`/api/members/${lineId}`);
        const data = await res.json();
        if (data.success) {
          setMember(data.data);
        } else {
          throw new Error(data.message);
        }
      } catch (err) {
        console.error(err);
        alert(err.message || '載入失敗');
      } finally {
        setLoading(false);
      }
    };
    
    if (lineId) fetchMember();
  }, [lineId]);

  if (loading) {
    return (
      <div>
        <PageHeader title="👤 成員詳情" />
        <div className="flex justify-center py-12">
          <p className="text-text-light">載入中...</p>
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div>
        <PageHeader title="👤 成員詳情" />
        <div className="text-center py-12">
          <p className="text-text-light mb-4">找不到此成員資料</p>
          <Link to="/members" className="text-primary">返回成員列表</Link>
        </div>
      </div>
    );
  }

  // 解析課程志工
  let volunteerList = [];
  try {
    volunteerList = JSON.parse(member.volunteerRecords || '[]');
    if (!Array.isArray(volunteerList)) volunteerList = [];
  } catch {
    volunteerList = [];
  }

  // 生日顯示（只顯示月/日）
  const displayBirthday = (bd) => {
    if (!bd) return '-';
    if (bd.includes('-')) {
      const parts = bd.split('-');
      if (parts.length === 3) return `${parts[1]}/${parts[2]}`;
    }
    return bd;
  };

  return (
    <div>
      <PageHeader title="👤 成員詳情" />

      {/* 頭像與姓名 */}
      {member.pictureUrl && (
        <div className="flex flex-col items-center mb-6">
          <img
            src={member.pictureUrl}
            alt="頭像"
            className="w-20 h-20 rounded-full object-cover"
          />
          <span className="text-sm text-text-light mt-2">
            {member.displayName || member.name || 'LINE 名字'}
          </span>
        </div>
      )}

      {/* 基本資料 */}
      <div className="space-y-3">
        <div className="p-4 rounded-lg bg-card-bg border border-border">
          <div className="text-sm text-text-light">姓名</div>
          <div className="font-medium">{member.name || '-'}</div>
        </div>
        <div className="p-4 rounded-lg bg-card-bg border border-border">
          <div className="text-sm text-text-light">Email</div>
          <div className="font-medium">{member.email || '-'}</div>
        </div>
        <div className="p-4 rounded-lg bg-card-bg border border-border">
          <div className="text-sm text-text-light">電話</div>
          <div className="font-medium">{member.phone || '-'}</div>
        </div>
        <div className="p-4 rounded-lg bg-card-bg border border-border">
          <div className="text-sm text-text-light">生日</div>
          <div className="font-medium">{displayBirthday(member.birthday)}</div>
        </div>
        <div className="p-4 rounded-lg bg-card-bg border border-border">
          <div className="text-sm text-text-light">星等</div>
          <div className="font-medium">{member.starLevel || '白星'}</div>
        </div>

        {/* 進階資訊 */}
        <div className="mt-4 pt-4 border-t border-border">
          <h3 className="font-semibold mb-3">📋 進階資訊</h3>
          <div className="space-y-3">
            <div className="p-4 rounded-lg bg-card-bg border border-border">
              <div className="text-sm text-text-light">課程紀錄</div>
              <div className="font-medium">{member.courseRecord || '-'}</div>
            </div>
            <div className="p-4 rounded-lg bg-card-bg border border-border">
              <div className="text-sm text-text-light">是否為特斯拉出行加盟主</div>
              <div className="font-medium">{member.teslaFranchisee || '-'}</div>
            </div>
            <div className="p-4 rounded-lg bg-card-bg border border-border">
              <div className="text-sm text-text-light">團隊負責事項</div>
              <div className="font-medium">{member.teamResponsibilities || '-'}</div>
            </div>
            <div className="p-4 rounded-lg bg-card-bg border border-border">
              <div className="text-sm text-text-light">課程志工</div>
              <div className="font-medium">
                {volunteerList.length === 0
                  ? '無'
                  : volunteerList.map(r => `${r.date} ${r.option}`).join('、')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 返回按鈕 */}
      <Link
        to="/members"
        className="block w-full py-3 mt-6 rounded-lg bg-card-bg border border-border text-center no-underline text-text-main"
      >
        返回成員列表
      </Link>
    </div>
  );
}
