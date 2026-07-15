import React from 'react';
import { Loader2, type LucideIcon } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: LucideIcon;
  iconClassName?: string;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md',
  isLoading, 
  icon: Icon,
  iconClassName = '',
  className = '',
  disabled,
  ...props 
}) => {
  const isIconOnly = !children && !!Icon;
  const isDisabled = isLoading || disabled;
  const baseStyles = `relative flex items-center justify-center gap-3 font-bold transition-all duration-200 rounded-xl ${isDisabled ? 'opacity-50 !cursor-not-allowed' : 'cursor-pointer active:scale-[0.98]'}`;
  const sizes = {
    sm: isIconOnly ? "w-10 h-10 p-0" : "px-4 py-2 text-sm",
    md: isIconOnly ? "w-12 h-12 p-0" : "px-6 py-3 text-base",
    lg: isIconOnly ? "w-14 h-14 p-0" : "px-8 py-4 text-lg"
  };
  
  const iconSizes = {
    sm: 16,
    md: 18,
    lg: 22
  };

  const variants = {
    primary: "bg-emerald-600 text-white hover:bg-emerald-700 disabled:hover:bg-emerald-600 shadow-md shadow-emerald-600/10",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 disabled:hover:bg-slate-100 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 dark:disabled:hover:bg-zinc-800 shadow-sm",
    outline: "bg-transparent border-2 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 disabled:hover:border-slate-200 disabled:hover:text-slate-700 dark:hover:text-emerald-400 dark:disabled:hover:border-zinc-800 dark:disabled:hover:text-slate-300 hover:bg-emerald-50 disabled:hover:bg-transparent dark:hover:bg-emerald-700/10 dark:disabled:hover:bg-transparent",
    ghost: "bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 disabled:hover:bg-transparent dark:hover:bg-zinc-800 dark:disabled:hover:bg-transparent",
    danger: "bg-rose-500 text-white hover:bg-rose-600 disabled:hover:bg-rose-500 shadow-md shadow-rose-500/10",
  };

  return (
    <button 
      className={`${baseStyles} ${sizes[size]} ${variants[variant]} ${className}`}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="animate-spin" size={iconSizes[size]} />
      ) : (
        <>
          {Icon && <Icon size={iconSizes[size]} className={`flex-shrink-0 ${iconClassName}`} />}
          {children && <span className="truncate">{children}</span>}
        </>
      )}
    </button>
  );
};
