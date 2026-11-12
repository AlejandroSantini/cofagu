import { type Load } from '../types';

// Sub-loads que ya no ocupan el camión en el viaje.
const RELEASED = new Set<string>(['CANCELLED', 'REJECTED']);

interface ApplicationLike {
  id?: number | string;
  status?: string;
  loadId?: number | null;
  ctg?: string | null;
  carrierId?: number | null;
  truckId?: number | null;
  truck?: { id?: number } | null;
}

/**
 * Sub-load (`trip.loads[]`) que corresponde a una postulación.
 *
 * Primero por `loadId` (lo manda el backend desde 2026-11-11). Si no viene,
 * se cruzan por transportista + camión (y CTG si la hay). Pero el mismo camión puede tener varias cargas en
 * el mismo viaje: caso real (viaje 520, DIM945, 2026-11-11) — la primera
 * postulación se canceló por rotura (sub-load 1096 CANCELLED) y volvió a
 * postularse (sub-load 1118 IN_PROGRESS con CTG). Quedarse con la primera
 * coincidencia mostraba al transportista "Asignado, esperando CTG" y los
 * kilos de descarga iban a la carga cancelada. Otro caso real (viaje 526,
 * VGR816): el mismo camión hizo dos vueltas del viaje (1115 COMPLETED y 1138
 * IN_PROGRESS), las dos postulaciones ACCEPTED. Sin `loadId` se prefiere la
 * carga vigente y, entre varias, la más nueva.
 */
export function findSubloadForApplication(
  loads: Load[] | undefined,
  app: ApplicationLike,
): Load | undefined {
  if (!loads?.length) return undefined;
  // El backend ya manda `loadId` en cada postulación: es el dato exacto.
  if (app.loadId != null) {
    const byId = loads.find((l) => Number(l.id) === Number(app.loadId));
    if (byId) return byId;
  }
  const truckId = app.truckId ?? app.truck?.id;
  const matches = loads.filter(
    (l) => l.carrierId === app.carrierId && l.truckId === truckId,
  );
  if (matches.length <= 1) return matches[0];
  // Sin `loadId`: la CTG de la postulación identifica la carga si ya la tiene.
  if (app.ctg) {
    const byCtg = matches.find((l) => l.ctg === app.ctg);
    if (byCtg) return byCtg;
  }
  const byNewest = [...matches].sort((a, b) => Number(b.id) - Number(a.id));
  // Una postulación cancelada/rechazada va con su carga liberada; el resto,
  // con la que sigue en curso.
  const wantReleased = app.status === 'CANCELLED' || app.status === 'REJECTED';
  return (
    byNewest.find((l) => RELEASED.has(l.status as string) === wantReleased) ?? byNewest[0]
  );
}
