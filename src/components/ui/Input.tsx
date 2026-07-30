import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: LucideIcon;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ label, icon: Icon, error, className = '', ...props }, ref) => {
  return (
    <div className={`flex flex-col w-full ${label ? 'gap-2' : ''}`}>
      {label && (
        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1 whitespace-nowrap">
          {label}
        </label>
      )}
      <div className="relative group">
        {Icon && (
          <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${error ? 'text-rose-500' : 'text-slate-400 group-focus-within:text-emerald-500'}`}>
            <Icon size={20} />
          </div>
        )}
        <input 
          ref={ref}
          className={`
            w-full h-12 bg-white dark:bg-zinc-900 border-2 rounded-xl px-4 
            ${Icon ? 'pl-11' : ''} 
            text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none transition-all
            ${error ? 'border-rose-500 focus:border-rose-600' : 'border-slate-100 dark:border-zinc-800 focus:border-emerald-500'}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && (
        <span className="text-xs font-medium text-rose-500 ml-1">{error}</span>
      )}
    </div>
  );
});

Input.displayName = 'Input';
