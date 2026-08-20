import React from 'react';
import { type Load } from '../../types';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';

interface LoadsTableProps {
  loads: Load[];
  isLoading: boolean;
  onRowClick: (load: Load) => void;
  statusFilter?: 'PUBLISHED' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  isCarrier?: boolean;
}

export const LoadsTable: React.FC<LoadsTableProps> = ({ loads, isLoading, onRowClick, statusFilter, isCarrier }) => {
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'PUBLISHED': return 'warning';
      case 'ASSIGNED': return 'primary';
      case 'IN_PROGRESS': return 'primary';
      case 'COMPLETED': return 'success';
      case 'CANCELLED': return 'neutral';
      default: return 'neutral';
    }
  };

  const filteredLoads = statusFilter 
    ? loads.filter(l => l.status === statusFilter || (statusFilter === 'ASSIGNED' && l.status === 'IN_PROGRESS')) 
    : loads;


  const columns = [
    {
      header: 'Fecha',
      render: (l: Load) => (
        <span className="font-bold text-slate-900 dark:text-white">
          {new Date(l.loadingDate || l.date).toLocaleDateString('es-AR')}
        </span>
      )
    },
    {
      header: 'Ruta',
      render: (l: Load) => (
        <span className="text-slate-700 dark:text-zinc-300 font-semibold">
          {l.origin} → {l.destination}
        </span>
      )
    },
    {
      header: 'Tarifa',
      render: (l: Load) => {
        const groups = l.targetGroups || [];
        if (groups.length > 0) {
          const rates = groups.map(g => Number(g.rate)).filter(r => !isNaN(r));
          if (rates.length > 0) {
            const minRate = Math.min(...rates);
            const maxRate = Math.max(...rates);

            if (minRate !== maxRate) {
              return (
                <div className="flex flex-col">
                  <span className="text-emerald-600 dark:text-emerald-400 font-black">
                    ${minRate.toLocaleString('es-AR')} - ${maxRate.toLocaleString('es-AR')}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider">
                    {groups.length} tarifas por grupo
                  </span>
                </div>
              );
            } else {
              return (
                <span className="text-emerald-600 dark:text-emerald-400 font-black">
                  ${minRate.toLocaleString('es-AR')}
                </span>
              );
            }
          }
        }

        const baseRate = Number(l.rate);
        return (
          <span className="text-emerald-600 dark:text-emerald-400 font-black">
            {!isNaN(baseRate) && baseRate > 0 ? `$${baseRate.toLocaleString('es-AR')}` : 'Consultar'}
          </span>
        );
      }
    },




    {
      header: 'Estado',
      render: (l: Load) => (
        <Badge variant={getStatusBadgeVariant(l.status)}>
          {l.status === 'PUBLISHED' ? 'DISPONIBLE' : 
           l.status === 'ASSIGNED' ? 'ASIGNADO' : 
           l.status === 'IN_PROGRESS' ? 'EN VIAJE' : 
           l.status === 'COMPLETED' ? 'COMPLETADO' : 'CANCELADO'}
        </Badge>
      )
    },
    ...(isCarrier 
      ? [
          {
            header: 'Cupos Disponibles',
            render: (l: Load) => {
              const acceptedCount = l.applications?.filter(a => a.status === 'ACCEPTED').length || 0;
              const maxCapacity = l.maxTrucks || 1;
              const cuposCalculados = Math.max(0, maxCapacity - acceptedCount);
              const cupos = l.cuposPendientes !== undefined ? l.cuposPendientes : cuposCalculados;
              
              if (l.status === 'ASSIGNED' || l.status === 'IN_PROGRESS' || l.status === 'COMPLETED' || cupos <= 0) {
                return (
                  <span className="text-xs font-bold text-rose-700 bg-rose-50 dark:bg-rose-950/30 dark:text-rose-400 px-2 py-1 rounded-md border border-rose-200/50 dark:border-rose-900/40">
                    Sin cupo disponible
                  </span>
                );
              }

              return (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400 px-2 py-1 rounded-md border border-emerald-200/50 dark:border-emerald-900/40">
                  {cupos} {cupos === 1 ? 'cupo libre' : 'cupos libres'}
                </span>
              );
            }
          }
        ]
      : [
          {
            header: 'Cupo (Aprobados)',
            render: (l: Load) => {
              const acceptedCount = l.applications?.filter(a => a.status === 'ACCEPTED').length || 0;
              const maxCapacity = l.maxTrucks || 1;
              return (
                <span className="text-xs font-bold text-slate-700 bg-slate-100 dark:bg-zinc-800 dark:text-zinc-300 px-2 py-1 rounded-md">
                  {acceptedCount} / {maxCapacity}
                </span>
              );
            }
          },
          {
            header: 'Postulantes',
            render: (l: Load) => (
              <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-zinc-800 dark:text-zinc-400 px-2 py-1 rounded-md">
                {l.applications?.filter(a => a.status === 'PENDING').length || 0}
              </span>
            )
          }
        ]
    )
  ];


  return (
    <Table
      columns={columns}
      data={filteredLoads}
      isLoading={isLoading}
      onRowClick={onRowClick}
    />
  );
};
