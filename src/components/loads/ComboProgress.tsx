import React, { useState } from 'react';
import { ArrowRight, CheckCircle, Clock, FileText, Scale, Truck } from 'lucide-react';
import { loadService } from '../../api/services';
import { getErrorMessage } from '../../api/errorUtils';
import { type ComboStage, type Load } from '../../types';
import { getComboStage } from '../../utils/combo';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { ErrorMessage } from '../ui/ErrorMessage';

/** Badge "Combo ida y vuelta" para listados y detalle. */
export const ComboBadge: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span
    className={`inline-flex items-center gap-1 whitespace-nowrap font-black uppercase tracking-wider rounded-sm px-2 py-0.5 text-[10px] bg-emerald-600 text-white ${className}`}
  >
    🔄 Combo ida y vuelta
  </span>
);

const STAGE_ORDER: ComboStage[] = ['LEG1_ASSIGNED', 'LEG1_IN_PROGRESS', 'LEG1_COMPLETED', 'LEG2_IN_PROGRESS', 'COMPLETED'];

const kg = (v: number | string | null | undefined) =>
  v != null && !isNaN(Number(v)) && Number(v) > 0 ? `${Number(v).toLocaleString('es-AR')} kg` : null;

type ActiveModal = 'leg1' | 'leg2' | 'complete' | null;

interface ComboProgressProps {
  /** Sub-load del camión (load.loads[] o GET /loads/:id). */
  subload: Load;
  /** Datos de los tramos (el viaje; en GET /loads/:id vienen en la carga misma). */
  trip: Pick<Load, 'origin' | 'destination' | 'cereal' | 'leg2Origin' | 'leg2Destination' | 'leg2Cargo'>;
  /** Registrar descarga del tramo 1 e ingresar remito (transportista / logística / admin). */
  canOperateLegs: boolean;
  /** Registrar el pesaje de llegada que cierra el combo (balanza / admin; backend también lo permite al transportista). */
  canCompleteAtScale: boolean;
  onUpdated: (message: string) => void | Promise<void>;
}

