import { test, expect } from './fixtures';
import { missingConfig, PREFIX } from './env';
import { seedTrip } from './api';

/**
 * CONTROL_VIAJES — función: buscar un viaje por su número de CTG para consultar
 * transportista, kilos y ruta (y descargar comprobante si existe).
 * Precondición sembrada por API: viaje con CTG cargado.
 */
const skip = missingConfig(['CARRIER', 'CONTROL_VIAJES'], [['ADMIN', 'OPERATOR', 'LOGISTICS']]);
test.describe('CONTROL_VIAJES · consulta por CTG', () => {
  test.skip(!!skip, skip || '');

  test('busca el viaje por CTG y ve sus datos', async ({ pageAs }) => {
    const trip = await seedTrip('departed');
    expect(trip.ctg, 'el viaje sembrado debería tener CTG').toBeTruthy();

    const page = await pageAs('CONTROL_VIAJES');
    await page.goto('/control-viajes');
    await expect(page.getByRole('heading', { name: 'Control de Viajes' })).toBeVisible();

    await page.getByPlaceholder('Ingresá el número de CTG...').fill(trip.ctg!);
    await page.getByRole('button', { name: 'Buscar' }).click();

    await expect(page.getByText('Transportista')).toBeVisible();
    await expect(
      page.getByText(`${PREFIX}Origen → ${PREFIX}Destino`),
    ).toBeVisible();
    await expect(page.getByText(trip.ctg!).first()).toBeVisible();
  });
});
