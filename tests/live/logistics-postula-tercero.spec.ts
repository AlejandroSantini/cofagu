import { test, expect, selectField, openModal } from './fixtures';
import { missingConfig } from './env';
import { seedTrip } from './api';

/**
 * LOGISTICS — función: postular a un transportista de su cartera a un viaje
 * disponible (elige transportista → chofer → camión en cascada).
 * Precondición sembrada por API: viaje ACTIVO.
 */
const skip = missingConfig(['LOGISTICS']);
test.describe('LOGISTICS · postula por un tercero', () => {
  test.skip(!!skip, skip || '');

  test('postula un transportista de su cartera con chofer y camión', async ({ pageAs }) => {
    const trip = await seedTrip('active');
    const { seed } = trip;
    test.skip(
      !seed.carrierName,
      'No se pudo resolver el nombre del transportista; poné E2E_CARRIER_NAME en .env.e2e',
    );

    const page = await pageAs('LOGISTICS');
    await page.goto(`/loads/${trip.tripId}?type=trip`);

    await page.getByRole('button', { name: 'Postularse a este viaje' }).click();
    const modal = openModal(page, 'Postularse a Viaje');
    await expect(modal).toBeVisible();

    await selectField(page, 'Transportista').selectOption({
      label: new RegExp(escapeRe(seed.carrierName)),
    });

    const chofer = selectField(page, 'Chofer Habilitado');
    const camion = selectField(page, 'Camión Flota');
    await expect(chofer).toBeVisible();
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

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
