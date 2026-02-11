/**
 * 進入層：未登入顯示 LINE 登入，已登入則檢查註冊並顯示子元件
 * 等同 index.html 的 entryGate
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiff } from '../context/LiffContext';
import { checkMember } from '../services/api';

export default function EntryGate({ children }) {
  const { ready, userId, profile, login } = useLiff();
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);
  const [showMain, setShowMain] = useState(false);

  useEffect(() => {
    if (!ready) return;

    if (!userId) {
      setChecked(true);
      setShowMain(false);
      return;
    }

    checkMember(userId)
      .then((data) => {
        if (data?.isRegistered) {
          setShowMain(true);
        } else {
          navigate('/profile');
        }
      })
      .catch(() => setShowMain(true))
      .finally(() => setChecked(true));
  }, [ready, userId, navigate]);

  if (!ready || !checked) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-center">
          <div className="animate-pulse text-4xl mb-4">📅</div>
          <p className="text-text-light">載入中...</p>
        </div>
      </div>
    );
  }

  // 未登入：顯示 LINE 登入區
  if (!userId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
        <h2 className="text-2xl font-bold mb-4">📅 行事曆</h2>
        <p className="text-text-light text-center mb-8">
          請使用 LINE 帳號登入，以使用行程與成員功能。
        </p>
        <button
          type="button"
          onClick={login}
          className="px-8 py-3 rounded-lg bg-primary text-white font-medium hover:bg-primary-dark transition-colors"
        >
          使用 LINE 登入
        </button>
      </div>
    );
  }

  return children;
}