export const ComboProgress: React.FC<ComboProgressProps> = ({
  subload,
  trip,
  canOperateLegs,
  canCompleteAtScale,
  onUpdated,
}) => {
  const stage = getComboStage(subload);
  const stageIdx = STAGE_ORDER.indexOf(stage);
  const leg1Done = stageIdx >= STAGE_ORDER.indexOf('LEG1_COMPLETED');
  const leg2Started = stageIdx >= STAGE_ORDER.indexOf('LEG2_IN_PROGRESS');
  const leg2Cargo = trip.leg2Cargo || 'Carga de vuelta';
  const leg2Destination = trip.leg2Destination || 'Cooperativa';

  const [modal, setModal] = useState<ActiveModal>(null);
  const [weight, setWeight] = useState('');
  const [remito, setRemito] = useState('');
  const [mileage, setMileage] = useState('');
  const [fuel, setFuel] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const open = (m: ActiveModal) => {
    setWeight('');
    setRemito('');
    setMileage('');
    setFuel('');
    setNotes('');
    setError('');
    setModal(m);
  };

  const weightNum = Number(weight);
  const weightValid = weight.trim() !== '' && !isNaN(weightNum) && weightNum > 0;
  const confirmDisabled =
    modal === 'leg2' ? !remito.trim() || (weight.trim() !== '' && !weightValid) : !weightValid;

  const submit = async () => {
    if (confirmDisabled) return;
    setSaving(true);
    setError('');
    try {
      const trimmedNotes = notes.trim() || undefined;
      if (modal === 'leg1') {
        await loadService.completeComboLeg1(subload.id, { unloadedWeight: weightNum, notes: trimmedNotes });
        setModal(null);
        await onUpdated('Descarga del tramo 1 registrada. Falta ingresar el remito de la vuelta.');
      } else if (modal === 'leg2') {
        await loadService.startComboLeg2(subload.id, {
          remito: remito.trim(),
          loadedWeight: weightValid ? weightNum : undefined,
          notes: trimmedNotes,
        });
        setModal(null);
        await onUpdated(`Remito registrado. El camión vuelve hacia ${leg2Destination}.`);
      } else if (modal === 'complete') {
        await loadService.completeCombo(subload.id, {
          unloadedWeight: weightNum,
          mileage: mileage.trim() ? Number(mileage) : undefined,
          fuelConsumption: fuel.trim() ? Number(fuel) : undefined,
          notes: trimmedNotes,
        });
        setModal(null);
        await onUpdated('Combo completado. El camión quedó libre.');
      }
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo registrar el paso del combo.'));
    } finally {
      setSaving(false);
    }
  };

  const leg1Status = leg1Done
    ? `Descargado en destino${kg(subload.unloadedWeight) ? ` · ${kg(subload.unloadedWeight)}` : ''}`
    : stage === 'LEG1_IN_PROGRESS'
      ? `En viaje hacia ${trip.destination}`
      : 'Esperando carga y CTG en balanza';
  const leg2Status =
    stage === 'COMPLETED'
      ? `Descargado en ${leg2Destination}${kg(subload.leg2UnloadedWeight) ? ` · ${kg(subload.leg2UnloadedWeight)}` : ''}`
      : stage === 'LEG2_IN_PROGRESS'
        ? `En viaje hacia ${leg2Destination} con ${leg2Cargo}`
        : stage === 'LEG1_COMPLETED'
          ? 'Ingresar remito para iniciar la vuelta'
          : 'Pendiente';

  const stepClass = (done: boolean, current: boolean) =>
    done
      ? 'border-emerald-500/30 bg-emerald-500/10'
      : current
        ? 'border-amber-500/40 bg-amber-500/10'
        : 'border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900';

  return (
    <div className="space-y-2" data-testid="combo-progress">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-stretch gap-2">
        <div className={`p-2.5 rounded-sm border text-xs space-y-1 ${stepClass(leg1Done, !leg1Done)}`}>
          <span className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Tramo 1 · Ida
          </span>
          <span className="block font-bold text-slate-800 dark:text-zinc-200">
            {trip.cereal || 'Cereal'} → {trip.destination}
          </span>
          <span className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-zinc-300">
            {leg1Done ? <CheckCircle size={12} className="text-emerald-600 shrink-0" /> : <Clock size={12} className="text-amber-600 shrink-0" />}
            {leg1Status}
          </span>
        </div>
        <div className="hidden sm:flex items-center text-slate-400">
          <ArrowRight size={16} />
        </div>
        <div className={`p-2.5 rounded-sm border text-xs space-y-1 ${stepClass(stage === 'COMPLETED', leg1Done && stage !== 'COMPLETED')}`}>
          <span className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Tramo 2 · Vuelta
          </span>
          <span className="block font-bold text-slate-800 dark:text-zinc-200">
            {leg2Cargo} → {leg2Destination}
          </span>
          <span className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-zinc-300">
            {stage === 'COMPLETED' ? (
              <CheckCircle size={12} className="text-emerald-600 shrink-0" />
            ) : (
              <Clock size={12} className={`shrink-0 ${leg1Done ? 'text-amber-600' : 'text-slate-400'}`} />
            )}
            {leg2Status}
          </span>
          {leg2Started && subload.leg2Remito && (
            <span className="block font-mono text-slate-600 dark:text-zinc-300">Remito: {subload.leg2Remito}</span>
          )}
        </div>
      </div>

      {stage === 'LEG1_IN_PROGRESS' && canOperateLegs && (
        <Button variant="primary" size="sm" icon={Scale} className="w-full font-bold" onClick={() => open('leg1')}>
          Registrar descarga en destino
        </Button>
      )}
      {stage === 'LEG1_COMPLETED' && canOperateLegs && (
        <Button variant="primary" size="sm" icon={FileText} className="w-full font-bold" onClick={() => open('leg2')}>
          Ingresar remito y salir a {leg2Destination}
        </Button>
      )}
      {stage === 'LEG2_IN_PROGRESS' && canCompleteAtScale && (
        <Button variant="primary" size="sm" icon={Truck} className="w-full font-bold" onClick={() => open('complete')}>
          Registrar llegada y descarga en balanza
        </Button>
      )}

      <Modal
        isOpen={modal !== null}
        onClose={() => !saving && setModal(null)}
        onConfirm={submit}
        isLoading={saving}
        isConfirmDisabled={confirmDisabled}
        type="info"
        title={
          modal === 'leg1'
            ? 'Descarga del tramo 1'
            : modal === 'leg2'
              ? 'Remito de la vuelta'
              : 'Llegada y descarga final'
        }
        description={
          modal === 'leg1'
            ? `Kilos de ${trip.cereal || 'cereal'} descargados en ${trip.destination}.`
            : modal === 'leg2'
              ? `Número de remito de ${leg2Cargo}. Con esto arranca la vuelta hacia ${leg2Destination}.`
              : `Pesaje en balanza de ${leg2Cargo} al llegar a ${leg2Destination}. Cierra el combo y libera el camión.`
        }
        confirmText={modal === 'leg2' ? 'Iniciar vuelta' : 'Confirmar'}
      >
        <div className="space-y-4 pt-2">
          <ErrorMessage message={error} />
          {modal === 'leg2' && (
            <Input
              label="Número de remito (obligatorio)"
              placeholder="Ej: 0001-00045231"
              value={remito}
              onChange={(e) => setRemito(e.target.value)}
              icon={FileText}
            />
          )}
          <Input
            label={
              modal === 'leg2'
                ? 'Kilos cargados (opcional)'
                : modal === 'leg1'
                  ? 'Kilos descargados (obligatorio)'
                  : 'Kilos descargados en balanza (obligatorio)'
            }
            type="number"
            min="1"
            step="any"
            placeholder="Ej: 29650"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            icon={Scale}
          />
          {modal === 'complete' && (
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Kilómetros (opcional)"
                type="number"
                min="1"
                value={mileage}
                onChange={(e) => setMileage(e.target.value)}
              />
              <Input
                label="Combustible lts (opcional)"
                type="number"
                min="0"
                value={fuel}
                onChange={(e) => setFuel(e.target.value)}
              />
            </div>
          )}
          <Input
            label="Observaciones (opcional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
};
