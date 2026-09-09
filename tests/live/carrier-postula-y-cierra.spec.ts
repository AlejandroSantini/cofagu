import { test, expect, selectField, openModal } from './fixtures';
import { missingConfig } from './env';
import { seedTrip } from './api';

/**
 * CARRIER — funciones: postularse a un viaje disponible (chofer + camión),
 * iniciar el viaje una vez cargada la Carta de Porte y confirmar la llegada
 * a destino (cierre del viaje).
 */
const skipPostula = missingConfig(['CARRIER'], [['ADMIN', 'OPERATOR', 'LOGISTICS']]);
const skipCierra = missingConfig(['CARRIER'], [['ADMIN', 'OPERATOR', 'LOGISTICS']]);

test.describe('CARRIER · postulación', () => {
  test.skip(!!skipPostula, skipPostula || '');

  test('se postula con chofer y camión de su flota', async ({ pageAs }) => {
    const trip = await seedTrip('active');
    const { seed } = trip;

    const page = await pageAs('CARRIER');
    await page.goto(`/loads/${trip.tripId}?type=trip`);

    await page.getByRole('button', { name: 'Postularse a este viaje' }).click();
    const modal = openModal(page, 'Postularse a Viaje');
    await expect(modal).toBeVisible();

    const chofer = selectField(page, 'Chofer Habilitado');
    const camion = selectField(page, 'Camión Flota');
    await chofer.waitFor();
    await (seed.driverName
      ? chofer.selectOption({ label: new RegExp(escapeRe(seed.driverName)) })
      : chofer.selectOption({ index: 1 }));
    await (seed.truckChassisPlate
      ? camion.selectOption({ label: new RegExp(escapeRe(seed.truckChassisPlate)) })
      : camion.selectOption({ index: 1 }));

    await modal.getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.getByText('Postulación enviada correctamente')).toBeVisible();
  });
});

test.describe('CARRIER · inicio y cierre', () => {
  test.skip(!!skipCierra, skipCierra || '');

  test('inicia el viaje y confirma la llegada a destino', async ({ pageAs }) => {
    const trip = await seedTrip('departed'); // asignado + CTG cargado en balanza

    const page = await pageAs('CARRIER');
    await page.goto(`/loads/${trip.tripId}?type=trip`);

    await expect(
      page.getByRole('heading', { name: /Mis Camiones en este Viaje/ }),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Iniciar Viaje' }).click();
    await openModal(page, 'Iniciar Viaje')
      .getByRole('button', { name: 'Confirmar Inicio' })
      .click();
    await expect(page.getByText('Viaje iniciado correctamente')).toBeVisible();

    const llegada = page.getByRole('button', { name: 'Confirmar Llegada a Destino' });
    await expect(llegada).toBeVisible({ timeout: 20_000 });
    await llegada.click();

    const modal = openModal(page, 'Registrar Descarga en Destino');
    await modal
      .locator('input[type="number"]')
      .fill('29500');
    await modal.getByRole('button', { name: 'Confirmar Llegada' }).click();

    await expect(page.getByText('Viaje finalizado con éxito')).toBeVisible();
  });
});

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
