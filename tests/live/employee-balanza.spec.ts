import { test, expect, textField, openModal } from './fixtures';
import { missingConfig } from './env';

/**
 * EMPLOYEE (balancero) — función: registrar la Carta de Porte (CTG) y el peso
 * cargado en báscula para un camión ya asignado → habilita al transportista a
 * iniciar el viaje.
 * Precondición sembrada por API: viaje ASIGNADO (postulación aceptada).
 */
const skip = missingConfig(['CARRIER', 'EMPLOYEE'], [['ADMIN', 'OPERATOR', 'LOGISTICS']]);
test.describe('EMPLOYEE · balanza y Carta de Porte', () => {
  test.skip(!!skip, skip || '');

  test('carga el CTG y los kilos de balanza', async ({ pageAs, seed }) => {
    const trip = await seed('assigned');
    const ctg = ('2' + String(Date.now())).slice(-11);

    const page = await pageAs('EMPLOYEE');
    await page.goto(`/loads/${trip.tripId}?type=trip`);

    const cargarCtg = page.getByRole('button', {
      name: /Cargar CTG \(Carta de Porte\)/,
    });
    await expect(cargarCtg).toBeVisible();
    await cargarCtg.click();

    const modal = openModal(page, 'Registrar Carta de Porte (CTG) y Peso de Balanza');
    await expect(modal).toBeVisible();
    await textField(page, 'Código CTG').fill(ctg);
    await textField(page, 'Kilos Cargados en Báscula').fill('30000');
    await modal.getByRole('button', { name: 'Confirmar Salida de Balanza' }).click();

    await expect(page.getByText('Salida de balanza confirmada con éxito')).toBeVisible();
  });
});
