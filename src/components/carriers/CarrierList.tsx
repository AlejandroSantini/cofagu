import React, { useCallback } from 'react';
import { Table } from '../ui/Table';
import { Button } from '../ui/Button';
import { Trash2, Mail, Phone } from 'lucide-react';
import type { Carrier } from '../../types';

interface CarrierListProps {
  carriers: Carrier[];
  loading: boolean;
  onRowClick: (carrier: Carrier) => void;
  canWrite: boolean;
  onDeleteConfirm: (id: number) => void;
}

const CarrierList: React.FC<CarrierListProps> = ({ carriers, loading, onRowClick, canWrite, onDeleteConfirm }) => {
  const columns = [
    { header: 'Nombre / Razón Social', render: (c: Carrier) => <span className="font-bold text-slate-900 dark:text-white">{c.name}</span> },
    { header: 'CUIT', render: (c: Carrier) => <span className="font-mono text-sm text-slate-600 dark:text-zinc-400">{c.cuit}</span> },
    { header: 'Email de Contacto', render: (c: Carrier) => (
      <span className="text-slate-600 dark:text-zinc-400 flex items-center gap-1.5">
        <Mail size={14} className="opacity-60" />{c.contactEmail}
      </span>
    ) },
    { header: 'Teléfono', render: (c: Carrier) => (
      <span className="text-slate-600 dark:text-zinc-400 flex items-center gap-1.5">
        <Phone size={14} className="opacity-60" />{c.contactPhone}
      </span>
    ) },
    ...(canWrite ? [{
      header: 'Acciones',
      className: 'w-24 text-right',
      render: (c: Carrier) => (
        <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            icon={Trash2}
            iconClassName="text-rose-500"
            onClick={() => onDeleteConfirm(c.id)}
            title="Eliminar"
          />
        </div>
      ),
    }] : []),
  ];

  const handleRow = useCallback((c: Carrier) => {
    onRowClick(c);
  }, [onRowClick]);

  return (
    <Table
      columns={columns}
      data={carriers}
      isLoading={loading}
      onRowClick={handleRow}
    />
  );
};

export default React.memo(CarrierList);
