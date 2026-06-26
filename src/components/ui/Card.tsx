import React from 'react';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
  onClick?: () => void;
  isClickable?: boolean;
  padding?: 'sm' | 'md' | 'lg';
}

export default function Card({
  children,
  title,
  subtitle,
  className = '',
  onClick,
  isClickable = false,
  padding = 'md',
}: CardProps) {
  const paddingStyles = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={`bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 ${
        isClickable ? 'cursor-pointer hover:bg-slate-50' : ''
      } ${paddingStyles[padding]} ${className}`}
      onClick={onClick}
    >
      {(title || subtitle) && (
        <div className="mb-4">
          {title && <h3 className="text-lg font-bold text-slate-900">{title}</h3>}
          {subtitle && <p className="text-sm text-slate-600 mt-1">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
}
