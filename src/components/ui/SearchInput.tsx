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
            w-full h-12 pl-10 pr-4 bg-white dark:bg-zinc-900 border-2 border-slate-100 dark:border-zinc-800 rounded-md
            text-sm text-slate-900 dark:text-white placeholder:text-slate-400
            focus:outline-none focus:border-emerald-500 transition-all
            ${className}
          `}
          {...props}
        />
      </div>
    );
  },
);

SearchInput.displayName = 'SearchInput';
