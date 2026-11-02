import { type Application, type Load } from '../types';

// Estados de sub-load que NO ocupan cupo. Mismo criterio que el backend al
// validar POST /trips/:id/apply: cuposLibres = maxTrucks - loads con status
// distinto de CANCELLED y REJECTED.
const RELEASED_STATUSES = new Set<string>(['CANCELLED', 'REJECTED']);

/**
 * Cupos libres de un viaje. Si el backend ya manda `cuposPendientes`, ese es
 * el dato que vale. Si no, se calcula igual que el backend a partir de
 * `loads`; y si tampoco vienen (listados), con las postulaciones aceptadas.
 */
export function getFreeSlots(load: Load): number {
  if (load.cuposPendientes !== undefined && load.cuposPendientes !== null) {
    return Math.max(0, load.cuposPendientes);
  }
  const max = load.maxTrucks || 1;
  const occupied = load.loads
    ? load.loads.filter((l) => !RELEASED_STATUSES.has(l.status)).length
    : load.applications?.filter((a) => a.status === 'ACCEPTED').length || 0;
  return Math.max(0, max - occupied);
}

export const QUOTA_FULL_LABEL = 'Cupos completos';
export const QUOTA_FULL_MESSAGE = 'Postúlate a una nueva carga';

/**
 * La postulación quedó afuera porque el viaje completó sus cupos: el backend
 * la pasa a CANCELLED con motivo "Cupos completos…" (y manda
 * `statusLabel: 'Cupos completos'`). Mientras eso no corra, una PENDING en un
 * viaje sin cupos libres ya no tiene chance: se muestra igual, nunca como
 * "en revisión".
 */
export function isQuotaFullApplication(app: Application, load?: Load): boolean {
  if (app.statusLabel === QUOTA_FULL_LABEL) return true;
  if (app.status === 'CANCELLED') {
    // Mismo criterio que backend (2026-10-27): solo el motivo automático.
    // Un motivo cargado a mano que menciona "cupo" es una cancelación común.
    return !!app.cancellationReason?.trim().toLowerCase().startsWith('cupos completos');
  }
  if (app.status === 'PENDING') {
    if (app.isQuotaFull) return true;
    return !!load && load.status !== 'CANCELLED' && getFreeSlots(load) === 0;
  }
  return false;
}
