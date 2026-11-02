import React from 'react';
import { QUOTA_FULL_LABEL } from '../../utils/cupos';

interface QuotaFullBadgeProps {
  className?: string;
}

// Gris oscuro a propósito: no es el verde de "asignado" ni el dorado de
// "pendiente" (amber/yellow en este tema son el mismo dorado). La postulación
// ya no está en espera de nada.
export const QuotaFullBadge: React.FC<QuotaFullBadgeProps> = ({ className = '' }) => (
  <span
    className={`inline-flex items-center whitespace-nowrap font-black uppercase tracking-wider rounded-sm px-2 py-0.5 text-[10px] bg-slate-700 text-white dark:bg-zinc-200 dark:text-zinc-900 ${className}`}
  >
    {QUOTA_FULL_LABEL}
  </span>
);
