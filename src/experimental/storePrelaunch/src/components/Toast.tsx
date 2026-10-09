import React from 'react';
import { Sparkles, CheckCircle, Info } from 'lucide-react';
import { ToastMessage } from '../types';

interface ToastProps {
  toast: ToastMessage | null;
  onDismiss: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  if (!toast) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '28px',
        right: '28px',
        zIndex: 120,
        background: 'rgba(20, 6, 11, 0.95)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid var(--gold)',
        borderRadius: 'var(--radius-md)',
        padding: '16px 22px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.7), 0 0 25px rgba(212, 175, 55, 0.2)',
        animation: 'slideUp 0.3s ease-out forwards',
        maxWidth: '420px',
      }}
      onClick={onDismiss}
    >
      <div
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          background: 'rgba(212, 175, 55, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--gold-bright)',
          flexShrink: 0,
        }}
      >
        {toast.type === 'gold' ? (
          <Sparkles size={16} />
        ) : toast.type === 'success' ? (
          <CheckCircle size={16} />
        ) : (
          <Info size={16} />
        )}
      </div>

      <p style={{ fontSize: '0.88rem', color: 'var(--text-main)', lineHeight: 1.4 }}>
        {toast.message}
      </p>

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};
