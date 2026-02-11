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

// 幫任何 Promise 加上超時保護，避免永遠卡住
function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} 超時（${ms / 1000}秒）`)), ms)
    ),
  ]);
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
        console.log('🔧 LIFF 初始化開始...', new Date().toISOString());

        // 開發模式：使用模擬 LINE ID
        if (isDevMode()) {
          console.log('🛠️ 開發模式：使用模擬 LINE ID');
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

        // 等待 LIFF SDK 載入（最多等 5 秒）
        let retries = 0;
        while (!window.liff && retries < 50) {
          await new Promise(resolve => setTimeout(resolve, 100));
          retries++;
        }

        if (!window.liff) {
          console.error('❌ LIFF SDK 未載入（等了 5 秒）');
          if (!cancelled) {
            setState({ ready: true, userId: null, profile: null, error: 'LIFF SDK 未載入' });
          }
          return;
        }

        console.log('✅ LIFF SDK 已載入');

        // 從後端取得 LIFF ID（加 8 秒超時保護）
        console.log('⏳ 正在取得 LIFF ID...');
        const res = await withTimeout(
          fetch('/api/line/liff-id'),
          8000,
          '取得 LIFF ID'
        );
        const data = await res.json();
        if (!data.success) throw new Error('無法取得 LIFF ID');

        const liffId = data.data.liffId;
        console.log('✅ 已取得 LIFF ID:', liffId);

        // liff.init() 加 10 秒超時保護（這是最常卡住的地方！）
        console.log('⏳ 正在執行 liff.init()...');
        await withTimeout(
          window.liff.init({ liffId }),
          10000,
          'liff.init()'
        );
        console.log('✅ LIFF 初始化成功');

        if (window.liff.isLoggedIn()) {
          // getProfile 也加超時保護
          console.log('⏳ 正在取得使用者資料...');
          const profile = await withTimeout(
            window.liff.getProfile(),
            8000,
            'liff.getProfile()'
          );
          console.log('✅ 已登入，User ID:', profile.userId);
          if (!cancelled) {
            setState({ ready: true, userId: profile.userId, profile, error: null });
          }
        } else {
          console.log('⚠️ 尚未登入');
          if (!cancelled) {
            setState({ ready: true, userId: null, profile: null, error: null });
          }
        }
      } catch (err) {
        console.error('❌ LIFF 初始化失敗:', err);
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

  // 在 LIFF 未準備好時顯示載入畫面（使用行內樣式確保一定可見）
  if (!state.ready) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F5F5' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16, animation: 'pulse 2s infinite' }}>📅</div>
          <p style={{ color: '#666', fontSize: 14 }}>初始化中...</p>
        </div>
      </div>
    );
  }

  // 如果有錯誤，顯示錯誤訊息但仍然渲染 children（允許降級使用）
  if (state.error) {
    console.warn('⚠️ LIFF 初始化有錯誤，但允許繼續:', state.error);
  }

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
