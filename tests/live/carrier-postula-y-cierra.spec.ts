import { test, expect, selectField, openModal } from './fixtures';
import { missingConfig } from './env';

/**
 * CARRIER — funciones: postularse a un viaje disponible (chofer + camión) y
 * confirmar la llegada a destino (cierre del viaje).
 *
 * Nota: en este backend `confirm-departure` (que hace el balancero) ya deja el
 * viaje EN VIAJE, así que no hay un paso "Iniciar Viaje" separado del lado del
 * transportista — pasa directo a poder confirmar la llegada.
 */
const skipPostula = missingConfig(['CARRIER'], [['ADMIN', 'OPERATOR', 'LOGISTICS']]);
const skipCierra = missingConfig(['CARRIER'], [['ADMIN', 'OPERATOR', 'LOGISTICS']]);

test.describe('CARRIER · postulación', () => {
  test.skip(!!skipPostula, skipPostula || '');

  test('se postula con chofer y camión de su flota', async ({ pageAs, seed }) => {
    const trip = await seed('active');
    const s = trip.seed;

    const page = await pageAs('CARRIER');
    await page.goto(`/loads/${trip.tripId}?type=trip`);

    await page.getByRole('button', { name: 'Postularse a este viaje' }).click();
    const modal = openModal(page, 'Postularse a Viaje');
    await expect(modal).toBeVisible();

    const chofer = selectField(page, 'Chofer Habilitado');
    const camion = selectField(page, 'Camión Flota');
    await chofer.waitFor();
    // Seleccionamos por value (= id), que resolveSeed ya nos dio.
    await chofer.selectOption(String(s.driverId));
    await camion.selectOption(String(s.truckId));

    await modal.getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.getByText('Postulación enviada correctamente')).toBeVisible();
  });
});

test.describe('CARRIER · cierre del viaje', () => {
  test.skip(!!skipCierra, skipCierra || '');

  test('confirma la llegada a destino', async ({ pageAs, seed }) => {
    const trip = await seed('departed'); // asignado + CTG cargado + EN VIAJE

    const page = await pageAs('CARRIER');
    await page.goto(`/loads/${trip.tripId}?type=trip`);

    await expect(
      page.getByRole('heading', { name: /Mis Camiones en este Viaje/ }),
    ).toBeVisible();

    const llegada = page.getByRole('button', { name: 'Confirmar Llegada a Destino' });
    await expect(llegada).toBeVisible({ timeout: 20_000 });
    await llegada.click();

    const modal = openModal(page, 'Registrar Descarga en Destino');
    await modal.locator('input[type="number"]').fill('29500');
    await modal.getByRole('button', { name: 'Confirmar Llegada' }).click();

    await expect(page.getByText('Viaje finalizado con éxito')).toBeVisible();
  });
});
