import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  iconColor?: string;
  showBack?: boolean;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ 
  title, 
  icon: Icon, 
  iconColor = "bg-emerald-600",
  showBack = false 
}) => {
  const navigate = useNavigate();

  return (
    <div className="">
      {showBack && (
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-3 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 mb-6 transition-all group py-2"
        >
          <div className="w-10 h-10 rounded-full bg-white dark:bg-zinc-900 shadow-sm border border-slate-200 dark:border-zinc-800 flex items-center justify-center group-hover:scale-110 group-hover:border-emerald-500 transition-all">
            <ChevronLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
          </div>
          <span className="font-bold text-lg">Volver</span>
        </button>
      )}
      
      <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
        {Icon && (
          <div className={`w-12 h-12 sm:w-16 sm:h-16 ${iconColor} text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-600/20 shrink-0`}>
            <Icon className="w-6 h-6 sm:w-8 sm:h-8" />
          </div>
        )}
        <div className="min-w-0 text-center sm:text-left">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            {title}
          </h1>
        </div>
      </div>
    </div>
  );
};
