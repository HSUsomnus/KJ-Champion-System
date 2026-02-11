/**
 * 個人資料／註冊頁
 * 與舊前端 profile.html + profile.js 對應
 */

import { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';
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
      if (mode === 'register') {
        const registerData = { ...form };
        if (liffProfile?.pictureUrl) registerData.pictureUrl = liffProfile.pictureUrl;
        await registerProfile(userId, registerData);
        await showAlert('註冊成功！');
        setMode('view');
        const p = await getProfile(userId);
        setProfile(p);
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
        await updateProfile(userId, form);
        await showAlert('更新成功！');
        setMode('view');
        const p = await getProfile(userId);
        setProfile(p);
      }
    } catch (err) {
      showAlert(err.message || '操作失敗');
    }
  };

  if (mode === 'loading' && userId) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-text-light">載入中...</p>
      </div>
    );
  }

  if (!userId) {
    return (
      <div>
        <PageHeader title="👤 個人資料" />
        <div className="text-center py-12 text-text-light">
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
        <div className="flex flex-col items-center mb-6">
          <img
            src={liffProfile.pictureUrl}
            alt="頭像"
            className="w-20 h-20 rounded-full object-cover"
          />
          <span className="text-sm text-text-light mt-2">
            {liffProfile.displayName || 'LINE 名字'}
          </span>
        </div>
      )}

      {(isRegister || isEditing) ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-text-light mb-1">姓名 *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-border"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-text-light mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-border"
            />
          </div>
          <div>
            <label className="block text-sm text-text-light mb-1">電話</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-border"
            />
          </div>
          <div>
            <label className="block text-sm text-text-light mb-1">生日（月/日）</label>
            <input
              type="text"
              placeholder="MM/DD 或 M/D"
              value={form.birthday}
              onChange={(e) => setForm((f) => ({ ...f, birthday: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-border"
            />
          </div>
          <div>
            <label className="block text-sm text-text-light mb-1">星等</label>
            <select
              value={form.starLevel}
              onChange={(e) => setForm((f) => ({ ...f, starLevel: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-border"
            >
              {STAR_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* 進階資訊區塊 */}
          <div className="pt-4 mt-4 border-t border-border">
            <h3 className="font-semibold mb-3">📋 進階資訊{isRegister ? '（選填）' : ''}</h3>

            {/* 課程紀錄 */}
            <div className="mb-4">
              <label className="block text-sm text-text-light mb-2">課程紀錄</label>
              <div className="space-y-2">
                {COURSE_OPTIONS.map((course) => {
                  const courses = form.courseRecord.split(',').map(c => c.trim()).filter(Boolean);
                  const isChecked = courses.includes(course);
                  return (
                    <label key={course} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          const newCourses = e.target.checked
                            ? [...courses, course]
                            : courses.filter(c => c !== course);
                          setForm((f) => ({ ...f, courseRecord: newCourses.join(', ') }));
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{course}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* 特斯拉加盟主 */}
            <div className="mb-4">
              <label className="block text-sm text-text-light mb-1">是否為特斯拉出行加盟主</label>
              <select
                value={form.teslaFranchisee}
                onChange={(e) => setForm((f) => ({ ...f, teslaFranchisee: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-border"
              >
                <option value="">未填</option>
                <option value="是">是</option>
                <option value="否">否</option>
              </select>
            </div>

            {/* 團隊負責事項 */}
            <div className="mb-4">
              <label className="block text-sm text-text-light mb-1">團隊負責事項</label>
              <input
                type="text"
                value={form.teamResponsibilities}
                onChange={(e) => setForm((f) => ({ ...f, teamResponsibilities: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-border"
                placeholder="請輸入負責事項"
              />
            </div>

            {/* 課程志工 - 簡化顯示 */}
            <div className="mb-4">
              <label className="block text-sm text-text-light mb-1">課程志工</label>
              <textarea
                value={form.volunteerRecords}
                onChange={(e) => setForm((f) => ({ ...f, volunteerRecords: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-border"
                placeholder="例如：2024/01/15 金流"
                rows={3}
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-lg bg-primary text-white font-medium"
          >
            {isRegister ? '註冊' : '儲存'}
          </button>
        </form>
      ) : (
        <div className="space-y-3">
          <div className="p-4 rounded-lg bg-card-bg border border-border">
            <div className="text-sm text-text-light">姓名</div>
            <div className="font-medium">{profile?.name || '-'}</div>
          </div>
          <div className="p-4 rounded-lg bg-card-bg border border-border">
            <div className="text-sm text-text-light">Email</div>
            <div className="font-medium">{profile?.email || '-'}</div>
          </div>
          <div className="p-4 rounded-lg bg-card-bg border border-border">
            <div className="text-sm text-text-light">電話</div>
            <div className="font-medium">{profile?.phone || '-'}</div>
          </div>
          <div className="p-4 rounded-lg bg-card-bg border border-border">
            <div className="text-sm text-text-light">生日</div>
            <div className="font-medium">{profile?.birthday || '-'}</div>
          </div>
          <div className="p-4 rounded-lg bg-card-bg border border-border">
            <div className="text-sm text-text-light">星等</div>
            <div className="font-medium">{profile?.starLevel || '白星'}</div>
          </div>

          {/* 進階資訊顯示 */}
          <div className="mt-4 pt-4 border-t border-border">
            <h3 className="font-semibold mb-3">📋 進階資訊</h3>
            <div className="space-y-3">
              <div className="p-4 rounded-lg bg-card-bg border border-border">
                <div className="text-sm text-text-light">課程紀錄</div>
                <div className="font-medium">{profile?.courseRecord || '-'}</div>
              </div>
              <div className="p-4 rounded-lg bg-card-bg border border-border">
                <div className="text-sm text-text-light">是否為特斯拉出行加盟主</div>
                <div className="font-medium">{profile?.teslaFranchisee || '-'}</div>
              </div>
              <div className="p-4 rounded-lg bg-card-bg border border-border">
                <div className="text-sm text-text-light">團隊負責事項</div>
                <div className="font-medium">{profile?.teamResponsibilities || '-'}</div>
              </div>
              <div className="p-4 rounded-lg bg-card-bg border border-border">
                <div className="text-sm text-text-light">課程志工</div>
                <div className="font-medium whitespace-pre-wrap">{profile?.volunteerRecords || '-'}</div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMode('edit')}
            className="w-full py-3 rounded-lg bg-primary text-white font-medium mt-4"
          >
            ✏️ 編輯資料
          </button>
        </div>
      )}
    </div>
  );
}
