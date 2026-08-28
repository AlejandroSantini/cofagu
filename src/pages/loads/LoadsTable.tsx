import React from 'react';
import { type Load } from '../../types';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';

interface LoadsTableProps {
  loads: Load[];
  isLoading: boolean;
  onRowClick: (load: Load) => void;
  statusFilter?: string;
  isCarrier?: boolean;
  myCarrierId?: number | null;
}

export const LoadsTable: React.FC<LoadsTableProps> = ({ loads, isLoading, onRowClick, statusFilter, isCarrier }) => {
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'PUBLISHED': return 'warning';
      case 'ACTIVE': return 'success';
      case 'PENDING': return 'warning';
      case 'ASSIGNED': return 'info';
      case 'ACCEPTED': return 'info';
      case 'IN_PROGRESS': return 'primary';
      case 'COMPLETED': return 'success';
      case 'CANCELLED': return 'neutral';
      default: return 'neutral';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PUBLISHED': return 'DISPONIBLE';
      case 'ACTIVE': return 'DISPONIBLE';
      case 'PENDING': return 'PENDIENTE';
      case 'ASSIGNED': return 'ASIGNADO';
      case 'ACCEPTED': return 'ASIGNADO';
      case 'IN_PROGRESS': return 'EN CURSO';
      case 'COMPLETED': return 'COMPLETADO';
      case 'CANCELLED': return 'CANCELADO';
      default: return status;
    }
  };

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
        const rateValue = l.rate ?? (l as any).trip?.rate;
        const baseRate = Number(rateValue);
        return (
          <span className="text-emerald-600 dark:text-emerald-400 font-black">
            {!isNaN(baseRate) && baseRate > 0 ? `$${baseRate.toLocaleString('es-AR')}` : 'Consultar'}
          </span>
        );
      }
    },
    {
      header: 'Transportista',
      render: (l: Load) => {
        if (l.carrier?.name) {
          return <span className="font-bold text-slate-800 dark:text-zinc-200">{l.carrier.name}</span>;
        }
        return <span className="text-xs text-slate-400 italic">Sin Asignar</span>;
      }
    },
    {
      header: 'Chofer / Camión',
      render: (l: Load) => {
        if (l.driver && l.truck) {
          return (
            <div className="flex flex-col">
              <span className="font-bold text-slate-800 dark:text-zinc-200">{l.driver.name}</span>
              <span className="text-slate-500 font-mono">{l.truck.plate}</span>
            </div>
          );
        }
        return <span className="text-xs text-slate-400 italic">N/A</span>;
      }
    },
    {
      header: 'Estado',
      render: (l: Load) => (
        <Badge variant={getStatusBadgeVariant(l.status)}>
          {getStatusLabel(l.status)}
        </Badge>
      )
    },
    ...(statusFilter === 'ACTIVE' ? (
      isCarrier 
        ? [
            {
              header: 'Cupos Disponibles',
              render: (l: Load) => {
                const acceptedCount = l.applications?.filter(a => a.status === 'ACCEPTED').length || 0;
                const maxCapacity = l.maxTrucks || 1;
                const cupos = Math.max(0, maxCapacity - acceptedCount);
                
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
    ) : [])
  ];

  return (
    <Table
      columns={columns}
      data={loads}
      isLoading={isLoading}
      onRowClick={onRowClick}
    />
  );
};
