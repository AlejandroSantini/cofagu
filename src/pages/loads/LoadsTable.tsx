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

export const LoadsTable: React.FC<LoadsTableProps> = ({ loads, isLoading, onRowClick }) => {
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'PUBLISHED': return 'warning';
      case 'PENDING': return 'warning';
      case 'ASSIGNED': return 'primary';
      case 'ACCEPTED': return 'primary';
      case 'IN_PROGRESS': return 'primary';
      case 'COMPLETED': return 'success';
      case 'CANCELLED': return 'neutral';
      default: return 'neutral';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PUBLISHED': return 'DISPONIBLE';
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
        const baseRate = Number(l.rate);
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
        const driverName = l.driver?.name;
        const truckPlate = l.truck?.chassisPlate || l.truck?.plate;
        if (!driverName && !truckPlate) {
          return <span className="text-slate-400 text-xs italic">-</span>;
        }
        return (
          <div className="flex flex-col text-xs">
            {driverName && <span className="font-semibold text-slate-700 dark:text-zinc-300">{driverName}</span>}
            {truckPlate && <span className="font-mono text-slate-500">{truckPlate}</span>}
          </div>
        );
      }
    },
    {
      header: 'Estado',
      render: (l: Load) => (
        <Badge variant={getStatusBadgeVariant(l.status)}>
          {getStatusLabel(l.status)}
        </Badge>
      )
    }
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
