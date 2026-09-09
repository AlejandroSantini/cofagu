import { test, expect } from './fixtures';
import { missingConfig } from './env';

/**
 * Asignación de viaje — función de coordinación (OPERATOR/ADMIN): revisar la
 * postulación pendiente y aprobarla → el viaje pasa a ASIGNADO.
 * En este backend aceptar postulaciones es ADMIN-only, así que la UI se maneja
 * como ADMIN.
 * Precondición sembrada por API: viaje ACTIVO con una postulación PENDIENTE.
 */
const skip = missingConfig(['ADMIN', 'CARRIER']);
test.describe('Coordinación · aprueba una postulación', () => {
  test.skip(!!skip, skip || '');

  test('aprueba la postulación pendiente y el viaje queda asignado', async ({ pageAs, seed }) => {
    const trip = await seed('applied');
    const s = trip.seed;

    const page = await pageAs('ADMIN');
    await page.goto(`/loads/${trip.tripId}?type=trip`);

    await expect(
      page.getByRole('heading', { name: /Postulaciones y Viajes Asignados/ }),
    ).toBeVisible();
    if (s.carrierName) {
      await expect(page.getByText(s.carrierName).first()).toBeVisible();
    }

    const aprobar = page.getByRole('button', { name: 'Aprobar Postulación' });
    await expect(aprobar).toBeEnabled();
    await aprobar.click();

    await expect(page.getByText('Viaje asignado correctamente')).toBeVisible();
    await expect(page.getByText('ASIGNADO').first()).toBeVisible();
  });
});
