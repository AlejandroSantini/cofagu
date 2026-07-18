import React from 'react';
import { type Load } from '../../types';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';

interface LoadsTableProps {
  loads: Load[];
  isLoading: boolean;
  onRowClick: (load: Load) => void;
  statusFilter?: 'PUBLISHED' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';
}

export const LoadsTable: React.FC<LoadsTableProps> = ({ loads, isLoading, onRowClick, statusFilter }) => {
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
          {new Date(l.date).toLocaleDateString('es-AR')}
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
      render: (l: Load) => (
        <span className="text-emerald-600 dark:text-emerald-400 font-black">
          ${Number(l.rate).toLocaleString('es-AR')}
        </span>
      )
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
