/**
 * React 應用程式進入點
 * 包含 LIFF Context、路由與全域樣式
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { LiffProvider } from './context/LiffContext';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <LiffProvider>
        <App />
      </LiffProvider>
    </BrowserRouter>
  </React.StrictMode>
);
