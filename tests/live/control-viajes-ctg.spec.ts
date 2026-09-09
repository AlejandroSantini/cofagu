import { test, expect } from './fixtures';
import { missingConfig } from './env';

/**
 * CONTROL_VIAJES — función: buscar un viaje por su número de CTG para consultar
 * sus datos (transportista, kilos descargados, tarifa) y descargar el
 * comprobante si existe.
 * Precondición sembrada por API: viaje con CTG cargado.
 *
 * Nota: `GET /loads/ctg/:ctg` devuelve el registro de carga (sin origen/destino),
 * así que verificamos la tarjeta de resultado y el CTG, no la ruta.
 */
const skip = missingConfig(['CARRIER', 'CONTROL_VIAJES'], [['ADMIN', 'OPERATOR', 'LOGISTICS']]);
test.describe('CONTROL_VIAJES · consulta por CTG', () => {
  test.skip(!!skip, skip || '');

  test('busca el viaje por CTG y ve la tarjeta de resultado', async ({ pageAs, seed }) => {
    const trip = await seed('departed');
    expect(trip.ctg, 'el viaje sembrado debería tener CTG').toBeTruthy();

    const page = await pageAs('CONTROL_VIAJES');
    await page.goto('/control-viajes');
    await expect(page.getByRole('heading', { name: 'Control de Viajes' })).toBeVisible();

    await page.getByPlaceholder('Ingresá el número de CTG...').fill(trip.ctg!);
    await page.getByRole('button', { name: 'Buscar' }).click();

    // La tarjeta de resultado: encabezado "Viaje CTG" + el número + labels fijos.
    await expect(page.getByText('Viaje CTG')).toBeVisible();
    await expect(page.getByText(trip.ctg!).first()).toBeVisible();
    await expect(page.getByText('Kg Descargados')).toBeVisible();
    // No debe aparecer el cartel de "no encontrado".
    await expect(page.getByText('Viaje no encontrado')).toHaveCount(0);
  });
});
