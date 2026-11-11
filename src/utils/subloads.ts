import { type Load } from '../types';

// Sub-loads que ya no ocupan el camión en el viaje.
const RELEASED = new Set<string>(['CANCELLED', 'REJECTED']);

interface ApplicationLike {
  id?: number | string;
  status?: string;
  carrierId?: number | null;
  truckId?: number | null;
  truck?: { id?: number } | null;
}

/**
 * Sub-load (`trip.loads[]`) que corresponde a una postulación.
 *
 * Las postulaciones no traen `loadId` (viene null), así que se cruzan por
 * transportista + camión. Pero el mismo camión puede tener varias cargas en
 * el mismo viaje: caso real (viaje 520, DIM945, 2026-11-11) — la primera
 * postulación se canceló por rotura (sub-load 1096 CANCELLED) y volvió a
 * postularse (sub-load 1118 IN_PROGRESS con CTG). Quedarse con la primera
 * coincidencia mostraba al transportista "Asignado, esperando CTG" y los
 * kilos de descarga iban a la carga cancelada. Se prefiere la carga vigente
 * y, entre varias, la más nueva.
 */
export function findSubloadForApplication(
  loads: Load[] | undefined,
  app: ApplicationLike,
): Load | undefined {
  if (!loads?.length) return undefined;
  const truckId = app.truckId ?? app.truck?.id;
  const matches = loads.filter(
    (l) => l.carrierId === app.carrierId && l.truckId === truckId,
  );
  if (matches.length <= 1) return matches[0];
  const byNewest = [...matches].sort((a, b) => Number(b.id) - Number(a.id));
  // Una postulación cancelada/rechazada va con su carga liberada; el resto,
  // con la que sigue en curso.
  const wantReleased = app.status === 'CANCELLED' || app.status === 'REJECTED';
  return (
    byNewest.find((l) => RELEASED.has(l.status as string) === wantReleased) ?? byNewest[0]
  );
}
