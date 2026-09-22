import React from 'react';
import { Search } from 'lucide-react';

interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  containerClassName?: string;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className = '', containerClassName = '', ...props }, ref) => {
    return (
      <div className={`relative group ${containerClassName}`}>
        <Search
          size={18}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors pointer-events-none"
        />
        <input
          ref={ref}
          type="text"
          className={`
            w-full h-12 pl-10 pr-4 bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 rounded-md
            text-sm text-slate-800 dark:text-zinc-200 placeholder:text-slate-400
            focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all
            ${className}
          `}
          {...props}
        />
      </div>
    );
  },
);

SearchInput.displayName = 'SearchInput';
