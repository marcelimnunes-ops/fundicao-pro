import React from 'react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'white';
  label?: string;
}

export default function Spinner({
  size = 'md',
  variant = 'primary',
  label = 'Carregando...',
}: SpinnerProps) {
  const sizeStyles = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  const colorStyles = {
    primary: 'border-slate-300 border-t-orange-500',
    white: 'border-orange-300 border-t-white',
  };

  const labelSizeStyles = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <div
        className={`animate-spin rounded-full border-2 ${sizeStyles[size]} ${colorStyles[variant]}`}
      />
      {label && <p className={`mt-3 text-slate-600 font-medium ${labelSizeStyles[size]}`}>{label}</p>}
    </div>
  );
}
