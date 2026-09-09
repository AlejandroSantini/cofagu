import { test, expect, openModal } from './fixtures';
import { missingConfig, PREFIX } from './env';

/**
 * PLAYERO — función: controlar los camiones en la playa y rechazar uno
 * (con motivo) cuando corresponde.
 * Precondición sembrada por API: viaje ASIGNADO (el camión aparece en playa).
 */
const skip = missingConfig(['CARRIER', 'PLAYERO'], [['ADMIN', 'OPERATOR', 'LOGISTICS']]);
test.describe('PLAYERO · control de playa', () => {
  test.skip(!!skip, skip || '');

  test('encuentra el camión y lo rechaza con motivo', async ({ pageAs, seed }) => {
    const trip = await seed('assigned');
    const plate = trip.seed.truckChassisPlate || trip.seed.truckPlate;
    test.skip(!plate, 'El camión resuelto no tiene patente cargada en el backend');

    const page = await pageAs('PLAYERO');
    await page.goto('/yard');
    await expect(page.getByRole('heading', { name: 'Control de Playa' })).toBeVisible();

    await page
      .getByPlaceholder('Buscar por patente, nombre de chofer o empresa...')
      .fill(plate);
    await page.getByRole('button', { name: 'Buscar' }).click();

    const row = page.getByRole('row').filter({ hasText: plate }).first();
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Rechazar' }).click();

    const modal = openModal(page, 'Rechazar Carga');
    await modal
      .getByPlaceholder('Ej: Llegó fuera de horario establecido, documentación incompleta...')
      .fill(`${PREFIX}rechazo automatizado`);
    await modal.getByRole('button', { name: 'Confirmar Rechazo' }).click();

    await expect(page.getByText('Carga rechazada correctamente')).toBeVisible();
  });
});
