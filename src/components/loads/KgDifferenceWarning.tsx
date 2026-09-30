import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';

interface KgDifferenceWarningProps {
  loadedWeight: number;
  unloadedWeight: number;
  adjusted?: boolean;
  /** Si se pasa, se muestra el botón para marcarlo ajustado (acción de escritura). */
  onMarkAdjusted?: () => void;
  isMarking?: boolean;
}

/**
 * Aviso informativo cuando el peso descargado quedó por debajo del cargado
 * en origen. No bloquea al transportista — la diferencia se cobra/ajusta en
 * su cuenta corriente. Usado en LoadDetails (Cargas y Viajes) y en Control
 * de Viajes (búsqueda por CTG).
 */
export const KgDifferenceWarning: React.FC<KgDifferenceWarningProps> = ({
  loadedWeight,
  unloadedWeight,
  adjusted,
  onMarkAdjusted,
  isMarking,
}) => {
  const difference = Number(loadedWeight) - Number(unloadedWeight);
  if (!(difference > 0)) return null;

  return (
    <div className="bg-amber-50 dark:bg-amber-950/20 p-5 rounded-md border border-amber-200 dark:border-amber-900/40 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-sm">
          <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400" />
          <span>
            Diferencia de Kilos Faltantes Detectada en Destino:{' '}
            {difference.toLocaleString('es-AR')} kg
          </span>
        </div>
        {adjusted ? (
          <span className="text-xs font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/40 px-2.5 py-1 rounded-sm">
            Ajustado en Cta. Cte.
          </span>
        ) : (
          <span className="text-xs font-bold text-amber-700 bg-amber-100 dark:bg-amber-950/40 px-2.5 py-1 rounded-sm">
            Pendiente de Ajuste
          </span>
        )}
      </div>
      <p className="text-xs text-amber-700 dark:text-amber-400">
        El peso descargado ({Number(unloadedWeight).toLocaleString('es-AR')} kg)
        es menor al cargado en origen (
        {Number(loadedWeight).toLocaleString('es-AR')} kg). Esto no bloquea al
        transportista — la diferencia se cobra/ajusta en su cuenta corriente.
      </p>

      {onMarkAdjusted && !adjusted && (
        <Button
          variant="outline"
          size="sm"
          className="border-emerald-600 text-emerald-700 hover:bg-emerald-50 text-xs font-bold"
          onClick={onMarkAdjusted}
          isLoading={isMarking}
        >
          Marcar como Ajustado / Facturado en Cuenta Corriente
        </Button>
      )}
    </div>
  );
};
