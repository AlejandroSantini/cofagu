import React, { useState } from 'react';
import { loadService, invoiceService } from '../api/services';
import { type Load } from '../types';
import { getErrorMessage } from '../api/errorUtils';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Toast } from '../components/ui/Toast';
import { useToast } from '../hooks/useToast';
import {
  Search, FileText, Download, Building, Scale, DollarSign, Loader2, AlertTriangle, Package
} from 'lucide-react';

export const ControlViajesPage: React.FC = () => {
  const [ctgInput, setCtgInput] = useState('');
  const [load, setLoad] = useState<Load | null>(null);
  const [searching, setSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  const handleSearch = async () => {
    const trimmed = ctgInput.trim();
    if (!trimmed) return;

    setSearching(true);
    setNotFound(false);
    setLoad(null);
    setHasSearched(true);

    try {
      const res = await loadService.getLoadByCTG(trimmed);
      if (res.data.success && res.data.data) {
        setLoad(res.data.data);
      } else {
        setNotFound(true);
      }
    } catch (err: any) {
      if (err.response?.status === 404) {
        setNotFound(true);
      } else {
        showToast(getErrorMessage(err, 'Error al buscar el viaje.'), 'error');
      }
    } finally {
      setSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleDownloadInvoice = async () => {
    if (!load?.invoiceId) return;
    setDownloading(true);
    try {
      const res = await invoiceService.downloadInvoice(load.invoiceId);
      if (res.data.success && res.data.data) {
        const url = (res.data.data as any).downloadUrl || (res.data as any).downloadUrl;
        if (url) {
          window.open(url, '_blank');
        } else {
          showToast('No se encontró la URL de descarga.', 'error');
        }
      }
    } catch (err) {
      showToast(getErrorMessage(err, 'Error al descargar el comprobante.'), 'error');
    } finally {
      setDownloading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'DISPONIBLE';
      case 'ASSIGNED': return 'ASIGNADO';
      case 'IN_PROGRESS': return 'EN VIAJE';
      case 'COMPLETED': return 'COMPLETADO';
      case 'CANCELLED': return 'CANCELADO';
      case 'REJECTED': return 'RECHAZADO';
      default: return status;
    }
  };

  const getStatusVariant = (status: string): 'success' | 'info' | 'primary' | 'warning' | 'neutral' | 'error' => {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'ASSIGNED': return 'info';
      case 'IN_PROGRESS': return 'primary';
      case 'COMPLETED': return 'success';
      case 'CANCELLED': return 'neutral';
      case 'REJECTED': return 'error';
      default: return 'neutral';
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatWeight = (value: number) => {
    return new Intl.NumberFormat('es-AR').format(value) + ' kg';
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <Toast message={toast.message} isVisible={toast.isVisible} onClose={hideToast} type={toast.type} />

      {/* Header */}
      <div className="text-center space-y-2 pt-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-2">
          <FileText size={32} />
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">
          Control de Viajes
        </h1>
        <p className="text-sm text-slate-500 dark:text-zinc-400 max-w-md mx-auto">
          Busca un viaje por su número de CTG (Carta de Porte) para consultar datos y descargar comprobantes.
        </p>
      </div>

      {/* Hero Search */}
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-sm">
        <label className="block text-xs font-black text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
          Buscar por CTG
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={22} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Ingresá el número de CTG..."
              value={ctgInput}
              onChange={(e) => setCtgInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-zinc-800/60 border-2 border-slate-200 dark:border-zinc-700 rounded-xl text-lg text-slate-900 dark:text-white font-bold focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
              autoFocus
            />
          </div>
          <Button
            variant="primary"
            icon={Search}
            onClick={handleSearch}
            isLoading={searching}
            disabled={!ctgInput.trim() || searching}
            className="w-full sm:w-auto px-8 py-4 text-base"
          >
            Buscar
          </Button>
        </div>
      </div>

      {/* Searching Spinner */}
      {searching && (
        <div className="flex flex-col items-center justify-center py-12 space-y-3">
          <Loader2 className="animate-spin text-emerald-500" size={40} />
          <p className="text-slate-500 dark:text-zinc-400 font-medium animate-pulse">Buscando viaje...</p>
        </div>
      )}

      {/* Not Found Alert */}
      {!searching && notFound && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-6 flex items-start gap-4">
          <div className="p-2.5 bg-amber-100 dark:bg-amber-900/30 rounded-xl shrink-0">
            <AlertTriangle size={24} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="text-base font-black text-amber-800 dark:text-amber-300">
              Viaje no encontrado
            </h3>
            <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
              No se encontró ningún viaje asociado al CTG <strong className="font-mono">"{ctgInput}"</strong>. 
              Verificá que el número sea correcto e intentá nuevamente.
            </p>
          </div>
        </div>
      )}

      {/* Empty State (before first search) */}
      {!searching && !hasSearched && (
        <div className="flex flex-col items-center justify-center py-16 space-y-4 text-center">
          <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center">
            <Package size={40} className="text-slate-300 dark:text-zinc-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-slate-400 dark:text-zinc-500">
              Ingresá un CTG para buscar
            </p>
            <p className="text-sm text-slate-300 dark:text-zinc-600 mt-1">
              Los resultados aparecerán aquí
            </p>
          </div>
        </div>
      )}

      {/* Result Card */}
      {!searching && load && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-sm overflow-hidden">
          {/* Card Header */}
          <div className="p-5 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <FileText size={20} />
              </div>
              <div>
                <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                  Viaje CTG
                </span>
                <span className="text-lg font-black text-slate-900 dark:text-white font-mono">
                  {load.ctg || ctgInput}
                </span>
              </div>
            </div>
            <Badge variant={getStatusVariant(load.status)} size="sm">
              {getStatusLabel(load.status)}
            </Badge>
          </div>

          {/* Card Body */}
          <div className="p-5 space-y-5">
            {/* Data Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Transportista */}
              <div className="flex items-center gap-3 p-3.5 bg-slate-50 dark:bg-zinc-800/40 rounded-xl border border-slate-100 dark:border-zinc-800">
                <div className="p-2.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl shrink-0">
                  <Building size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">
                    Transportista
                  </span>
                  <span className="text-sm font-bold text-slate-800 dark:text-zinc-200 truncate block">
                    {load.carrier?.name || 'No asignado'}
                  </span>
                </div>
              </div>

              {/* Kilogramos Descargados */}
              <div className="flex items-center gap-3 p-3.5 bg-slate-50 dark:bg-zinc-800/40 rounded-xl border border-slate-100 dark:border-zinc-800">
                <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
                  <Scale size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">
                    Kg Descargados
                  </span>
                  <span className="text-sm font-bold text-slate-800 dark:text-zinc-200 block">
                    {load.unloadedWeight ? formatWeight(load.unloadedWeight) : 'Pendiente'}
                  </span>
                </div>
              </div>

              {/* Tarifa */}
              <div className="flex items-center gap-3 p-3.5 bg-slate-50 dark:bg-zinc-800/40 rounded-xl border border-slate-100 dark:border-zinc-800">
                <div className="p-2.5 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded-xl shrink-0">
                  <DollarSign size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">
                    Tarifa
                  </span>
                  <span className="text-sm font-bold text-slate-800 dark:text-zinc-200 block">
                    {load.rate ? formatCurrency(load.rate) : 'No definida'}
                  </span>
                </div>
              </div>

              {/* Ruta */}
              {(load.origin || load.destination) && (
                <div className="flex items-center gap-3 p-3.5 bg-slate-50 dark:bg-zinc-800/40 rounded-xl border border-slate-100 dark:border-zinc-800">
                  <div className="p-2.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl shrink-0">
                    <Package size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">
                      Ruta
                    </span>
                    <span className="text-sm font-bold text-slate-800 dark:text-zinc-200 truncate block">
                      {load.origin || '?'} → {load.destination || '?'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Download Invoice Button */}
            {load.invoiceId && (
              <div className="pt-3 border-t border-slate-100 dark:border-zinc-800">
                <Button
                  variant="primary"
                  icon={Download}
                  onClick={handleDownloadInvoice}
                  isLoading={downloading}
                  className="w-full justify-center py-3"
                >
                  Descargar Comprobante
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ControlViajesPage;
