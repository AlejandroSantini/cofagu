# Suite E2E contra el backend REAL

Estos specs **no mockean** `/api`: pegan al backend de Railway con cuentas
reales y crean/mueven viajes de verdad. Sirven para verificar el ciclo
completo de un viaje tocando la función de cada rol.

La suite mockeada de siempre (`tests/*.spec.ts`, `npm test`) no se toca.

## Puesta a punto (una vez)

```bash
cp .env.e2e.example .env.e2e
# completar .env.e2e: las 9 cuentas de QA (email + password). Nada más.
```

`.env.e2e` está gitignoreado. Requisitos:

- Cada cuenta de QA con la contraseña ya cambiada (`mustChangePassword = false`).
- El transportista de `E2E_CARRIER_EMAIL` tiene al menos un chofer y un camión
  disponibles (camión habilitado / seguro `APPROVED`).

**Los datos seed (carrier / chofer / camión / grupo) se descubren solos** a
partir de la cuenta CARRIER. Los `E2E_CARRIER_ID`, `E2E_DRIVER_ID`, etc. del
`.env.e2e` son overrides opcionales para forzar un dato puntual.

Si falta una credencial, el spec que la necesita queda **skipped** (no falla).
Si el transportista no tiene chofer/camión usable, el spec **falla** con un
mensaje que lo explica.

## Correr

```bash
npm run test:live            # toda la suite (headless, workers=1, serial)
npm run test:live -- --ui    # modo UI para ver el flujo paso a paso
npm run test:live -- carrier # solo los specs de un rol
npm run test:e2e:cleanup     # borra los viajes E2E- que hayan quedado
```

Reporte HTML: `playwright-report-live/` (`npx playwright show-report playwright-report-live`).

## Qué prueba cada archivo

| Spec | Rol | Función que ejercita |
|---|---|---|
| `admin-crea-viaje` | ADMIN | Publica un viaje nuevo desde la UI |
| `operator-asigna-viaje` | OPERATOR | Aprueba la postulación → viaje ASIGNADO |
| `carrier-postula-y-cierra` | CARRIER | Se postula, inicia el viaje y confirma llegada |
| `employee-balanza` | EMPLOYEE | Carga CTG + kilos de balanza |
| `logistics-postula-tercero` | LOGISTICS | Postula un transportista de su cartera |
| `playero-playa` | PLAYERO | Encuentra el camión en playa y lo rechaza |
| `gas-station-combustible` | GAS_STATION | Busca camión autorizado a combustible |
| `technical-center-busca` | TECHNICAL_CENTER | Busca camión cargado hoy por patente |
| `control-viajes-ctg` | CONTROL_VIAJES | Consulta un viaje por número de CTG |

Cada spec siembra su propio viaje por API (`seedTrip`) hasta el estado que
necesita: no dependen del orden entre archivos. La limpieza es aparte
(`npm run test:e2e:cleanup`), no la hace cada test.

## Piezas

- `env.ts` — parsea `.env.e2e`, expone credenciales / seed / motivos de skip.
- `api.ts` — login real + cliente REST + `seedTrip(stage)`.
- `fixtures.ts` — `pageAs(role)`: página ya logueada (token real en `localStorage`).
- `cleanup.mjs` — barre los viajes con prefijo `E2E-`.
