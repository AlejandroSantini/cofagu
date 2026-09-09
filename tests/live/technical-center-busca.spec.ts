import { test, expect } from './fixtures';
import { missingConfig } from './env';
import { seedTrip } from './api';

/**
 * TECHNICAL_CENTER (Centro Agrotécnico) — función: buscar camiones cargados hoy
 * por patente / transportista para su control técnico.
 * Precondición sembrada por API: viaje con CTG cargado y fecha de carga = hoy.
 */
const skip = missingConfig(['CARRIER', 'TECHNICAL_CENTER'], [['ADMIN', 'OPERATOR', 'LOGISTICS']]);
test.describe('TECHNICAL_CENTER · buscador de camiones', () => {
  test.skip(!!skip, skip || '');

  test('encuentra el camión cargado hoy por patente', async ({ pageAs }) => {
    const trip = await seedTrip('departed');
    const { seed } = trip;
    const plate = seed.truckChassisPlate || seed.truckPlate;
    test.skip(!plate, 'El camión resuelto no tiene patente cargada en el backend');

    const page = await pageAs('TECHNICAL_CENTER');
    await page.goto('/technical-center-search');
    await expect(page.getByRole('heading', { name: 'Buscador de Camiones' })).toBeVisible();

    await page.getByPlaceholder('Buscar por patente o transportista...').fill(plate);

    await expect(
      page.getByRole('cell').filter({ hasText: plate }).first(),
    ).toBeVisible({ timeout: 15_000 });
    if (seed.carrierName) {
      await expect(page.getByRole('cell').filter({ hasText: seed.carrierName }).first()).toBeVisible();
    }
  });
});
