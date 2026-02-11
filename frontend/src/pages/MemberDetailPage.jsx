/**
 * 成員詳情頁（只讀）
 * 與舊前端 member-detail.html 對應
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import StarBadge from '../components/StarBadge';

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
        <div className="flex justify-center py-12 text-[#666]">載入中...</div>
      </div>
    );
  }

  if (!member) {
    return (
      <div>
        <PageHeader title="👤 成員詳情" />
        <div className="card text-center py-10">
          <p className="text-[#666] mb-4">找不到此成員資料</p>
          <Link to="/members" className="btn btn-primary">返回成員列表</Link>
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

      {member.pictureUrl && (
        <div className="card text-center">
          <img src={member.pictureUrl} alt="頭像" className="member-avatar" style={{ width: '100px', height: '100px', margin: '0 auto 16px' }} />
          <p className="profile-line-name" style={{ margin: '0 0 4px', fontSize: '1rem', color: 'var(--text-light)' }}>
            {member.displayName || member.name || 'LINE 名字'}
          </p>
          <div className="profile-star-display" style={{ marginTop: '8px' }}>
            <StarBadge level={member.starLevel || '白星'} />
          </div>
        </div>
      )}

      <div className="card">
        <label className="form-label" style={{ fontWeight: 600 }}>📌 基本資料</label>
        <div className="form-group">
          <label className="form-label">真實姓名</label>
          <div className="form-input" style={{ backgroundColor: 'var(--bg-color)', border: 'none', padding: '12px' }}>
            {member.name || '-'}
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Email</label>
          <div className="form-input" style={{ backgroundColor: 'var(--bg-color)', border: 'none', padding: '12px' }}>
            {member.email || '-'}
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">電話號碼</label>
          <div className="form-input" style={{ backgroundColor: 'var(--bg-color)', border: 'none', padding: '12px' }}>
            {member.phone || '-'}
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">星等</label>
          <div className="form-input" style={{ backgroundColor: 'var(--bg-color)', border: 'none', padding: '12px' }}>
            {member.starLevel || '-'}
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">生日</label>
          <div className="form-input" style={{ backgroundColor: 'var(--bg-color)', border: 'none', padding: '12px' }}>
            {displayBirthday(member.birthday)}
          </div>
        </div>

        {/* 進階資訊顯示 */}
        <div className="form-group" style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color, #eee)' }}>
          <label className="form-label" style={{ fontWeight: 600 }}>📋 進階資訊</label>
          <div className="form-group">
            <label className="form-label">課程紀錄</label>
            <div className="form-input text-wrap-nice" style={{ backgroundColor: 'var(--bg-color)', border: 'none', padding: '12px', minHeight: 'auto' }}>
              {member.courseRecord || '-'}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">是否為特斯拉出行加盟主</label>
            <div className="form-input text-wrap-nice" style={{ backgroundColor: 'var(--bg-color)', border: 'none', padding: '12px' }}>
              {member.teslaFranchisee || '-'}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">團隊負責事項</label>
            <div className="form-input text-wrap-nice" style={{ backgroundColor: 'var(--bg-color)', border: 'none', padding: '12px', minHeight: 'auto' }}>
              {member.teamResponsibilities || '-'}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">課程志工</label>
            <div className="form-input text-wrap-nice" style={{ backgroundColor: 'var(--bg-color)', border: 'none', padding: '12px', minHeight: 'auto' }}>
              {volunteerList.length === 0 ? '無' : volunteerList.map(r => `${r.date} ${r.option}`).join('、')}
            </div>
          </div>
        </div>

        <Link to="/members" className="btn btn-secondary btn-block no-underline">
          返回成員列表
        </Link>
      </div>
    </div>
  );
}
