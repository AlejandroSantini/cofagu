import { test, expect, textField } from './fixtures';
import { missingConfig, PREFIX, seedOverrides } from './env';

/**
 * ADMIN — función: publicar un viaje nuevo desde la UI (`/loads` → Publicar Carga).
 * Es el punto de partida de todo el ciclo. No usa seedTrip: crea el viaje a mano.
 */
const skip = missingConfig(['ADMIN']);
test.describe('ADMIN · publica un viaje', () => {
  test.skip(!!skip, skip || '');

  test('crea y publica un viaje con tarifa de grupo', async ({ pageAs }) => {
    const rate = seedOverrides().groupRate ?? 500000;
    const page = await pageAs('ADMIN');
    await page.goto('/loads');

    await page.getByRole('button', { name: 'Publicar Carga' }).click();
    await expect(page.getByRole('heading', { name: 'Nueva Carga' })).toBeVisible();

    const today = new Date().toISOString().slice(0, 10);
    await textField(page, 'Origen').fill(`${PREFIX}Origen UI`);
    await textField(page, 'Destino').fill(`${PREFIX}Destino UI`);
    await textField(page, 'Fecha de Carga').fill(today);
    await textField(page, 'Fecha de Cupo').fill(today);
    await textField(page, 'Horario Inicio Carga').fill('08:00');
    await textField(page, 'Horario Límite Carga').fill('16:00');
    await textField(page, 'Cereal / Producto').fill('Soja');
    await textField(page, 'Cantidad de camiones necesarios').fill('1');
    await page
      .getByPlaceholder('Ej: Carga frágil, requiere lona...')
      .fill(`${PREFIX}viaje automatizado (borrar con test:e2e:cleanup)`);

    // El grupo "General" viene pre-tildado: solo falta la tarifa.
    await page
      .getByPlaceholder('Ej: 500000')
      .first()
      .fill(String(rate));

    const publicar = page.getByRole('button', { name: 'Publicar', exact: true });
    await expect(publicar).toBeEnabled();
    await publicar.click();

    await expect(page.getByText('Carga publicada con éxito')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Gestión de Cargas' })).toBeVisible();
  });
});
