import React from 'react';
import { type LucideIcon } from 'lucide-react';
import { Card } from './ui/Card';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color, onClick }) => {
  return (
    <Card 
      hover 
      onClick={onClick} 
      className={`relative overflow-hidden group cursor-pointer border-l-4 ${color.replace('bg-', 'border-')}`}
    >
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
            {title}
          </p>
          <p className="text-3xl font-black text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
            {value}
          </p>
        </div>
        <div className={`p-3 rounded-xl ${color} text-white shadow-lg shadow-current/20 group-hover:scale-110 transition-transform`}>
          <Icon size={24} />
        </div>
      </div>
      
      {/* Decoración sutil de fondo */}
      <div className="absolute -right-4 -bottom-4 opacity-[0.03] dark:opacity-[0.05] group-hover:opacity-10 transition-opacity">
        <Icon size={120} />
      </div>
    </Card>
  );
};
