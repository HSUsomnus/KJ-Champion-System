/**
 * 錯誤邊界：捕捉 React 錯誤，避免白屏
 */

import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('❌ React 錯誤:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F5F5', padding: 16 }}>
          <div style={{ textAlign: 'center', maxWidth: 400 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <h2 style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8, color: '#333' }}>應用程式載入失敗</h2>
            <p style={{ color: '#666', fontSize: 14, marginBottom: 16 }}>
              {this.state.error?.message || '發生未知錯誤'}
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{ padding: '12px 32px', borderRadius: 10, background: '#06C755', color: 'white', border: 'none', fontSize: 15, cursor: 'pointer', fontWeight: 600 }}
            >
              重新載入
            </button>
            <p style={{ color: '#999', fontSize: 12, marginTop: 16 }}>
              偵錯提示：在 localStorage 設定 eruda=1 可開啟 Console
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
