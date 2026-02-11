/**
 * 個人資料／註冊頁
 * 與舊前端 profile.html + profile.js 對應
 */

import { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import StarBadge from '../components/StarBadge';
import { useLiff } from '../context/LiffContext';
import { checkMember, getProfile, updateProfile, registerProfile } from '../services/api';
import { useAlert } from '../components/AppAlert';

const STAR_OPTIONS = ['白星', '綠星', '橙星', '紅星', '紫星'];
const COURSE_OPTIONS = ['正式金流課', '財富藍圖課', '財富實踐旅程', '夢想清單專班', '群星計畫'];

export default function ProfilePage() {
  const { userId, profile: liffProfile } = useLiff();
  const { showAlert } = useAlert();
  const [mode, setMode] = useState('loading'); // loading | register | view | edit
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    birthday: '',
    starLevel: '白星',
    courseRecord: '',
    displayName: '',
    teslaFranchisee: '',
    teamResponsibilities: '',
    volunteerRecords: '',
  });
  const [volunteerRecords, setVolunteerRecords] = useState([]);
  const [showVolunteerForm, setShowVolunteerForm] = useState(false);
  const [newVolunteer, setNewVolunteer] = useState({
    date: new Date().toISOString().slice(0, 10),
    option: '金流',
  });

  useEffect(() => {
    if (!userId) {
      setMode('view');
      return;
    }

    checkMember(userId)
      .then((data) => {
        if (data?.isRegistered) {
          return getProfile(userId).then((p) => {
            setProfile(p);
            // 解析課程志工記錄
            let volunteerList = [];
            try {
              volunteerList = JSON.parse(p.volunteerRecords || '[]');
              if (!Array.isArray(volunteerList)) volunteerList = [];
            } catch {
              volunteerList = [];
            }
            setVolunteerRecords(volunteerList);
            setForm({
              name: p.name || '',
              email: p.email || '',
              phone: p.phone || '',
              birthday: p.birthday || '',
              starLevel: p.starLevel || '白星',
              courseRecord: p.courseRecord || '',
              displayName: p.displayName || '',
              teslaFranchisee: p.teslaFranchisee || '',
              teamResponsibilities: p.teamResponsibilities || '',
              volunteerRecords: p.volunteerRecords || '',
            });
            setMode('view');
          });
        } else {
          setForm((prev) => ({
            ...prev,
            displayName: liffProfile?.displayName || '',
          }));
          setMode('register');
        }
      })
      .catch((err) => {
        console.error(err);
        setMode('view');
      });
  }, [userId, liffProfile?.displayName]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = { ...form, volunteerRecords: JSON.stringify(volunteerRecords) };
      
      if (mode === 'register') {
        if (liffProfile?.pictureUrl) submitData.pictureUrl = liffProfile.pictureUrl;
        await registerProfile(userId, submitData);
        await showAlert('註冊成功！');
        setMode('view');
        const p = await getProfile(userId);
        setProfile(p);
        let volunteerList = [];
        try {
          volunteerList = JSON.parse(p.volunteerRecords || '[]');
          if (!Array.isArray(volunteerList)) volunteerList = [];
        } catch {
          volunteerList = [];
        }
        setVolunteerRecords(volunteerList);
        setForm({
          name: p.name || '',
          email: p.email || '',
          phone: p.phone || '',
          birthday: p.birthday || '',
          starLevel: p.starLevel || '白星',
          courseRecord: p.courseRecord || '',
          displayName: p.displayName || '',
          teslaFranchisee: p.teslaFranchisee || '',
          teamResponsibilities: p.teamResponsibilities || '',
          volunteerRecords: p.volunteerRecords || '',
        });
      } else {
        await updateProfile(userId, submitData);
        await showAlert('更新成功！');
        setMode('view');
        const p = await getProfile(userId);
        setProfile(p);
        let volunteerList = [];
        try {
          volunteerList = JSON.parse(p.volunteerRecords || '[]');
          if (!Array.isArray(volunteerList)) volunteerList = [];
        } catch {
          volunteerList = [];
        }
        setVolunteerRecords(volunteerList);
      }
    } catch (err) {
      showAlert(err.message || '操作失敗');
    }
  };

  if (mode === 'loading' && userId) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-[#666]">載入中...</p>
      </div>
    );
  }

  if (!userId) {
    return (
      <div>
        <PageHeader title="👤 個人資料" />
        <div className="text-center py-12 text-[#666]">
          請使用 LINE 登入以查看個人資料
        </div>
      </div>
    );
  }

  const isRegister = mode === 'register';
  const isEditing = mode === 'edit';

  const handleRefresh = () => window.location.reload();

  return (
    <div>
      <PageHeader title={isRegister ? '註冊' : '👤 個人資料'} onRefresh={!isRegister ? handleRefresh : null} />

      {liffProfile?.pictureUrl && (
        <div className="card text-center">
          <img
            src={liffProfile.pictureUrl}
            alt="頭像"
            className="member-avatar"
            style={{ width: '100px', height: '100px', margin: '0 auto 16px' }}
          />
          <p className="profile-line-name" style={{ margin: '0 0 4px', fontSize: '1rem', color: 'var(--text-light)' }}>
            {liffProfile.displayName || 'LINE 名字'}
          </p>
          {!isRegister && profile?.starLevel && (
            <div className="profile-star-display" style={{ marginTop: '8px' }}>
              <StarBadge level={profile.starLevel} />
            </div>
          )}
        </div>
      )}

      {(isRegister || isEditing) ? (
        <div className="card">
          <form onSubmit={handleSubmit}>
            <label className="form-label" style={{ fontWeight: 600 }}>📌 基本資料</label>
            <div className="form-group">
              <label className="form-label">真實姓名 *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="form-input"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">電話號碼</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">星等</label>
              <select
                value={form.starLevel}
                onChange={(e) => setForm((f) => ({ ...f, starLevel: e.target.value }))}
                className="form-select"
              >
                {STAR_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">生日（編輯時顯示完整年月日）</label>
              <input
                type="date"
                value={form.birthday}
                onChange={(e) => setForm((f) => ({ ...f, birthday: e.target.value }))}
                className="form-input"
              />
            </div>

            {/* 進階資訊區塊 */}
            <div className="form-group" style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color, #eee)' }}>
              <label className="form-label" style={{ fontWeight: 600 }}>📋 進階資訊{isRegister ? '（選填）' : ''}</label>

              {/* 課程紀錄 */}
              <div className="form-group">
                <label className="form-label">課程紀錄</label>
                <div className="checkbox-group">
                  {COURSE_OPTIONS.map((course) => {
                    const courses = form.courseRecord.split(',').map(c => c.trim()).filter(Boolean);
                    const isChecked = courses.includes(course);
                    return (
                      <label key={course} className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const newCourses = e.target.checked
                              ? [...courses, course]
                              : courses.filter(c => c !== course);
                            setForm((f) => ({ ...f, courseRecord: newCourses.join(', ') }));
                          }}
                          className="course-checkbox"
                        />
                        <span>{course}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 特斯拉加盟主 */}
              <div className="form-group">
                <label className="form-label">是否為特斯拉出行加盟主</label>
                <select
                  value={form.teslaFranchisee}
                  onChange={(e) => setForm((f) => ({ ...f, teslaFranchisee: e.target.value }))}
                  className="form-select"
                >
                  <option value="">未填</option>
                  <option value="是">是</option>
                  <option value="否">否</option>
                </select>
              </div>

              {/* 團隊負責事項 */}
              <div className="form-group">
                <label className="form-label">團隊負責事項</label>
                <input
                  type="text"
                  value={form.teamResponsibilities}
                  onChange={(e) => setForm((f) => ({ ...f, teamResponsibilities: e.target.value }))}
                  className="form-input"
                  placeholder="請輸入負責事項"
                />
              </div>

              {/* 課程志工 */}
              <div className="form-group">
                <label className="form-label">課程志工</label>
                <div className="volunteer-records-list" style={{ marginBottom: volunteerRecords.length > 0 ? '12px' : '0' }}>
                  {volunteerRecords.length === 0 ? (
                    <p className="text-sm text-[#666]">尚無記錄，可點「新增記錄」</p>
                  ) : (
                    volunteerRecords.map((record, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border border-[#E0E0E0] rounded mb-2">
                        <span className="text-sm">{record.date} {record.option}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const newList = volunteerRecords.filter((_, i) => i !== index);
                            setVolunteerRecords(newList);
                          }}
                          className="btn btn-small"
                          style={{ padding: '4px 8px', fontSize: '12px', backgroundColor: '#fee', color: '#c33' }}
                        >
                          刪除
                        </button>
                      </div>
                    ))
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowVolunteerForm(!showVolunteerForm)}
                  className="btn btn-secondary mt-8"
                >
                  ➕ 新增記錄
                </button>
                {/* 新增表單 */}
                {showVolunteerForm && (
                  <div className="hidden" style={{ display: 'block', marginTop: '12px', padding: '12px', background: 'var(--bg-color)', borderRadius: '8px' }}>
                    <div className="form-group">
                      <label className="form-label">日期</label>
                      <input
                        type="date"
                        value={newVolunteer.date}
                        onChange={(e) => setNewVolunteer((v) => ({ ...v, date: e.target.value }))}
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">選項</label>
                      <select
                        value={newVolunteer.option}
                        onChange={(e) => setNewVolunteer((v) => ({ ...v, option: e.target.value }))}
                        className="form-select"
                      >
                        <option value="金流">金流</option>
                        <option value="藍圖">藍圖</option>
                      </select>
                    </div>
                    <div className="event-actions">
                      <button
                        type="button"
                        onClick={() => {
                          if (newVolunteer.date) {
                            setVolunteerRecords([...volunteerRecords, newVolunteer]);
                            setNewVolunteer({ date: new Date().toISOString().slice(0, 10), option: '金流' });
                            setShowVolunteerForm(false);
                          }
                        }}
                        className="btn btn-primary"
                      >
                        確定
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowVolunteerForm(false)}
                        className="btn btn-secondary"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="event-actions">
              <button type="submit" className="btn btn-primary">
                {isRegister ? '註冊' : '儲存'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="card">
          <label className="form-label" style={{ fontWeight: 600 }}>📌 基本資料</label>
          <div className="form-group">
            <label className="form-label">真實姓名</label>
            <div className="form-input" style={{ backgroundColor: 'var(--bg-color)', border: 'none', padding: '12px' }}>
              {profile?.name || '-'}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <div className="form-input" style={{ backgroundColor: 'var(--bg-color)', border: 'none', padding: '12px' }}>
              {profile?.email || '-'}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">電話號碼</label>
            <div className="form-input" style={{ backgroundColor: 'var(--bg-color)', border: 'none', padding: '12px' }}>
              {profile?.phone || '-'}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">星等</label>
            <div className="form-input" style={{ backgroundColor: 'var(--bg-color)', border: 'none', padding: '12px' }}>
              {profile?.starLevel || '-'}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">生日</label>
            <div className="form-input" style={{ backgroundColor: 'var(--bg-color)', border: 'none', padding: '12px' }}>
              {profile?.birthday
                ? (() => {
                    const bd = profile.birthday;
                    if (bd.includes('-')) {
                      const parts = bd.split('-');
                      if (parts.length === 3) return `${parts[1]}/${parts[2]}`;
                    }
                    return bd;
                  })()
                : '-'}
            </div>
          </div>

          {/* 進階資訊顯示 */}
          <div className="form-group" style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color, #eee)' }}>
            <label className="form-label" style={{ fontWeight: 600 }}>📋 進階資訊</label>
            <div className="form-group">
              <label className="form-label">課程紀錄</label>
              <div className="form-input text-wrap-nice" style={{ backgroundColor: 'var(--bg-color)', border: 'none', padding: '12px', minHeight: 'auto' }}>
                {profile?.courseRecord || '-'}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">是否為特斯拉出行加盟主</label>
              <div className="form-input text-wrap-nice" style={{ backgroundColor: 'var(--bg-color)', border: 'none', padding: '12px' }}>
                {profile?.teslaFranchisee || '-'}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">團隊負責事項</label>
              <div className="form-input text-wrap-nice" style={{ backgroundColor: 'var(--bg-color)', border: 'none', padding: '12px', minHeight: 'auto' }}>
                {profile?.teamResponsibilities || '-'}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">課程志工</label>
              <div className="form-input text-wrap-nice" style={{ backgroundColor: 'var(--bg-color)', border: 'none', padding: '12px', minHeight: 'auto' }}>
                {(() => {
                  try {
                    const list = JSON.parse(profile?.volunteerRecords || '[]');
                    if (!Array.isArray(list) || list.length === 0) return '無';
                    return list.map(r => `${r.date} ${r.option}`).join('、');
                  } catch {
                    return profile?.volunteerRecords || '無';
                  }
                })()}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMode('edit')}
            className="btn btn-primary btn-block"
          >
            ✏️ 編輯資料
          </button>
        </div>
      )}
    </div>
  );
}
