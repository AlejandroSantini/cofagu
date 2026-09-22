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

/**
 * Filtro de una sola opción, como tabs subrayadas con scroll horizontal —
 * mismo patrón que las tabs de "Cargas y Viajes" (Disponibles/Asignados/…),
 * en vez de chips en caja que se apilan feo en mobile.
 */
export const FilterPills: React.FC<FilterPillsProps> = ({ label, options, value, onChange, className = '' }) => {
  return (
    <div className={className}>
      {label && (
        <span className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-1.5">
          {label}
        </span>
      )}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-zinc-800 overflow-x-auto no-scrollbar scroll-smooth">
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                active
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
