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
        <div className="min-h-screen flex items-center justify-center bg-bg-page p-4">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold mb-2 text-text-main">應用程式載入失敗</h2>
            <p className="text-text-light mb-4">
              {this.state.error?.message || '發生未知錯誤'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 rounded-lg bg-primary text-white"
            >
              重新載入
            </button>
            <p className="text-xs text-text-light mt-4">
              若問題持續，請在網址加上 ?eruda=1 查看 Console
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
