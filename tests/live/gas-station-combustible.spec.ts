import { test, expect } from './fixtures';
import { missingConfig } from './env';
import { ApiClient } from './api';

/**
 * GAS_STATION — función: consultar qué camiones activos están autorizados a
 * cargar combustible, buscándolos por patente.
 * Precondición sembrada por API: viaje con un camión asignado (queda visible
 * en el listado de combustible mientras haya cupos libres).
 */
const skip = missingConfig(['CARRIER', 'GAS_STATION'], [['ADMIN', 'OPERATOR', 'LOGISTICS']]);
test.describe('GAS_STATION · control de combustible', () => {
  test.skip(!!skip, skip || '');

  test('busca por patente y ve el camión autorizado', async ({ pageAs, seed }) => {
    const trip = await seed('assigned', { maxTrucks: 2 });
    const plate = trip.seed.truckChassisPlate || trip.seed.truckPlate;
    test.skip(!plate, 'El camión resuelto no tiene patente cargada en el backend');

    const page = await pageAs('GAS_STATION');
    await page.goto('/loads');
    await expect(
      page.getByRole('heading', { name: /Buscador de Camiones Autorizados a Combustible/ }),
    ).toBeVisible();

    await page
      .getByPlaceholder(/Buscar por Patente/)
      .fill(plate);

    await expect(
      page.getByRole('cell').filter({ hasText: plate }).first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  // NOTA (2026-09-13): este test falla hoy contra el backend real porque
  // `PUT /loads/:id` devuelve 403 para el rol GAS_STATION ("esta acción solo
  // la pueden realizar: ADMIN, EMPLOYEE"). Es el mismo endpoint que el propio
  // backend indicó usar para "No cargó" (fuelConsumption: 0). Es un bug de
  // permisos del backend, no del frontend — dejamos el test así (no skip,
  // no xfail) para que pase solo apenas se corrija el permiso del lado backend.
  test('muestra Ruta/Tarifa y "No cargó" hace desaparecer el registro (persistido en backend)', async ({
    pageAs,
    seed,
  }) => {
    // maxTrucks: 2 (no 1) para que el viaje quede con un cupo libre y
    // siga con status ACTIVE — la pantalla de combustible del GAS_STATION
    // sólo pide trips?status=ACTIVE (ver seed usado por el test anterior).
    const trip = await seed('assigned', { maxTrucks: 2 });
    const plate = trip.seed.truckChassisPlate || trip.seed.truckPlate;
    test.skip(!plate, 'El camión resuelto no tiene patente cargada en el backend');
    test.skip(!trip.loadId, 'No se pudo resolver el sub-load asignado');

    const page = await pageAs('GAS_STATION');
    await page.goto('/loads');

    await page.getByPlaceholder(/Buscar por Patente/).fill(plate);
    const row = page.locator('tr', { hasText: plate });
    await expect(row).toBeVisible({ timeout: 15_000 });

    // Ítem 6: Ruta (origin → destination) reutilizando datos del viaje ya existentes.
    await expect(row).toContainText('→');

    // Ítem 7: "No cargó" -> PUT fuelConsumption:0 -> desaparece del listado.
    await row.getByRole('button', { name: 'No cargó' }).click();
    await expect(page.getByText('Se registró que el camión no cargó combustible')).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.locator('tr', { hasText: plate })).toHaveCount(0, { timeout: 15_000 });

    // Confirmamos contra el backend real que quedó persistido, no solo en la UI.
    const admin = await ApiClient.as('ADMIN');
    try {
      const updated = await admin.getTrip(trip.tripId);
      const subLoad = (updated.loads ?? []).find((l: { id: number }) => l.id === trip.loadId);
      expect(subLoad?.fuelConsumption).toBe(0);
    } finally {
      await admin.dispose();
    }
  });
});
