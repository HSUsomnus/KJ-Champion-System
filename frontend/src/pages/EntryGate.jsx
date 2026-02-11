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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>📅</div>
          <p style={{ color: '#666', fontSize: 14 }}>載入中...</p>
        </div>
      </div>
    );
  }

  // 未登入：顯示 LINE 登入區
  if (!userId) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: '0 24px' }}>
        <h2 style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>📅 行事曆</h2>
        <p style={{ color: '#666', textAlign: 'center', marginBottom: 32 }}>
          請使用 LINE 帳號登入，以使用行程與成員功能。
        </p>
        <button
          type="button"
          onClick={login}
          style={{ padding: '12px 32px', borderRadius: 10, background: '#06C755', color: 'white', border: 'none', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
        >
          使用 LINE 登入
        </button>
      </div>
    );
  }

  return children;
}
