import React from 'react';

export interface FilterPillOption {
  value: string;
  label: string;
}

interface FilterPillsProps {
  label?: string;
  options: FilterPillOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/** Filtro de una sola opción, como segmentos/chips clickeables. */
export const FilterPills: React.FC<FilterPillsProps> = ({ label, options, value, onChange, className = '' }) => {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 ${className}`}>
      {label && (
        <span className="text-xs font-black uppercase tracking-wider text-slate-400 shrink-0">
          {label}
        </span>
      )}
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`
                px-3 py-1.5 rounded-sm text-xs font-black uppercase tracking-wider whitespace-nowrap
                transition-all duration-200 cursor-pointer active:scale-[0.98]
                ${active
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/10'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700'}
              `}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
