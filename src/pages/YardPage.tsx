import React, { useState, useEffect, useCallback } from 'react';
import { loadService } from '../api/services';
import { type Load } from '../types';
import { getErrorMessage } from '../api/errorUtils';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Toast } from '../components/ui/Toast';
import { useToast } from '../hooks/useToast';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import {
  Search, User, Building, XCircle, RefreshCw, Clock
} from 'lucide-react';

export const YardPage: React.FC = () => {
  const [loads, setLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const { toast, showToast, hideToast } = useToast();

  // Reject modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectLoadId, setRejectLoadId] = useState<number | string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectSubmitting, setRejectSubmitting] = useState(false);

  const fetchLoads = useCallback(async (search?: string) => {
    try {
      const params = search?.trim() ? { search: search.trim() } : undefined;
      const res = await loadService.getYardLoads(params);
      if (res.data.success && res.data.data) {
        setLoads(res.data.data);
      }
    } catch (err) {
      console.error(err);
      setError('Error al cargar el listado de camiones en playa.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLoads(searchTerm);
  }, [fetchLoads]);

  const handleSearch = () => {
    setLoading(true);
    fetchLoads(searchTerm);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  useAutoRefresh(() => fetchLoads(searchTerm));

  // Reject flow
  const handleOpenReject = (loadId: number | string) => {
    setRejectLoadId(loadId);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectLoadId || !rejectReason.trim()) return;
    setRejectSubmitting(true);
    try {
      const res = await loadService.rejectLoad(rejectLoadId, rejectReason.trim());
      if (res.data && res.data.success !== false) {
        showToast('Carga rechazada correctamente', 'success');
        setShowRejectModal(false);
        setRejectLoadId(null);
        setRejectReason('');
        setLoading(true);
        fetchLoads(searchTerm);
      }
    } catch (err) {
      showToast(getErrorMessage(err, 'Error al rechazar la carga.'), 'error');
    } finally {
      setRejectSubmitting(false);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ASSIGNED': return 'ASIGNADO';
      case 'IN_PROGRESS': return 'EN VIAJE';
      default: return status;
    }
  };

  const getStatusVariant = (status: string): 'info' | 'primary' | 'neutral' => {
    switch (status) {
      case 'ASSIGNED': return 'info';
      case 'IN_PROGRESS': return 'primary';
      default: return 'neutral';
    }
  };

  const resolveResource = (load: any) => {
    const activeSubLoad = load.loads?.find((l: any) => l.status !== 'CANCELLED') || load.applications?.find((a: any) => a.status === 'ACCEPTED');
    const truck = load.truck || activeSubLoad?.truck;
    const driver = load.driver || activeSubLoad?.driver;
    const carrier = load.carrier || activeSubLoad?.carrier;
    return { truck, driver, carrier };
  };

  const columns = [
    {
      header: 'Patente',
      render: (load: any) => {
        const { truck } = resolveResource(load);
        return (
          <div className="flex flex-col">
            <span className="font-black font-mono text-slate-900 dark:text-white uppercase text-sm">
              {truck?.chassisPlate || truck?.plate || 'S/P'}
            </span>
            {truck?.trailerPlate && (
              <span className="text-[11px] font-mono text-slate-400 dark:text-zinc-500 uppercase">
                Acoplado: {truck.trailerPlate}
              </span>
            )}
          </div>
        );
      }
    },
    {
      header: 'Chofer',
      render: (load: any) => {
        const { driver } = resolveResource(load);
        return (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <User size={14} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-slate-800 dark:text-zinc-200 text-sm truncate">
                {driver?.name || 'N/D'}
              </span>
              {driver?.dni && (
                <span className="text-[11px] text-slate-400 font-mono">DNI: {driver.dni}</span>
              )}
            </div>
          </div>
        );
      }
    },
    {
      header: 'Transportista',
      render: (load: any) => {
        const { carrier } = resolveResource(load);
        return (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Building size={14} />
            </div>
            <span className="font-semibold text-slate-700 dark:text-zinc-300 text-sm truncate">
              {carrier?.name || 'N/D'}
            </span>
          </div>
        );
      }
    },
    {
      header: 'Estado',
      render: (load: Load) => (
        <Badge variant={getStatusVariant(load.status)}>
          {getStatusLabel(load.status)}
        </Badge>
      )
    },
    {
      header: 'Franja Horaria',
      render: (load: any) => {
        let timeSlot = 'S/H';
        if (load.loadingTimeStart && load.loadingTimeEnd) {
          timeSlot = `${load.loadingTimeStart} - ${load.loadingTimeEnd}`;
        } else if (load.loading_time_start && load.loading_time_end) {
          timeSlot = `${load.loading_time_start} - ${load.loading_time_end}`;
        } else if (load.timeSlot || load.time_slot) {
          timeSlot = load.timeSlot || load.time_slot;
        } else if (load.timeWindow || load.time_window) {
          timeSlot = load.timeWindow || load.time_window;
        } else if (load.timeRange || load.time_range) {
          timeSlot = load.timeRange || load.time_range;
        } else if (load.time) {
          timeSlot = load.time;
        }

        return (
          <div className="flex items-center gap-1.5">
            <Clock size={14} className="text-slate-400" />
            <span className="font-mono text-xs font-bold text-slate-600 dark:text-zinc-400">
              {timeSlot}
            </span>
          </div>
        );
      }
    },
    {
      header: 'Acciones',
      className: 'w-32 text-right',
      render: (load: Load) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="danger"
            size="sm"
            icon={XCircle}
            onClick={() => handleOpenReject(load.id)}
            className="text-xs whitespace-nowrap"
          >
            Rechazar
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Toast message={toast.message} isVisible={toast.isVisible} onClose={hideToast} type={toast.type} />

      {/* Reject Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setRejectLoadId(null);
          setRejectReason('');
        }}
        onConfirm={handleConfirmReject}
        title="Rechazar Carga"
        type="danger"
        confirmText="Confirmar Rechazo"
        isLoading={rejectSubmitting}
        isConfirmDisabled={!rejectReason.trim()}
      >
        <div className="space-y-4 pt-2">
          <p className="text-sm text-slate-500 dark:text-zinc-400">
            Ingrese el motivo por el cual se rechaza esta carga. Esta acción notificará al transportista y al coordinador.
          </p>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-2">
              Motivo de Rechazo *
            </label>
            <textarea
              className="w-full bg-white dark:bg-zinc-900 border-2 border-slate-100 dark:border-zinc-800 rounded-lg px-4 py-3 text-sm text-slate-900 dark:text-white focus:border-rose-500 focus:outline-none transition-all resize-none h-28"
              placeholder="Ej: Llegó fuera de horario establecido, documentación incompleta..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              autoFocus
            />
          </div>
        </div>
      </Modal>

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <PageHeader
          title="Control de Playa"
          description="Gestiona los camiones en tránsito. Busca por patente, chofer o empresa y registra rechazos."
        />
        <Button
          variant="outline"
          icon={RefreshCw}
          onClick={() => { setLoading(true); fetchLoads(searchTerm); }}
          className="w-full md:w-auto"
        >
          Actualizar
        </Button>
      </div>

      {/* Smart Search Bar */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200/80 dark:border-zinc-800 shadow-2xs">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por patente, nombre de chofer o empresa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 rounded-lg text-sm text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
          </div>
          <Button
            variant="primary"
            icon={Search}
            onClick={handleSearch}
            className="w-full sm:w-auto px-6"
          >
            Buscar
          </Button>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-sm font-medium p-4 rounded-lg">
          {error}
        </div>
      )}

      {/* Loads Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200/80 dark:border-zinc-800 shadow-2xs overflow-hidden">
        <Table
          columns={columns}
          data={loads}
          isLoading={loading}
          emptyMessage="No se encontraron camiones en la playa de camiones."
        />
      </div>
    </div>
  );
};

export default YardPage;
