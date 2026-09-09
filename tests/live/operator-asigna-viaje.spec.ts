import { test, expect } from './fixtures';
import { missingConfig } from './env';
import { seedTrip } from './api';

/**
 * OPERATOR — función: revisar postulaciones y asignar el viaje al transportista
 * (aprobar la postulación → estado ASIGNADO).
 * Precondición sembrada por API: viaje ACTIVO con una postulación PENDIENTE.
 */
const skip = missingConfig(['CARRIER', 'OPERATOR']);
test.describe('OPERATOR · asigna un viaje', () => {
  test.skip(!!skip, skip || '');

  test('aprueba la postulación pendiente del transportista', async ({ pageAs }) => {
    const trip = await seedTrip('applied');
    const { seed } = trip;

    const page = await pageAs('OPERATOR');
    await page.goto(`/loads/${trip.tripId}?type=trip`);

    await expect(
      page.getByRole('heading', { name: /Postulaciones y Viajes Asignados/ }),
    ).toBeVisible();
    if (seed.carrierName) {
      await expect(page.getByText(seed.carrierName).first()).toBeVisible();
    }

    const aprobar = page.getByRole('button', { name: 'Aprobar Postulación' });
    await expect(aprobar).toBeEnabled();
    await aprobar.click();

    await expect(page.getByText('Viaje asignado correctamente')).toBeVisible();
    await expect(page.getByText('ASIGNADO').first()).toBeVisible();
  });
});
