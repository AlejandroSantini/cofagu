import React from 'react';
import { type LucideIcon } from 'lucide-react';
import { Card } from './ui/Card';
import { Skeleton } from './ui/Skeleton';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  onClick?: () => void;
  /** Muestra un esqueleto en lugar del valor mientras se calcula el KPI. */
  loading?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color, onClick, loading = false }) => {
  return (
    <Card
      hover
      onClick={onClick}
      padding="sm"
      className={`border-l-4 ${color.replace('bg-', 'border-')}`}
    >
      <div data-testid="stat-card" data-title={title} data-value={value}>
        <div className="flex items-start justify-between gap-3">
          {loading ? (
            <Skeleton radius="md" className="h-8 w-12 mt-1" />
          ) : (
            <p className="text-3xl font-black text-slate-900 dark:text-white leading-none">
              {value}
            </p>
          )}
          <div className={`p-2 rounded-md ${color} text-white shrink-0`}>
            <Icon size={18} />
          </div>
        </div>
        {loading ? (
          <Skeleton className="mt-2.5 h-3 w-28" />
        ) : (
          <p className="mt-2 text-[11px] font-black uppercase tracking-wide text-slate-400 dark:text-slate-500 leading-tight">
            {title}
          </p>
        )}
      </div>
    </Card>
  );
};
