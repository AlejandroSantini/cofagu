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
      className={`border-l-4 ${color.replace('bg-', 'border-')}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <p className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
            {title}
          </p>
          <p className="text-3xl font-black text-slate-900 dark:text-white">
            {value}
          </p>
        </div>
        <div className={`p-3 rounded-md ${color} text-white shrink-0`}>
          <Icon size={24} />
        </div>
      </div>
    </Card>
  );
};
