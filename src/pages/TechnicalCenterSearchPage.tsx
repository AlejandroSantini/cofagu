import React, { useState, useEffect } from 'react';
import { Search, MapPin, Truck, Phone, Package } from 'lucide-react';
import { loadService } from '../api/services';
import type { TechnicalCenterSearchResult } from '../types';
import { Badge } from '../components/ui/Badge';
import { Table } from '../components/ui/Table';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

export const TruckType = {
  BATEA: 'BATEA',
  TOLVA: 'TOLVA',
  CHASIS_Y_ACOPLADO: 'CHASIS_Y_ACOPLADO',
  SEMI: 'SEMI',
  SEMI_TOLVA: 'SEMI_TOLVA'
} as const;

export const TRUCK_TYPE_LABELS: Record<string, string> = {
  [TruckType.BATEA]: 'Batea',
  [TruckType.TOLVA]: 'Tolva',
  [TruckType.CHASIS_Y_ACOPLADO]: 'Chasis y Acoplado',
  [TruckType.SEMI]: 'Semi',
  [TruckType.SEMI_TOLVA]: 'Semi Tolva'
};

export const TechnicalCenterSearchPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<TechnicalCenterSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedTruckType, setSelectedTruckType] = useState<string>('ALL');
  const navigate = useNavigate();
  const user = useAuthStore(state => state.user);

  const filteredResults = results.filter(item => selectedTruckType === 'ALL' || item.truckType === selectedTruckType);

  const handleSearch = async (query: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await loadService.searchTechnicalCenterLoads(query);
      if (response.data?.data) {
        setResults(response.data.data);
      }
      setHasSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al buscar camiones');
    } finally {
      setLoading(false);
    }
  };

  // Redirigir si no tiene permisos
  useEffect(() => {
    if (user && user.role !== 'TECHNICAL_CENTER' && user.role !== 'ADMIN') {
      navigate('/');
    }
  }, [user, navigate]);

  // Hacer la búsqueda inicial para cargar todos (si se quiere, o esperar a que tipeen)
  useEffect(() => {
    handleSearch('');
  }, []);

  // Debounce simple para la búsqueda
  useEffect(() => {
    const handler = setTimeout(() => {
      handleSearch(search);
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS': return 'primary';
      case 'COMPLETED': return 'success';
      case 'ASSIGNED': return 'info';
      case 'CANCELLED': return 'neutral';
      default: return 'neutral';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS': return 'EN VIAJE';
      case 'COMPLETED': return 'COMPLETADO';
      case 'ASSIGNED': return 'ASIGNADO';
      case 'CANCELLED': return 'CANCELADO';
      default: return status;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Buscador de Camiones</h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">Centro Agrotécnico - Búsqueda por patente, tipo o transportista</p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-200 dark:border-zinc-800 p-4 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por patente o transportista..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl pl-12 pr-4 py-4 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
            />
          </div>
          <select
            value={selectedTruckType}
            onChange={(e) => setSelectedTruckType(e.target.value)}
            className="bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-4 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none sm:min-w-[200px]"
          >
            <option value="ALL">Todos los tipos</option>
            {Object.entries(TRUCK_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      {loading && !results.length && (
        <div className="flex justify-center p-8">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {!loading && hasSearched && filteredResults.length === 0 && !error && (
        <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800">
          <Truck size={48} className="mx-auto text-slate-300 dark:text-zinc-600 mb-4" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-white">No se encontraron resultados</h3>
          <p className="text-slate-500 dark:text-zinc-400 mt-2 max-w-sm mx-auto">
            {search ? `No hay camiones cargados hoy que coincidan con "${search}".` : "No hay camiones de este tipo."}
          </p>
        </div>
      )}

      {filteredResults.length > 0 && (
        <Table
          columns={[
            {
              header: 'Patente',
              render: (item: TechnicalCenterSearchResult) => (
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-zinc-700 w-fit">
                    {item.plate}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                    <Truck size={10} />
                    {item.truckType ? item.truckType.replace(/_/g, ' ') : 'S/D'}
                  </span>
                </div>
              )
            },
            {
              header: 'Destino',
              render: (item: TechnicalCenterSearchResult) => (
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-slate-400" />
                  <span className="text-sm font-semibold text-slate-800 dark:text-zinc-200">{item.destination || 'N/D'}</span>
                </div>
              )
            },
            {
              header: 'Transportista',
              render: (item: TechnicalCenterSearchResult) => (
                <div className="flex items-center gap-2">
                  <Package size={14} className="text-slate-400" />
                  <span className="text-sm font-semibold text-slate-800 dark:text-zinc-200">{item.carrierName || 'N/D'}</span>
                </div>
              )
            },
            {
              header: 'Chofer',
              render: (item: TechnicalCenterSearchResult) => (
                <div className="flex items-center justify-between gap-3 min-w-[160px]">
                  <span className="text-sm font-semibold text-slate-800 dark:text-zinc-200 line-clamp-2">
                    {item.driverName || 'N/D'}
                  </span>
                  {item.driverPhone && (
                    <a
                      href={`tel:${item.driverPhone}`}
                      className="inline-flex shrink-0 items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 rounded-lg text-xs font-bold hover:bg-emerald-200 dark:hover:bg-emerald-900/60 transition-colors"
                    >
                      <Phone size={14} className="fill-current shrink-0" />
                      Llamar
                    </a>
                  )}
                </div>
              )
            },
            {
              header: 'CTG',
              render: (item: TechnicalCenterSearchResult) => (
                item.ctg ? (
                  <span className="text-sm font-mono font-bold text-slate-800 dark:text-zinc-200 bg-slate-50 dark:bg-zinc-800 px-2 py-1 rounded-md border border-slate-200 dark:border-zinc-700">
                    {item.ctg}
                  </span>
                ) : <span className="text-slate-400 text-sm">-</span>
              )
            },
            {
              header: 'Estado',
              render: (item: TechnicalCenterSearchResult) => (
                <Badge variant={getStatusBadgeVariant(item.status)}>
                  {getStatusLabel(item.status)}
                </Badge>
              )
            }
          ]}
          data={filteredResults}
          isLoading={loading}
        />
      )}
    </div>
  );
};
