import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorMessageProps {
  message?: string;
  className?: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, className = '' }) => {
  if (!message) return null;

  return (
    <div 
      className={`
        p-4 rounded-2xl flex items-center gap-3 text-sm font-medium
        bg-rose-50 dark:bg-rose-500/10 
        border border-rose-100 dark:border-rose-500/20 
        text-rose-600 dark:text-rose-400
        animate-in fade-in slide-in-from-top-2 duration-300
        ${className}
      `}
    >
      <AlertCircle size={18} className="shrink-0" />
      <span>{message}</span>
    </div>
  );
};
