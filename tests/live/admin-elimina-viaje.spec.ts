import { test, expect, openModal } from './fixtures';
import { missingConfig } from './env';
import { ApiClient } from './api';

/**
 * ADMIN — función: borrar definitivamente una publicación desde la UI
 * ("Cancelar Viaje Completo" / "Eliminar Definitivamente" en LoadDetails).
 *
 * Precondición sembrada por API: viaje ACTIVE, sin postulaciones ni cupos
 * completados — el caso base que pidió el admin ("cualquier publicación que
 * no completó todos los cupos, poder borrarla cuando quiera").
 *
 * Confirmado por backend (ver tests/load-hard-delete.spec.ts para el mock):
 * DELETE /trips/:id hace soft-delete en cascada (deletedAt + status
 * CANCELLED en el viaje y sus postulaciones) y los listados filtran
 * `deletedAt: null` incondicionalmente. Este test valida eso mismo pero
 * contra el backend real: crea un viaje descartable, lo borra desde la UI,
 * y confirma con una llamada a la API que `GET /trips/:id` ya no lo
 * devuelve.
 */
const skip = missingConfig(['ADMIN']);
test.describe('ADMIN · borra definitivamente una publicación', () => {
  test.skip(!!skip, skip || '');

  test('cancela un viaje ACTIVE sin cupos completados y el backend lo borra de verdad', async ({
    pageAs,
    seed,
  }) => {
    const trip = await seed('active');

    const page = await pageAs('ADMIN');
    await page.goto(`/loads/${trip.tripId}?type=trip`);

    const cancelBtn = page.getByRole('button', { name: 'Cancelar Viaje Completo' });
    await expect(cancelBtn).toBeVisible();
    // Sin botón de borrado definitivo todavía: el viaje recién sembrado
    // está ACTIVE, no CANCELLED/REJECTED.
    await expect(page.getByRole('button', { name: 'Eliminar Definitivamente' })).toHaveCount(0);
    await cancelBtn.click();

    const modal = openModal(page, 'Cancelar Carga');
    await expect(modal).toBeVisible();
    await modal.getByRole('button', { name: 'Cancelar Carga' }).click();

    await expect(page.getByText('Carga cancelada/eliminada correctamente')).toBeVisible();
    await expect(page).toHaveURL('/loads');

    // La prueba real: el backend lo borró de verdad (soft-delete + cascade),
    // no solo lo marcó CANCELLED. GET /trips/:id no debe devolverlo más.
    const admin = await ApiClient.as('ADMIN');
    try {
      await expect(async () => {
        await expect(admin.getTrip(trip.tripId)).rejects.toThrow(/HTTP 404/);
      }).toPass({ timeout: 10_000 });
    } finally {
      await admin.dispose();
    }
  });
});
