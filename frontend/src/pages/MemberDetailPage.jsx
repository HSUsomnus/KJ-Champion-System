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

      <div className="card">
        {member.pictureUrl && (
          <div className="flex flex-col items-center mb-6">
            <img src={member.pictureUrl} alt="頭像" className="w-20 h-20 rounded-full object-cover" />
            <span className="text-sm text-[#666] mt-2">{member.displayName || member.name || 'LINE 名字'}</span>
          </div>
        )}

        <div className="space-y-3">
          {[
            { label: '姓名', value: member.name },
            { label: 'Email', value: member.email },
            { label: '電話', value: member.phone },
            { label: '生日', value: displayBirthday(member.birthday) },
            { label: '星等', value: member.starLevel || '白星' },
          ].map(({ label, value }) => (
            <div key={label} className="py-2 border-b border-[#E0E0E0] last:border-0">
              <div className="text-sm text-[#666]">{label}</div>
              <div className="font-medium text-[#333]">{value || '-'}</div>
            </div>
          ))}

          <div className="mt-4 pt-4 border-t border-[#E0E0E0]">
            <h3 className="font-semibold text-[#333] mb-3">📋 進階資訊</h3>
            <div className="space-y-3">
              {[
                { label: '課程紀錄', value: member.courseRecord },
                { label: '是否為特斯拉出行加盟主', value: member.teslaFranchisee },
                { label: '團隊負責事項', value: member.teamResponsibilities },
                { label: '課程志工', value: volunteerList.length === 0 ? '無' : volunteerList.map(r => `${r.date} ${r.option}`).join('、') },
              ].map(({ label, value }) => (
                <div key={label} className="py-2 border-b border-[#E0E0E0] last:border-0">
                  <div className="text-sm text-[#666]">{label}</div>
                  <div className="font-medium text-[#333]">{value || '-'}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Link to="/members" className="btn btn-secondary btn-block mt-6 no-underline">
          返回成員列表
        </Link>
      </div>
    </div>
  );
}
