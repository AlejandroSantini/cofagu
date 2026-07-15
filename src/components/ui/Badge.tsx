import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'neutral';
  size?: 'xs' | 'sm';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ 
  children, 
  variant = 'neutral', 
  size = 'xs',
  className = ''
}) => {
  const variants = {
    primary: 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-800 dark:text-yellow-400',
    success: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
    warning: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400',
    error: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400',
    neutral: 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400'
  };

  const sizes = {
    xs: 'px-2 py-0.5 text-[10px]',
    sm: 'px-2.5 py-1 text-xs'
  };

  return (
    <span className={`
      inline-flex items-center font-black uppercase tracking-wider rounded-md
      ${variants[variant]}
      ${sizes[size]}
      ${className}
    `}>
      {children}
    </span>
  );
};
