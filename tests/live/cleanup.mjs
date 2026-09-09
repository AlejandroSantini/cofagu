#!/usr/bin/env node
/**
 * Borra del backend real todos los viajes de prueba (prefijo E2E-) que hayan
 * quedado de la suite `tests/live/`.
 *
 *   npm run test:e2e:cleanup
 *
 * Lee `.env.e2e` (o process.env). Usa la cuenta ADMIN. No toca nada que no
 * empiece con el prefijo en origen / destino / observaciones.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function parseEnvFile(file) {
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const rawLine of fs.readFileSync(file, 'utf8').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const fileEnv = parseEnvFile(path.join(ROOT, '.env.e2e'));
const envVar = (k) => (process.env[k] ?? fileEnv[k] ?? '').trim();

const API_URL =
  envVar('E2E_API_URL') || 'https://backend-cooperativa-production.up.railway.app/api';
const PREFIX = envVar('E2E_PREFIX') || 'E2E-';
const EMAIL = envVar('E2E_ADMIN_EMAIL');
const PASSWORD = envVar('E2E_ADMIN_PASSWORD');

if (!EMAIL || !PASSWORD) {
  console.error('✖ Faltan E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD en .env.e2e');
  process.exit(1);
}

const base = API_URL.replace(/\/$/, '');
const unwrap = (b) => (b && typeof b === 'object' && 'data' in b ? b.data : b);

async function api(method, endpoint, token, body) {
  const res = await fetch(base + endpoint, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { ok: res.ok, status: res.status, json };
}

function isE2E(item) {
  const fields = [item?.origin, item?.destination, item?.notes];
  return fields.some((f) => typeof f === 'string' && f.startsWith(PREFIX));
}

const main = async () => {
  const loginRes = await api('POST', '/users/login', null, { email: EMAIL, password: PASSWORD });
  if (!loginRes.ok) {
    console.error(`✖ Login ADMIN falló (HTTP ${loginRes.status}):`, loginRes.json);
    process.exit(1);
  }
  const token = unwrap(loginRes.json)?.token;
  if (!token) {
    console.error('✖ Login sin token');
    process.exit(1);
  }

  const statuses = ['ACTIVE', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REJECTED', 'DELAYED'];
  const tripIds = new Set();

  for (const endpoint of ['/trips', ...statuses.map((s) => `/trips?status=${s}`), ...statuses.map((s) => `/loads?status=${s}`)]) {
    const res = await api('GET', endpoint, token);
    if (!res.ok) continue;
    const list = unwrap(res.json);
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (isE2E(item)) tripIds.add(Number(item.tripId ?? item.id));
    }
  }

  if (tripIds.size === 0) {
    console.log(`✓ No quedaron viajes ${PREFIX} para borrar.`);
    return;
  }

  console.log(`Encontrados ${tripIds.size} viaje(s) ${PREFIX} para borrar: ${[...tripIds].join(', ')}`);
  let ok = 0;
  let failed = 0;
  for (const id of tripIds) {
    const res = await api('DELETE', `/trips/${id}`, token);
    if (res.ok) {
      ok++;
      console.log(`  ✓ borrado trip ${id}`);
    } else {
      failed++;
      console.log(`  ✖ trip ${id} → HTTP ${res.status}: ${JSON.stringify(res.json)}`);
    }
  }
  console.log(`\nListo: ${ok} borrado(s), ${failed} con error.`);
  if (failed > 0) {
    console.log('Los que fallaron suelen ser viajes COMPLETADOS que el backend no deja borrar; revisalos a mano si molestan.');
  }
};

main().catch((err) => {
  console.error('✖ Error inesperado:', err);
  process.exit(1);
});
