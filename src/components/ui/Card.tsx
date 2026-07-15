import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  hover = false, 
  onClick,
  padding = 'md'
}) => {
  const paddingMap = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-4 md:p-8',
    lg: 'p-6 md:p-10'
  };

  return (
    <div 
      onClick={onClick}
      className={`
        bg-white dark:bg-zinc-900 
        rounded-xl 
        border border-slate-200 dark:border-zinc-800 
        shadow-sm 
        transition-all duration-200
        ${paddingMap[padding]}
        ${hover ? 'hover:border-emerald-500/50 hover:shadow-md hover:shadow-emerald-500/5' : ''}
        ${onClick ? 'cursor-pointer active:scale-[0.99]' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};
