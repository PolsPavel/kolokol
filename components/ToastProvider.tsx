'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export type Toast = {
  id: string;
  message: string;
  type: ToastType;
};

type ToastContextType = {
  toast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border transform transition-all duration-300 animate-slide-in min-w-[300px] max-w-md ${
              t.type === 'success' ? 'bg-green-50 border-green-200 text-green-900' :
              t.type === 'error' ? 'bg-red-50 border-red-200 text-red-900' :
              t.type === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-900' :
              'bg-blue-50 border-blue-200 text-blue-900'
            }`}
          >
            <span className="text-xl leading-none">
              {t.type === 'success' && '✅'}
              {t.type === 'error' && '❌'}
              {t.type === 'warning' && '⚠️'}
              {t.type === 'info' && 'ℹ️'}
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium whitespace-pre-wrap">{t.message}</p>
            </div>
            <button onClick={() => removeToast(t.id)} className="text-gray-400 hover:text-gray-600">
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}