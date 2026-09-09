/**
 * Cliente REST directo contra el backend real (sin browser) para:
 *   · obtener tokens reales por rol (login)
 *   · descubrir los datos seed (transportista / chofer / camión)
 *   · sembrar viajes en el estado que cada spec necesita
 *
 * La UI se prueba en los `.spec.ts`; acá solo se prepara el terreno vía API,
 * que es más rápido y estable que manejar 4 roles por pantalla.
 */
import { request, type APIRequestContext } from '@playwright/test';
import { API_URL, PREFIX, credential, seedOverrides, type E2ERole } from './env';

export interface Session {
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    carrierId?: number | null;
    mustChangePassword?: boolean;
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any -- helper de tests: las respuestas del backend no están tipadas acá */

const unwrap = (body: any) =>
  body && typeof body === 'object' && 'data' in body ? body.data : body;

/**
 * URL absoluta. No usamos `baseURL` de Playwright porque un path con `/` inicial
 * se resuelve como absoluto y se come el `/api` de la base (→ 404).
 */
const url = (path: string) => `${API_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;

/** Login real. Lanza si faltan credenciales o el backend rechaza. */
export async function login(role: E2ERole): Promise<Session> {
  const cred = credential(role);
  if (!cred) throw new Error(`Sin credenciales para ${role} en .env.e2e`);

  const ctx = await request.newContext();
  try {
    const res = await ctx.post(url('/users/login'), {
      data: { email: cred.email, password: cred.password },
    });
    if (!res.ok()) {
      throw new Error(`Login ${role} falló (HTTP ${res.status()}): ${await res.text()}`);
    }
    const data = unwrap(await res.json());
    if (!data?.token) throw new Error(`Login ${role} sin token en la respuesta`);
    if (data.user?.mustChangePassword) {
      throw new Error(
        `La cuenta ${role} (${cred.email}) tiene mustChangePassword=true; ` +
          `cambiá la contraseña una vez a mano antes de correr la suite.`,
      );
    }
    if (data.user?.role && data.user.role !== role) {
      throw new Error(
        `La cuenta de ${role} (${cred.email}) tiene rol ${data.user.role} en el backend. ` +
          `Usá una cuenta con rol ${role} o corregí el .env.e2e.`,
      );
    }
    return { token: data.token, user: data.user };
  } finally {
    await ctx.dispose();
  }
}

export class ApiClient {
  private constructor(
    private ctx: APIRequestContext,
    readonly session: Session,
  ) {}

  static async as(role: E2ERole): Promise<ApiClient> {
    const session = await login(role);
    const ctx = await request.newContext({
      extraHTTPHeaders: { Authorization: `Bearer ${session.token}` },
    });
    return new ApiClient(ctx, session);
  }

  /**
   * Primer rol de la lista cuyo login REALMENTE funcione. Sirve para tareas que
   * puede hacer más de un rol (p. ej. crear/asignar viajes: ADMIN u OPERATOR):
   * si la cuenta ADMIN está mal cargada, cae a la siguiente.
   */
  static async asFirst(roles: E2ERole[]): Promise<ApiClient> {
    const errors: string[] = [];
    for (const role of roles) {
      if (!credential(role)) {
        errors.push(`${role}: sin credenciales`);
        continue;
      }
      try {
        return await ApiClient.as(role);
      } catch (e) {
        errors.push(`${role}: ${(e as Error).message}`);
      }
    }
    throw new Error(
      `Ninguna cuenta usable para [${roles.join(', ')}]:\n  ${errors.join('\n  ')}`,
    );
  }

  dispose() {
    return this.ctx.dispose();
  }

  private async json(
    method: 'get' | 'post' | 'patch' | 'delete',
    path: string,
    data?: unknown,
  ) {
    const res = await this.ctx[method](url(path), data === undefined ? undefined : { data });
    const text = await res.text();
    if (!res.ok()) {
      throw new Error(`${method.toUpperCase()} ${path} → HTTP ${res.status()}: ${text}`);
    }
    return text ? unwrap(JSON.parse(text)) : null;
  }

  async listGroups(): Promise<any[]> {
    return (await this.json('get', '/groups')) ?? [];
  }

  async getCarrier(id: number): Promise<any> {
    return this.json('get', `/carriers/${id}`);
  }

  async availableDrivers(carrierId: number, tripId?: number): Promise<any[]> {
    const qs = new URLSearchParams({ carrierId: String(carrierId), available: 'true' });
    if (tripId) qs.set('tripId', String(tripId));
    return (await this.json('get', `/drivers?${qs}`)) ?? [];
  }

  async availableTrucks(carrierId: number, tripId?: number): Promise<any[]> {
    const qs = new URLSearchParams({ carrierId: String(carrierId), available: 'true' });
    if (tripId) qs.set('tripId', String(tripId));
    return (await this.json('get', `/trucks?${qs}`)) ?? [];
  }

  createTripRaw(payload: Record<string, unknown>): Promise<any> {
    return this.json('post', '/trips', payload);
  }

  getTrip(id: number | string): Promise<any> {
    return this.json('get', `/trips/${id}`);
  }

  applyToTrip(
    tripId: number | string,
    body: { carrierId: number; driverId: number; truckId: number; notes?: string },
  ) {
    return this.json('post', `/trips/${tripId}/apply`, body);
  }

  acceptApplication(appId: number, body: { driverId: number; truckId: number }) {
    return this.json('post', `/trips/applications/${appId}/accept`, body);
  }

  confirmDeparture(loadId: number | string, body: { ctg: string; loadedWeight: number }) {
    return this.json('post', `/loads/${loadId}/confirm-departure`, body);
  }

  startTrip(appId: number, ctg?: string) {
    return this.json('post', `/loads/applications/${appId}/start-trip`, ctg ? { ctg } : {});
  }

  deleteTrip(id: number | string) {
    return this.json('delete', `/trips/${id}`);
  }
}

/** Datos con los que se hace avanzar un viaje. Se descubren solos del backend. */
export interface ResolvedSeed {
  carrierId: number;
  carrierName: string;
  groupId: number;
  groupName: string;
  groupRate: number;
  driverId: number;
  driverName: string;
  driverDni: string;
  truckId: number;
  truckPlate: string;
  truckChassisPlate: string;
}

const notSuspended = (x: any) =>
  !x?.isSuspended && (!x?.suspendedUntil || new Date(x.suspendedUntil) <= new Date());

const truckInsuranceOk = (t: any) =>
  t?.cargoInsuranceStatus === 'APPROVED' || t?.habilitado === true;

/**
 * Descubre transportista + chofer + camión a partir de la cuenta CARRIER
 * (o de los overrides E2E_* del .env.e2e si están puestos). Lanza un error
 * claro si el transportista no tiene un chofer / camión usable.
 */
export async function resolveSeed(): Promise<ResolvedSeed> {
  const ov = seedOverrides();

  const carrier = await ApiClient.as('CARRIER');
  const admin = await ApiClient.asFirst(WRITE_ROLES);
  try {
    const carrierId = ov.carrierId ?? carrier.session.user.carrierId ?? 0;
    if (!carrierId) {
      throw new Error(
        'La cuenta CARRIER no tiene carrierId. Poné E2E_CARRIER_ID en .env.e2e.',
      );
    }

    const [drivers, trucks] = await Promise.all([
      carrier.availableDrivers(carrierId),
      carrier.availableTrucks(carrierId),
    ]);

    const driver =
      (ov.driverId && drivers.find((d) => d.id === ov.driverId)) ||
      drivers.find(notSuspended) ||
      drivers[0];
    if (!driver) {
      throw new Error(
        `El transportista ${carrierId} no tiene ningún chofer disponible. ` +
          `Cargá uno o poné E2E_DRIVER_ID en .env.e2e.`,
      );
    }

    const truck =
      (ov.truckId && trucks.find((t) => t.id === ov.truckId)) ||
      trucks.find((t) => notSuspended(t) && truckInsuranceOk(t)) ||
      trucks.find(notSuspended) ||
      trucks[0];
    if (!truck) {
      throw new Error(
        `El transportista ${carrierId} no tiene ningún camión disponible. ` +
          `Cargá uno (habilitado y con seguro APPROVED) o poné E2E_TRUCK_ID en .env.e2e.`,
      );
    }

    // Grupo: si hay override E2E_GROUP_ID no tocamos /groups (endpoint ADMIN-only
    // en este backend). Si no, lo listamos con la cuenta write y avisamos si falla.
    const groupName = ov.groupName || 'General';
    let group: { id: number; name?: string };
    if (ov.groupId) {
      group = { id: ov.groupId, name: groupName };
    } else {
      let groups: any[];
      try {
        groups = await admin.listGroups();
      } catch (e) {
        throw new Error(
          `No se pudo leer /groups con la cuenta ${admin.session.user.role} ` +
            `(${(e as Error).message}). Usá una cuenta ADMIN o poné E2E_GROUP_ID en .env.e2e.`,
          { cause: e },
        );
      }
      const found =
        groups.find((g) => g.name?.toLowerCase() === groupName.toLowerCase()) ??
        groups.find((g) => g.isGeneral);
      if (!found) throw new Error(`No se encontró el grupo "${groupName}" en /groups`);
      group = found;
    }

    let carrierName = ov.carrierName || driver.carrier?.name || truck.carrier?.name || '';
    if (!carrierName) {
      try {
        carrierName = (await admin.getCarrier(carrierId))?.name ?? '';
      } catch {
        /* opcional */
      }
    }

    return {
      carrierId,
      carrierName,
      groupId: group.id,
      groupName: group.name ?? groupName,
      groupRate: ov.groupRate ?? 500000,
      driverId: driver.id,
      driverName: ov.driverName || driver.name || '',
      driverDni: ov.driverDni || driver.dni || '',
      truckId: truck.id,
      truckPlate: ov.truckPlate || truck.plate || truck.chassisPlate || '',
      truckChassisPlate:
        ov.truckChassisPlate || truck.chassisPlate || truck.plate || '',
    };
  } finally {
    await carrier.dispose();
    await admin.dispose();
  }
}

export type SeedStage = 'active' | 'applied' | 'assigned' | 'departed' | 'in_progress';

export interface SeededTrip {
  tripId: number;
  appId: number | null;
  loadId: number | null;
  /** CTG numérico generado (solo desde la etapa `departed`). */
  ctg: string | null;
  stage: SeedStage;
  /** Datos seed resueltos, para que los specs los usen en selectores de UI. */
  seed: ResolvedSeed;
}

/** CTG numérico de 11 dígitos, plausible para el backend. */
function makeCtg(): string {
  return ('1' + String(Date.now())).slice(-11);
}

/**
 * Este backend es muy restrictivo: crear viajes, leer grupos y aceptar
 * postulaciones son ADMIN-only (OPERATOR/LOGISTICS → 403). Registrar el CTG en
 * balanza lo puede hacer el balancero.
 */
const WRITE_ROLES: E2ERole[] = ['ADMIN'];
const DEPART_ROLES: E2ERole[] = ['EMPLOYEE', 'OPERATOR', 'ADMIN'];

function tripPayload(seed: ResolvedSeed, overrides: Record<string, unknown>) {
  const iso = new Date().toISOString();
  return {
    origin: `${PREFIX}Origen`,
    destination: `${PREFIX}Destino`,
    loadingDate: iso,
    quotaDate: iso,
    date: iso,
    loadingTimeStart: '00:00',
    loadingTimeEnd: '23:59',
    cereal: 'Soja',
    maxTrucks: 2,
    notes: `${PREFIX}viaje automatizado (borrar con npm run test:e2e:cleanup)`,
    targetGroups: [{ groupId: seed.groupId, rate: seed.groupRate }],
    ...overrides,
  };
}

/**
 * Siembra un viaje y lo hace avanzar hasta `stage` usando solo la API.
 * No borra nada: la limpieza es aparte (`npm run test:e2e:cleanup`).
 */
export async function seedTrip(
  stage: SeedStage,
  overrides: Record<string, unknown> = {},
): Promise<SeededTrip> {
  const seed = await resolveSeed();

  const admin = await ApiClient.asFirst(WRITE_ROLES);
  const result: SeededTrip = {
    tripId: 0,
    appId: null,
    loadId: null,
    ctg: null,
    stage,
    seed,
  };

  try {
    const trip = await admin.createTripRaw(tripPayload(seed, overrides));
    result.tripId = Number(trip.id);
    if (stage === 'active') return result;

    // ── applied ──────────────────────────────────────────────
    const carrier = await ApiClient.as('CARRIER');
    try {
      await carrier.applyToTrip(result.tripId, {
        carrierId: seed.carrierId,
        driverId: seed.driverId,
        truckId: seed.truckId,
        notes: `${PREFIX}postulación automatizada`,
      });
      const applied = await admin.getTrip(result.tripId);
      const app = (applied.applications ?? []).find(
        (a: any) => a.truckId === seed.truckId || a.truck?.id === seed.truckId,
      );
      if (!app) throw new Error('No se encontró la postulación recién creada');
      result.appId = app.id;
      if (stage === 'applied') return result;

      // ── assigned (aceptar la postulación: ADMIN-only) ──────
      await admin.acceptApplication(result.appId, {
        driverId: seed.driverId,
        truckId: seed.truckId,
      });
      const assigned = await admin.getTrip(result.tripId);
      const subLoad = (assigned.loads ?? []).find(
        (l: any) =>
          l.carrierId === seed.carrierId &&
          (l.truckId === seed.truckId || l.truck?.id === seed.truckId),
      );
      result.loadId = subLoad ? Number(subLoad.id) : null;
      if (stage === 'assigned') return result;

      // ── departed (CTG + peso de balanza: balancero) ────────
      if (!result.loadId) {
        throw new Error(
          'El viaje quedó asignado pero no se pudo resolver el sub-load para cargar el CTG',
        );
      }
      const ctg = makeCtg();
      const balancero = await ApiClient.asFirst(DEPART_ROLES);
      try {
        await balancero.confirmDeparture(result.loadId, { ctg, loadedWeight: 30000 });
      } finally {
        await balancero.dispose();
      }
      result.ctg = ctg;
      // Ojo: en este backend confirm-departure ya deja el viaje EN VIAJE
      // (loads[].status = IN_PROGRESS). 'departed' e 'in_progress' son lo mismo.
      if (stage === 'departed' || stage === 'in_progress') {
        try {
          await carrier.startTrip(result.appId, ctg);
        } catch {
          /* ya está EN VIAJE; el start-trip explícito no aplica */
        }
        return result;
      }
      return result;
    } finally {
      await carrier.dispose();
    }
  } finally {
    await admin.dispose();
  }
}
