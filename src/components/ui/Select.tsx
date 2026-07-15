import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  icon?: LucideIcon;
  options: { value: string | number; label: string }[];
  error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ label, icon: Icon, options, error, className = '', ...props }, ref) => {
  return (
    <div className={`flex flex-col w-full ${label ? 'gap-2' : ''}`}>
      {label && (
        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">
          {label}
        </label>
      )}
      <div className="relative group">
        {Icon && (
          <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors pointer-events-none ${error ? 'text-rose-500' : 'text-slate-400 group-focus-within:text-emerald-500'}`}>
            <Icon size={20} />
          </div>
        )}
        <select 
          ref={ref}
          className={`
            w-full h-12 bg-white dark:bg-zinc-900 border-2 rounded-xl px-4 
            ${Icon ? 'pl-11' : ''} 
            text-sm text-slate-900 dark:text-white focus:outline-none transition-all appearance-none cursor-pointer
            ${error ? 'border-rose-500 focus:border-rose-600' : 'border-slate-100 dark:border-zinc-800 focus:border-emerald-500'}
            ${className}
          `}
          {...props}
        >
          <option value="">Seleccione una opción</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <span className="text-xs font-medium text-rose-500 ml-1">{error}</span>
      )}
    </div>
  );
});

Select.displayName = 'Select';
