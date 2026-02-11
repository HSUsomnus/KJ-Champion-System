/**
 * 統一彈窗（取代 alert / confirm）
 * 與舊前端 share-dialog.js 對應
 */

import { createContext, useContext, useState, useCallback } from 'react';

const AlertContext = createContext(null);

export function AlertProvider({ children }) {
  const [alert, setAlert] = useState(null);

  const showAlert = useCallback((message) => {
    return new Promise((resolve) => {
      setAlert({ type: 'alert', message, resolve });
    });
  }, []);

  const showConfirm = useCallback((message, opts = {}) => {
    return new Promise((resolve) => {
      setAlert({
        type: 'confirm',
        message,
        confirmText: opts.confirmText || '確定',
        cancelText: opts.cancelText || '取消',
        resolve,
      });
    });
  }, []);

  const close = useCallback((result) => {
    if (alert?.resolve) alert.resolve(result);
    setAlert(null);
  }, [alert]);

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      {alert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
          <div className="bg-card-bg rounded-xl shadow-xl mx-4 p-6 max-w-sm">
            <p className="text-text-main mb-6">{alert.message}</p>
            <div className="flex gap-3 justify-end">
              {alert.type === 'confirm' && (
                <button
                  type="button"
                  onClick={() => close(false)}
                  className="px-4 py-2 rounded-lg border border-border bg-card-bg text-text-main"
                >
                  {alert.cancelText}
                </button>
              )}
              <button
                type="button"
                onClick={() => close(alert.type === 'confirm' ? true : undefined)}
                className="px-4 py-2 rounded-lg bg-primary text-white"
              >
                {alert.type === 'confirm' ? alert.confirmText : '確定'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const ctx = useContext(AlertContext);
  return ctx || { showAlert: () => Promise.resolve(), showConfirm: () => Promise.resolve(false) };
}
