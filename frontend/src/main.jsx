/**
 * React 應用程式進入點
 * 包含 LIFF Context、路由與全域樣式
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { LiffProvider } from './context/LiffContext';
import ErrorBoundary from './components/ErrorBoundary';
import App from './App';
import './index.css';

// 在 React 掛載前記錄日誌（方便 eruda 查看）
console.log('🚀 main.jsx 開始執行', new Date().toISOString());

try {
  const root = ReactDOM.createRoot(document.getElementById('root'));
  console.log('✅ ReactDOM.createRoot 成功');

  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <BrowserRouter>
          <LiffProvider>
            <App />
          </LiffProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </React.StrictMode>
  );
  console.log('✅ root.render() 已呼叫');
} catch (err) {
  // 如果 React 完全掛不上去，直接在 DOM 顯示錯誤
  console.error('❌ React 掛載失敗:', err);
  var rootEl = document.getElementById('root');
  if (rootEl) {
    rootEl.innerHTML =
      '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#F5F5F5;padding:20px">' +
      '<div style="text-align:center;max-width:400px">' +
      '<div style="font-size:48px;margin-bottom:16px">⚠️</div>' +
      '<h2 style="color:#333;margin-bottom:8px">應用程式載入失敗</h2>' +
      '<p style="color:#666;font-size:14px;margin-bottom:16px">' + (err.message || '未知錯誤') + '</p>' +
      '<button onclick="location.reload()" style="padding:10px 24px;border-radius:8px;background:#06C755;color:white;border:none;font-size:14px;cursor:pointer">重新載入</button>' +
      '</div></div>';
  }
}
