import React from 'react';

interface AlertProps {
  type?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message: string;
  onClose?: () => void;
  closeable?: boolean;
}

export default function Alert({
  type = 'info',
  title,
  message,
  onClose,
  closeable = true,
}: AlertProps) {
  const typeStyles = {
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      titleText: 'text-blue-900',
      icon: 'ℹ️',
    },
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      titleText: 'text-green-900',
      icon: '✓',
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      titleText: 'text-yellow-900',
      icon: '⚠️',
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      titleText: 'text-red-900',
      icon: '✕',
    },
  };

  const style = typeStyles[type];

  return (
    <div className={`${style.bg} border ${style.border} rounded-lg p-4 mb-4`}>
      <div className="flex items-start">
        <span className="mr-3 text-lg">{style.icon}</span>
        <div className="flex-1">
          {title && <p className={`font-semibold ${style.titleText} mb-1`}>{title}</p>}
          <p className={`text-sm ${style.text}`}>{message}</p>
        </div>
        {closeable && onClose && (
          <button
            onClick={onClose}
            className={`ml-4 ${style.text} hover:opacity-75 font-bold`}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
