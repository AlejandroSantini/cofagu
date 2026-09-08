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
      padding="sm"
      className={`border-l-4 ${color.replace('bg-', 'border-')}`}
    >
      <div data-testid="stat-card" data-title={title} data-value={value}>
        <div className="flex items-start justify-between gap-3">
          <p className="text-3xl font-black text-slate-900 dark:text-white leading-none">
            {value}
          </p>
          <div className={`p-2 rounded-md ${color} text-white shrink-0`}>
            <Icon size={18} />
          </div>
        </div>
        <p className="mt-2 text-[11px] font-black uppercase tracking-wide text-slate-400 dark:text-slate-500 leading-tight">
          {title}
        </p>
      </div>
    </Card>
  );
};
