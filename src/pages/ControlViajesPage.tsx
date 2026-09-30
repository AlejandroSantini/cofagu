import React, { useEffect, useState } from 'react';
import { loadService, invoiceService } from '../api/services';
import { type Load } from '../types';
import { getErrorMessage } from '../api/errorUtils';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Table } from '../components/ui/Table';
import { SearchInput } from '../components/ui/SearchInput';
import { PageHeader } from '../components/ui/PageHeader';
import { Toast } from '../components/ui/Toast';
import { useToast } from '../hooks/useToast';
import { KgDifferenceWarning } from '../components/loads/KgDifferenceWarning';
import {
  FileText, Download
} from 'lucide-react';

export const ControlViajesPage: React.FC = () => {
  const [ctgInput, setCtgInput] = useState('');
  const [load, setLoad] = useState<Load | null>(null);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  // Búsqueda automática por CTG: mismo patrón de debounce que el resto de
  // la app (Grupos, Documentación, Playa, Combustible) — sin botón
  // "Buscar" aparte.
  const isFirstRun = React.useRef(true);
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    const trimmed = ctgInput.trim();
    if (!trimmed) {
      setLoad(null);
      setHasSearched(false);
      return;
    }
    let ignore = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      setHasSearched(true);
      try {
        const res = await loadService.getLoadByCTG(trimmed);
        if (!ignore) {
          setLoad(res.data.success && res.data.data ? res.data.data : null);
        }
      } catch (err: any) {
        if (!ignore) {
          if (err.response?.status === 404) {
            setLoad(null);
          } else {
            showToast(getErrorMessage(err, 'Error al buscar el viaje.'), 'error');
          }
        }
      } finally {
        if (!ignore) setSearching(false);
      }
    }, 300);
    return () => {
      ignore = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctgInput]);

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

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  const formatWeight = (value: number) =>
    new Intl.NumberFormat('es-AR').format(value) + ' kg';

  const rows = load ? [load] : [];
  const hasKgDifference =
    load?.loadedWeight != null &&
    load?.unloadedWeight != null &&
    Number(load.loadedWeight) > Number(load.unloadedWeight);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Toast message={toast.message} isVisible={toast.isVisible} onClose={hideToast} type={toast.type} />

      <PageHeader
        title="Control de Viajes"
        description="Busca un viaje por su número de CTG (Carta de Porte) para consultar datos y descargar comprobantes."
        icon={FileText}
      />

      {/* Búsqueda + tabla, mismo card */}
      <div className="bg-white dark:bg-zinc-900 rounded-md border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-zinc-800">
          <SearchInput
            containerClassName="w-full sm:w-80"
            placeholder="Buscar por CTG..."
            value={ctgInput}
            onChange={(e) => setCtgInput(e.target.value)}
            autoFocus
          />
        </div>
        <Table
          columns={[
            {
              header: 'CTG',
              render: (l: Load) => (
                <span className="font-mono font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                  {l.ctg}
                </span>
              ),
            },
            {
              header: 'Estado',
              render: (l: Load) => (
                <Badge variant={getStatusVariant(l.status)} size="sm">
                  {getStatusLabel(l.status)}
                </Badge>
              ),
            },
            {
              header: 'Transportista',
              render: (l: Load) => (
                <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-zinc-200">
                  {l.carrier?.name || 'No asignado'}
                </span>
              ),
            },
            {
              header: 'Ruta',
              render: (l: Load) => (
                <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-zinc-300 whitespace-nowrap">
                  {l.origin || '?'} → {l.destination || '?'}
                </span>
              ),
            },
            {
              header: 'Kg Origen',
              render: (l: Load) => (
                <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-zinc-200 whitespace-nowrap">
                  {l.loadedWeight != null ? formatWeight(l.loadedWeight) : 'S/I'}
                </span>
              ),
            },
            {
              header: 'Kg Descarga',
              render: (l: Load) => (
                <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-zinc-200 whitespace-nowrap">
                  {l.unloadedWeight != null ? formatWeight(l.unloadedWeight) : 'Pendiente'}
                </span>
              ),
            },
            {
              header: 'Diferencia',
              render: (l: Load) => {
                if (l.loadedWeight == null || l.unloadedWeight == null) {
                  return <span className="text-xs text-slate-400">—</span>;
                }
                const diff = Number(l.loadedWeight) - Number(l.unloadedWeight);
                if (diff <= 0) {
                  return <span className="text-xs text-slate-400">—</span>;
                }
                return (
                  <span className="text-xs sm:text-sm font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                    {formatWeight(diff)}
                  </span>
                );
              },
            },
            {
              header: 'Tarifa',
              render: (l: Load) => (
                <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-zinc-200 whitespace-nowrap">
                  {l.resolvedRate ?? l.rate
                    ? formatCurrency((l.resolvedRate ?? l.rate) as number)
                    : 'No definida'}
                </span>
              ),
            },
          ]}
          data={rows}
          isLoading={searching}
          emptyMessage={
            !hasSearched
              ? 'Ingresá un CTG para buscar'
              : 'No se encontró ningún viaje con ese CTG'
          }
        />
      </div>

      {load && hasKgDifference && (
        <KgDifferenceWarning
          loadedWeight={Number(load.loadedWeight)}
          unloadedWeight={Number(load.unloadedWeight)}
          adjusted={load.differenceAdjusted}
        />
      )}

      {load?.invoiceId && (
        <Button
          variant="primary"
          icon={Download}
          onClick={handleDownloadInvoice}
          isLoading={downloading}
          className="w-full justify-center py-3"
        >
          Descargar Comprobante
        </Button>
      )}

    </div>
  );
};

export default ControlViajesPage;
