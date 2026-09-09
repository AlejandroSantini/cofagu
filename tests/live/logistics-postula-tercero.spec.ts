import { test, expect, selectField, openModal } from './fixtures';
import { missingConfig } from './env';
import type { Locator } from '@playwright/test';

/**
 * LOGISTICS — función: postular a un transportista de SU cartera a un viaje
 * disponible (elige transportista → chofer → camión en cascada).
 * Precondición sembrada por API: viaje ACTIVO.
 *
 * LOGISTICS gestiona su propio transportista (distinto al del seed), así que
 * elegimos lo que haya en cada desplegable, no ids del seed.
 */
const skip = missingConfig(['LOGISTICS']);
test.describe('LOGISTICS · postula por un tercero', () => {
  test.skip(!!skip, skip || '');

  test('postula un transportista de su cartera con chofer y camión', async ({ pageAs, seed }) => {
    const trip = await seed('active');

    const page = await pageAs('LOGISTICS');
    await page.goto(`/loads/${trip.tripId}?type=trip`);

    await page.getByRole('button', { name: 'Postularse a este viaje' }).click();
    const modal = openModal(page, 'Postularse a Viaje');
    await expect(modal).toBeVisible();

    const okCarrier = await selectFirstReal(selectField(page, 'Transportista'));
    test.skip(!okCarrier, 'La cuenta LOGISTICS no tiene transportistas en su cartera');

    // La cascada (chofer/camión) se llena async tras elegir el transportista.
    const chofer = selectField(page, 'Chofer Habilitado');
    await expect
      .poll(() => chofer.locator('option').count(), { timeout: 15_000 })
      .toBeGreaterThan(1);

    const okDrv = await selectFirstReal(chofer);
    const okTrk = await selectFirstReal(selectField(page, 'Camión Flota'));
    test.skip(
      !okDrv || !okTrk,
      'El transportista de LOGISTICS no tiene chofer o camión disponible',
    );

    await modal.getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.getByText('Postulación enviada correctamente')).toBeVisible();
  });
});

/** Selecciona la primera opción con value no vacío y habilitada. */
async function selectFirstReal(sel: Locator): Promise<boolean> {
  const values: string[] = await sel
    .locator('option')
    .evaluateAll((os) =>
      (os as HTMLOptionElement[])
        .filter((o) => o.value && !o.disabled)
        .map((o) => o.value),
    );
  if (values.length === 0) return false;
  await sel.selectOption(values[0]);
  return true;
}
