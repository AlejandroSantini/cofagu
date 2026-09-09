/**
 * Carga y validación de `.env.e2e` para la suite E2E contra el backend REAL.
 *
 * `.env.e2e` NO se commitea (está en .gitignore). Copiá `.env.e2e.example`,
 * completá los valores y listo. Cualquier variable ya presente en
 * `process.env` (p. ej. en CI) tiene prioridad sobre el archivo.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ENV_FILE = path.join(ROOT, '.env.e2e');

function parseEnvFile(file: string): Record<string, string> {
  if (!fs.existsSync(file)) return {};
  const out: Record<string, string> = {};
  for (const rawLine of fs.readFileSync(file, 'utf8').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const fileEnv = parseEnvFile(ENV_FILE);

// Copiamos al process.env lo que no esté ya definido, para que
// `playwright.live.config.ts` pueda leer E2E_API_URL en el webServer.
for (const [k, v] of Object.entries(fileEnv)) {
  if (process.env[k] === undefined) process.env[k] = v;
}

export function envVar(key: string): string {
  return (process.env[key] ?? fileEnv[key] ?? '').trim();
}

export const HAS_ENV_FILE = fs.existsSync(ENV_FILE);

export const API_URL =
  envVar('E2E_API_URL') ||
  'https://backend-cooperativa-production.up.railway.app/api';

export const PREFIX = envVar('E2E_PREFIX') || 'E2E-';

export type E2ERole =
  | 'ADMIN'
  | 'OPERATOR'
  | 'EMPLOYEE'
  | 'CARRIER'
  | 'PLAYERO'
  | 'GAS_STATION'
  | 'LOGISTICS'
  | 'TECHNICAL_CENTER'
  | 'CONTROL_VIAJES';

export interface Credential {
  role: E2ERole;
  email: string;
  password: string;
}

/** Devuelve las credenciales de un rol, o `null` si faltan en `.env.e2e`. */
export function credential(role: E2ERole): Credential | null {
  const email = envVar(`E2E_${role}_EMAIL`);
  const password = envVar(`E2E_${role}_PASSWORD`);
  if (!email || !password) return null;
  return { role, email, password };
}

/**
 * Overrides opcionales de los datos seed. Todo lo que quede vacío se descubre
 * solo desde la cuenta CARRIER en tiempo de ejecución (ver `resolveSeed`).
 */
export interface SeedOverrides {
  carrierId?: number;
  carrierName?: string;
  groupId?: number;
  groupName?: string;
  groupRate?: number;
  driverId?: number;
  driverName?: string;
  driverDni?: string;
  truckId?: number;
  truckPlate?: string;
  truckChassisPlate?: string;
}

export function seedOverrides(): SeedOverrides {
  const num = (k: string) => (envVar(k) ? Number(envVar(k)) : undefined);
  const str = (k: string) => envVar(k) || undefined;
  return {
    carrierId: num('E2E_CARRIER_ID'),
    carrierName: str('E2E_CARRIER_NAME'),
    groupId: num('E2E_GROUP_ID'),
    groupName: str('E2E_GROUP_NAME'),
    groupRate: num('E2E_GROUP_RATE'),
    driverId: num('E2E_DRIVER_ID'),
    driverName: str('E2E_DRIVER_NAME'),
    driverDni: str('E2E_DRIVER_DNI'),
    truckId: num('E2E_TRUCK_ID'),
    truckPlate: str('E2E_TRUCK_PLATE'),
    truckChassisPlate: str('E2E_TRUCK_CHASSIS_PLATE'),
  };
}

/**
 * Motivo de skip si falta config. `required`: roles que sí o sí hacen falta.
 * `anyOf`: grupos donde alcanza con que UNA credencial del grupo esté cargada
 * (p. ej. para sembrar viajes sirve ADMIN u OPERATOR).
 */
export function missingConfig(
  required: E2ERole[],
  anyOf: E2ERole[][] = [],
): string | null {
  if (!HAS_ENV_FILE) return 'Falta el archivo .env.e2e (copiá .env.e2e.example)';
  const missingRoles = required.filter((r) => !credential(r));
  if (missingRoles.length > 0) {
    return `Faltan credenciales en .env.e2e para: ${missingRoles.join(', ')}`;
  }
  for (const group of anyOf) {
    if (!group.some((r) => credential(r))) {
      return `Falta al menos una credencial de: ${group.join(' / ')}`;
    }
  }
  return null;
}
