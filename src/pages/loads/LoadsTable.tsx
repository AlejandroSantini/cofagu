import React from 'react';
import { type Load } from '../../types';
import { Table } from '../../components/ui/Table';

interface LoadsTableProps {
  loads: Load[];
  isLoading: boolean;
  onRowClick: (load: Load) => void;
  statusFilter?: string;
  isCarrier?: boolean;
  myCarrierId?: number | null;
  isAdmin?: boolean;
  isEmployee?: boolean;
}

export const LoadsTable: React.FC<LoadsTableProps> = ({ loads, isLoading, onRowClick, statusFilter, isCarrier, isEmployee }) => {
  const columns = [
    {
      header: 'Fecha de Carga',
      className: 'min-w-[100px]',
      render: (l: Load) => {
        const loadingDate = (l as any).loadingDate || (l as any).trip?.loadingDate;
        return (
          <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
            {loadingDate ? new Date(loadingDate).toLocaleDateString('es-AR') : 'A Confirmar'}
          </span>
        );
      }
    },
    {
      header: 'Fecha de Cupo',
      className: 'min-w-[100px]',
      render: (l: Load) => {
        const quotaDate = (l as any).quotaDate || l.date || (l as any).trip?.quotaDate || (l as any).trip?.date;
        return (
          <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
            {quotaDate ? new Date(quotaDate).toLocaleDateString('es-AR') : 'N/D'}
          </span>
        );
      }
    },
    {
      header: 'Ruta',
      className: 'min-w-[170px]',
      render: (l: Load) => (
        <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-zinc-100 text-xs sm:text-sm whitespace-nowrap">
          <span>{l.origin}</span>
          <span className="text-emerald-500 font-black shrink-0">→</span>
          <span>{l.destination}</span>
        </div>
      )
    },
    {
      header: 'Tarifa',
      className: 'min-w-[110px]',
      render: (l: Load) => {
        const rateValue = l.resolvedRate ?? l.rate ?? (l as any).trip?.resolvedRate ?? (l as any).trip?.rate;
        const baseRate = Number(rateValue);
        return (
          <span className="text-emerald-600 dark:text-emerald-400 font-black text-xs sm:text-sm">
            {!isNaN(baseRate) && baseRate > 0 ? `$${baseRate.toLocaleString('es-AR')}` : 'Consultar'}
          </span>
        );
      }
    },
    {
      header: 'Transportista',
      className: 'min-w-[140px]',
      render: (l: any) => {
        const carrier = l.carrier || 
          l.loads?.find((load: any) => load.carrier && load.status !== 'CANCELLED')?.carrier || 
          l.applications?.find((app: any) => app.carrier && app.status === 'ACCEPTED')?.carrier;

        if (carrier?.name) {
          return <span className="font-bold text-slate-800 dark:text-zinc-200 text-xs sm:text-sm">{carrier.name}</span>;
        }
        return <span className="text-xs text-slate-400 italic">Sin Asignar</span>;
      }
    },
    {
      header: 'Chofer / Camión',
      className: 'min-w-[140px]',
      render: (l: any) => {
        const driver = l.driver || 
          l.loads?.find((load: any) => load.driver && load.status !== 'CANCELLED')?.driver || 
          l.applications?.find((app: any) => app.driver && app.status === 'ACCEPTED')?.driver;

        const truck = l.truck || 
          l.loads?.find((load: any) => load.truck && load.status !== 'CANCELLED')?.truck || 
          l.applications?.find((app: any) => app.truck && app.status === 'ACCEPTED')?.truck;

        if (driver || truck) {
          return (
            <div className="flex flex-col text-xs sm:text-sm">
              <span className="font-bold text-slate-800 dark:text-zinc-200">{driver?.name || 'N/D'}</span>
              <span className="text-slate-500 font-mono uppercase text-xs">{truck?.chassisPlate || truck?.plate || 'S/P'}</span>
            </div>
          );
        }
        return <span className="text-xs text-slate-400 italic">N/A</span>;
      }
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
                    <span className="text-xs font-bold text-rose-700 bg-rose-50 dark:bg-rose-950/30 dark:text-rose-400 px-2 py-1 rounded-sm whitespace-nowrap border border-rose-200/50 dark:border-rose-900/40">
                      Sin cupo disponible
                    </span>
                  );
                }

                return (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400 px-2 py-1 rounded-sm whitespace-nowrap border border-emerald-200/50 dark:border-emerald-900/40">
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
                  <span className="text-xs font-bold text-slate-700 bg-slate-100 dark:bg-zinc-800 dark:text-zinc-300 px-2 py-1 rounded-sm whitespace-nowrap">
                    {acceptedCount} / {maxCapacity}
                  </span>
                );
              }
            },
            {
              header: 'Postulantes',
              render: (l: Load) => (
                <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-zinc-800 dark:text-zinc-400 px-2 py-1 rounded-sm whitespace-nowrap">
                  {l.applications?.filter(a => a.status === 'PENDING').length || 0}
                </span>
              )
            }
          ]
    ) : [])
  ].filter(col => {
    if (!isCarrier && (col.header === 'Transportista' || col.header === 'Chofer / Camión')) {
      return false;
    }
    // El backend todavía no resuelve bien la tarifa por grupo en las cargas
    // ya asignadas (siempre devuelve la del grupo General). Para el usuario
    // de Balanza, que necesita saber exactamente cuánto pagarle a cada
    // transporte, es mejor no mostrar un número que puede ser incorrecto.
    if (isEmployee && col.header === 'Tarifa') {
      return false;
    }
    return true;
  });

  return (
    <Table
      columns={columns}
      data={loads}
      isLoading={isLoading}
      onRowClick={onRowClick}
    />
  );
};
