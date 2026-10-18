import React from 'react';
import { AlertCircle } from 'lucide-react';

interface FormFieldProps {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  charCount?: { current: number; max?: number };
  children: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  id,
  label,
  required = false,
  error,
  helperText,
  charCount,
  children,
  className = '',
}) => {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-xs font-semibold text-[#1F2937] dark:text-[#F1F3F8] select-none">
          {label}
          {required && <span className="text-[#B42318] dark:text-[#FF9B95] ml-1" aria-hidden="true">*</span>}
        </label>
        {charCount && (
          <span className="text-xs text-[#737D8C] dark:text-[#929BAA]">
            {charCount.current}
            {charCount.max ? ` / ${charCount.max}` : ''}
          </span>
        )}
      </div>

      <div className="relative">{children}</div>

      {error ? (
        <p id={`${id}-error`} className="flex items-center gap-1.5 text-xs text-[#B42318] dark:text-[#FF9B95] mt-0.5" role="alert">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p id={`${id}-helper`} className="text-xs text-[#5B6472] dark:text-[#B5BDCA] mt-0.5">
          {helperText}
        </p>
      ) : null}
    </div>
  );
};
