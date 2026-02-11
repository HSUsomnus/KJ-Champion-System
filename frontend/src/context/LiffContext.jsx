/**
 * LIFF Context：處理 LINE LIFF SDK 初始化與登入狀態
 * 等同舊前端的 liff.js + liffReady 事件
 */

import { createContext, useContext, useEffect, useState } from 'react';

const LiffContext = createContext(null);

// 開發模式：URL 帶 ?dev=1 可啟用（跳過真實 LIFF，用模擬 userId）
function isDevMode() {
  try {
    const p = new URLSearchParams(window.location.search);
    return p.get('dev') === '1';
  } catch {
    return false;
  }
}

export function LiffProvider({ children }) {
  const [state, setState] = useState({
    ready: false,
    userId: null,
    profile: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        // 開發模式：使用模擬 LINE ID
        if (isDevMode()) {
          const mockUserId = 'U11111111111111111111111111111111';
          const mockProfile = {
            userId: mockUserId,
            displayName: '開發測試員',
            pictureUrl: 'https://via.placeholder.com/100',
            statusMessage: '',
          };
          if (!cancelled) {
            setState({ ready: true, userId: mockUserId, profile: mockProfile, error: null });
          }
          return;
        }

        // 從後端取得 LIFF ID
        const res = await fetch('/api/line/liff-id');
        const data = await res.json();
        if (!data.success) throw new Error('無法取得 LIFF ID');

        const liffId = data.data.liffId;
        const liff = window.liff;

        if (!liff) throw new Error('LIFF SDK 未載入');

        await liff.init({ liffId });

        if (liff.isLoggedIn()) {
          const profile = await liff.getProfile();
          if (!cancelled) {
            setState({ ready: true, userId: profile.userId, profile, error: null });
          }
        } else {
          if (!cancelled) {
            setState({ ready: true, userId: null, profile: null, error: null });
          }
        }
      } catch (err) {
        if (!cancelled) {
          setState({ ready: true, userId: null, profile: null, error: err.message });
        }
      }
    }

    init();
    return () => { cancelled = true; };
  }, []);

  // 登入（呼叫 LIFF login）
  const login = () => {
    if (window.liff && window.liff.login) {
      window.liff.login();
    }
  };

  return (
    <LiffContext.Provider value={{ ...state, login }}>
      {children}
    </LiffContext.Provider>
  );
}

export function useLiff() {
  const ctx = useContext(LiffContext);
  if (!ctx) throw new Error('useLiff 必須在 LiffProvider 內使用');
  return ctx;
}
