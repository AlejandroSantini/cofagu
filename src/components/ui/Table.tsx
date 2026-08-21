import React from 'react';
import { Loader2 } from 'lucide-react';

interface Column<T> {
  header: string;
  render: (item: T) => React.ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
}

export function Table<T>({ 
  columns, 
  data, 
  isLoading, 
  emptyMessage = "No hay registros disponibles.",
  onRowClick,
  itemsPerPage = 10,
  pagination
}: TableProps<T> & { itemsPerPage?: number, pagination?: { total: number, page: number, onPageChange: (p: number) => void } }) {
  const [localPage, setLocalPage] = React.useState(1);
  
  const isServerSide = !!pagination;
  const currentPage = isServerSide ? pagination.page : localPage;
  const totalItems = isServerSide ? pagination.total : data.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      if (isServerSide) {
        pagination.onPageChange(newPage);
      } else {
        setLocalPage(newPage);
      }
    }
  };

  const displayedData = isServerSide 
    ? data 
    : data.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-zinc-800/50 border-b border-slate-200 dark:border-zinc-800">
              {columns.map((col, idx) => (
                <th 
                  key={idx} 
                  className={`px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider ${col.className || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="animate-spin text-emerald-600" size={24} />
                    <p className="text-sm font-medium italic">Cargando datos...</p>
                  </div>
                </td>
              </tr>
            ) : displayedData.length > 0 ? (
              displayedData.map((item, rowIdx) => (
                <tr 
                  key={(item as any).id ?? rowIdx} 
                  onClick={() => onRowClick?.(item)}
                  className={`
                    transition-colors group
                    ${onRowClick ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800/50' : 'hover:bg-slate-50/50 dark:hover:bg-zinc-800/20'}
                  `}
                >
                  {columns.map((col, colIdx) => (
                    <td 
                      key={colIdx} 
                      className={`px-6 py-4 ${col.className || ''}`}
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (target.closest('button') || target.closest('a')) {
                          e.stopPropagation();
                        }
                      }}
                    >
                      {col.render(item)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-6 py-20 text-center text-slate-400 italic">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination Footer */}
      {!isLoading && (
        <div className="px-4 sm:px-6 py-4 border-t border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/30 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-0">
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium text-center sm:text-left">
            Total: <span className="font-bold text-slate-700 dark:text-slate-200">{totalItems}</span> registros
          </p>
          <div className="flex items-center justify-center gap-1 sm:gap-2 w-full sm:w-auto">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1 || totalItems === 0}
              className="px-3 sm:px-4 py-2 rounded-lg border border-slate-200 dark:border-zinc-700 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:!cursor-not-allowed transition-colors"
            >
              Anterior
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }).map((_, i) => {
                const p = i + 1;
                // Simple windowing
                if (
                  p === 1 || 
                  p === totalPages || 
                  (p >= currentPage - 1 && p <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={p}
                      onClick={() => handlePageChange(p)}
                      className={`w-8 h-8 rounded-lg text-sm font-bold transition-colors ${
                        currentPage === p
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-700'
                      }`}
                    >
                      {p}
                    </button>
                  );
                }
                if (p === currentPage - 2 || p === currentPage + 2) {
                  return <span key={p} className="text-slate-400">...</span>;
                }
                return null;
              })}
            </div>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages || totalItems === 0}
              className="px-3 sm:px-4 py-2 rounded-lg border border-slate-200 dark:border-zinc-700 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:!cursor-not-allowed transition-colors"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
