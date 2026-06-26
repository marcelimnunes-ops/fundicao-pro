import React from 'react';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export default function FormInput({
  label,
  error,
  helperText,
  icon,
  className = '',
  ...props
}: FormInputProps) {
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        {icon && <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">{icon}</div>}
        <input
          className={`w-full px-4 py-2 ${icon ? 'pl-10' : ''} border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all ${
            error ? 'border-red-500 bg-red-50' : 'border-slate-300'
          } ${className}`}
          {...props}
        />
      </div>

      {error && <p className="text-red-600 text-sm mt-1 font-semibold">✕ {error}</p>}
      {helperText && !error && <p className="text-slate-500 text-sm mt-1">{helperText}</p>}
    </div>
  );
}
