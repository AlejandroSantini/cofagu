import { test, expect } from './fixtures';
import { missingConfig } from './env';
import { seedTrip } from './api';

/**
 * GAS_STATION — función: consultar qué camiones activos están autorizados a
 * cargar combustible, buscándolos por patente.
 * Precondición sembrada por API: viaje con un camión asignado (queda visible
 * en el listado de combustible mientras haya cupos libres).
 */
const skip = missingConfig(['CARRIER', 'GAS_STATION'], [['ADMIN', 'OPERATOR', 'LOGISTICS']]);
test.describe('GAS_STATION · control de combustible', () => {
  test.skip(!!skip, skip || '');

  test('busca por patente y ve el camión autorizado', async ({ pageAs }) => {
    const trip = await seedTrip('assigned', { maxTrucks: 2 });
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
});
