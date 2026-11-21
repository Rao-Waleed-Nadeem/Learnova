import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 select-none';

  const sizeStyles = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5',
  };

  const variantStyles = {
    primary:
      'bg-[var(--color-primary-600)] text-white hover:bg-[var(--color-primary-700)] active:opacity-90 focus-visible:outline-[var(--color-focus-ring)] shadow-xs font-semibold',
    secondary:
      'bg-white text-[#1F2937] border border-[#D9DEE7] hover:bg-[#F5F7FA] hover:border-[#B8C1D0] active:bg-[#E5E7EB] dark:bg-[#202530] dark:text-[#F3F4F6] dark:border-[#2D3545] dark:hover:bg-[#2A3140] dark:hover:border-[#3E485D]',
    outline:
      'bg-transparent text-[var(--color-primary-600)] border border-[var(--color-primary-600)] hover:bg-[var(--color-primary-100)] active:opacity-90 dark:text-[var(--color-primary-700)] dark:border-[var(--color-primary-600)] dark:hover:bg-[var(--color-primary-100)]',
    ghost:
      'bg-transparent text-[#5B6472] hover:bg-[var(--color-primary-100)] hover:text-[var(--color-primary-700)] active:opacity-90 dark:text-[#9CA3AF] dark:hover:bg-[var(--color-primary-100)] dark:hover:text-[var(--color-primary-700)]',
    danger:
      'bg-[#B42318] text-white hover:bg-[#911C13] active:bg-[#7A1710] focus-visible:outline-[#B42318] dark:bg-[#DC2626] dark:text-white dark:hover:bg-[#B91C1C] dark:focus-visible:outline-[#DC2626] shadow-xs font-semibold',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};
