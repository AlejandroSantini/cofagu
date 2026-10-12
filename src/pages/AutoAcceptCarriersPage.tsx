import React, { useEffect, useState } from 'react';
import { carrierService } from '../api/services';
import { type Carrier } from '../types';
import { getErrorMessage } from '../api/errorUtils';
import { PageHeader } from '../components/ui/PageHeader';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Switch } from '../components/ui/Switch';
import { SearchInput } from '../components/ui/SearchInput';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { Toast } from '../components/ui/Toast';
import { useToast } from '../hooks/useToast';
import { X } from 'lucide-react';

export const AutoAcceptCarriersPage: React.FC = () => {
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'TRUE' | 'FALSE'>('ALL');
  const [page, setPage] = useState(1);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  // Paginación/búsqueda 100% server-side (search/page/limit/autoAccept se
  // mandan siempre) — ver CLAUDE.md, "Buscadores y filtros": sin filtro de
  // respaldo client-side, se muestra exactamente lo que devuelve el
  // backend.
  const [paginationInfo, setPaginationInfo] = useState<{ total: number; page: number; limit: number } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);

  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Comparamos contra los valores anteriores (no un simple flag de "primera
  // corrida") porque bajo StrictMode (dev) React re-ejecuta este efecto una
  // vez de más al montar con los MISMOS valores — un flag booleano queda mal
  // seteado por esa repetición fantasma y termina disparando un refetch de
  // más con la búsqueda todavía vacía, lo que puede pisar el resultado ya
  // filtrado si esa respuesta vieja resuelve después.
  const prevFiltersRef = React.useRef({ debouncedSearchTerm, statusFilter });
  useEffect(() => {
    const prev = prevFiltersRef.current;
    prevFiltersRef.current = { debouncedSearchTerm, statusFilter };
    if (prev.debouncedSearchTerm === debouncedSearchTerm && prev.statusFilter === statusFilter) {
      return;
    }
    setPage(1);
    setSelectedIds(new Set());
    setRefreshTrigger((n) => n + 1);
  }, [debouncedSearchTerm, statusFilter]);

  // Pedido directo (lote, etc.) — no compite con el efecto de abajo, así que
  // no necesita guarda contra respuestas obsoletas.
  const fetchCarriers = async (targetPage: number = page) => {
    try {
      const res = await carrierService.getCarriers({
        page: targetPage,
        limit: 20,
        search: debouncedSearchTerm.trim() || undefined,
        autoAccept: statusFilter === 'ALL' ? undefined : statusFilter === 'TRUE',
      });
      if (res.data.success) {
        setCarriers(res.data.data);
        setPaginationInfo(
          res.data.pagination
            ? {
                total: res.data.pagination.total,
                page: res.data.pagination.page ?? targetPage,
                limit: res.data.pagination.limit ?? 20,
              }
            : null,
        );
      }
    } catch (err) {
      showToast(getErrorMessage(err, 'Error al cargar los transportistas.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  // React (en dev, por StrictMode) puede disparar este efecto más de una vez
  // seguida, y con el debounce de la búsqueda puede haber un fetch viejo
  // (sin search) todavía en vuelo cuando ya se pidió uno nuevo (con search).
  // Si el viejo resuelve después, pisaría la lista filtrada con la vieja —
  // por eso la guarda `ignore` descarta cualquier respuesta que ya no
  // corresponda a este efecto.
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await carrierService.getCarriers({
          page,
          limit: 20,
          search: debouncedSearchTerm.trim() || undefined,
          autoAccept: statusFilter === 'ALL' ? undefined : statusFilter === 'TRUE',
        });
        if (ignore) return;
        if (res.data.success) {
          setCarriers(res.data.data);
          setPaginationInfo(
            res.data.pagination
              ? {
                  total: res.data.pagination.total,
                  page: res.data.pagination.page ?? page,
                  limit: res.data.pagination.limit ?? 20,
                }
              : null,
          );
        }
      } catch (err) {
        if (!ignore) showToast(getErrorMessage(err, 'Error al cargar los transportistas.'), 'error');
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, refreshTrigger]);

  const handleToggle = async (carrier: Carrier, next: boolean) => {
    setTogglingId(carrier.id);
    // Optimistic update.
    setCarriers((prev) => prev.map((c) => (c.id === carrier.id ? { ...c, autoAccept: next } : c)));
    try {
      const res = await carrierService.setAutoAccept(carrier.id, next);
      if (res.data.success) {
        showToast(
          next
            ? `${carrier.name}: postulaciones automáticas activadas.`
            : `${carrier.name}: vuelve a requerir aprobación manual.`,
        );
      }
    } catch (err) {
      // Revertir el optimistic update si falló.
      setCarriers((prev) => prev.map((c) => (c.id === carrier.id ? { ...c, autoAccept: !next } : c)));
      showToast(getErrorMessage(err, 'Error al actualizar la auto-aceptación.'), 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const toggleSelected = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allVisibleSelected = carriers.length > 0 && carriers.every((c) => selectedIds.has(c.id));
  const toggleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      if (allVisibleSelected) {
        const next = new Set(prev);
        carriers.forEach((c) => next.delete(c.id));
        return next;
      }
      const next = new Set(prev);
      carriers.forEach((c) => next.add(c.id));
      return next;
    });
  };

  const handleBatch = async (autoAccept: boolean) => {
    if (selectedIds.size === 0) return;
    setBatchLoading(true);
    try {
      const ids = Array.from(selectedIds);
      const res = await carrierService.setAutoAcceptBatch(ids, autoAccept);
      if (res.data.success) {
        showToast(
          `${res.data.data.updatedCount} transportista(s) actualizados a ${autoAccept ? 'automática' : 'manual'}.`,
        );
        setSelectedIds(new Set());
        setLoading(true);
        await fetchCarriers(page);
      }
    } catch (err) {
      showToast(getErrorMessage(err, 'Error al actualizar en lote.'), 'error');
    } finally {
      setBatchLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <Toast message={toast.message} isVisible={toast.isVisible} onClose={hideToast} type={toast.type} />

      <div className="mb-8">
        <PageHeader title="Postulaciones Automáticas" />
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-md border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 flex-1">
            <SearchInput
              containerClassName="w-full sm:w-64"
              placeholder="Buscar por nombre, CUIT, email o teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="w-full sm:w-56">
              <Select
                options={[
                  { value: 'ALL', label: 'Todos' },
                  { value: 'TRUE', label: 'Auto-aceptados' },
                  { value: 'FALSE', label: 'Manuales' },
                ]}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'TRUE' | 'FALSE')}
              />
            </div>
          </div>
          <span className="shrink-0 text-xs bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 px-3 py-1 rounded-full font-bold">
            Total: {paginationInfo?.total ?? carriers.length}
          </span>
        </div>

        <Table
          columns={[
            {
              header: '',
              className: 'w-10',
              render: (c: Carrier) => (
                <input
                  type="checkbox"
                  checked={selectedIds.has(c.id)}
                  onChange={() => toggleSelected(c.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
              ),
            },
            {
              header: 'Nombre / Razón Social',
              render: (c: Carrier) => <span className="font-bold text-slate-900 dark:text-white">{c.name}</span>,
            },
            {
              header: 'CUIT',
              render: (c: Carrier) => (
                <span className="font-mono text-sm text-slate-600 dark:text-zinc-400 whitespace-nowrap">{c.cuit}</span>
              ),
            },
            {
              header: 'Teléfono',
              render: (c: Carrier) => (
                <span className="text-slate-600 dark:text-zinc-400 whitespace-nowrap">{c.contactPhone}</span>
              ),
            },
            {
              header: 'Estado',
              render: (c: Carrier) =>
                c.autoAccept ? (
                  <Badge variant="success">Automática</Badge>
                ) : (
                  <Badge variant="neutral">Manual</Badge>
                ),
            },
            {
              header: 'Auto-aceptar',
              className: 'w-28',
              render: (c: Carrier) => (
                <div onClick={(e) => e.stopPropagation()}>
                  <Switch
                    checked={!!c.autoAccept}
                    disabled={togglingId === c.id}
                    onChange={(next) => handleToggle(c, next)}
                    label={`Auto-aceptar postulaciones de ${c.name}`}
                  />
                </div>
              ),
            },
          ]}
          data={carriers}
          isLoading={loading}
          emptyMessage="No se encontraron transportistas."
          pagination={
            paginationInfo
              ? { total: paginationInfo.total, page, onPageChange: (p) => setPage(p) }
              : { total: carriers.length, page: 1, onPageChange: () => {} }
          }
          itemsPerPage={paginationInfo ? paginationInfo.limit : Math.max(carriers.length, 1)}
        />

        {carriers.length > 0 && (
          <label className="px-4 sm:px-6 py-3 border-t border-slate-100 dark:border-zinc-800 flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={toggleSelectAllVisible}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
            <span className="text-xs font-bold text-slate-500 dark:text-zinc-400">
              Seleccionar todos los visibles ({carriers.length})
            </span>
          </label>
        )}
      </div>

      {selectedIds.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-lg rounded-md px-4 py-3 flex flex-wrap items-center gap-3 w-[calc(100%-2rem)] max-w-xl">
          <span className="text-sm font-bold text-slate-700 dark:text-zinc-300 whitespace-nowrap">
            {selectedIds.size} seleccionado{selectedIds.size !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-2 flex-1 flex-wrap justify-end">
            <Button
              variant="outline"
              size="sm"
              isLoading={batchLoading}
              onClick={() => handleBatch(true)}
            >
              Habilitar automática
            </Button>
            <Button
              variant="outline"
              size="sm"
              isLoading={batchLoading}
              onClick={() => handleBatch(false)}
            >
              Deshabilitar automática
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={X}
              onClick={() => setSelectedIds(new Set())}
              title="Cancelar selección"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AutoAcceptCarriersPage;
