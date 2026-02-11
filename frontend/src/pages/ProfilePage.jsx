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

  return (
    <div>
      <PageHeader title={isRegister ? '註冊' : '👤 個人資料'} />

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
          <button
            type="button"
            onClick={() => setMode('edit')}
            className="w-full py-3 rounded-lg bg-primary text-white font-medium"
          >
            編輯個人資料
          </button>
        </div>
      )}
    </div>
  );
}
